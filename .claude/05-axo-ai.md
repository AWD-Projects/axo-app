# Axo AI — Implementación del agente

## Límites por plan

```typescript
// src/lib/ai/limits.ts
export const LIMITES_AI = {
  pionero:       50,       // consultas por mes
  estandar:      Infinity,
  academico:     Infinity,
  institucional: Infinity,
  regulador:     0,        // sin acceso
} as const

export type Plan = keyof typeof LIMITES_AI
```

## API Route — POST /api/ai/conversations/[conv_id]/messages

```typescript
// app/api/ai/conversations/[conv_id]/messages/route.ts
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { LIMITES_AI } from "@/src/lib/ai/limits"
import { buildAgentTools, executeTool } from "@/src/lib/ai/tools"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  request: Request,
  { params }: { params: { conv_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { mensaje, refugio_id } = await request.json()

  // Verificar acceso al refugio
  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership) return NextResponse.json({ error: "Sin acceso al refugio" }, { status: 403 })

  // Obtener plan del refugio
  const { data: refugio } = await supabase
    .from("refugios")
    .select("nombre, tipo, plan, config_regulatoria")
    .eq("id", refugio_id)
    .single()

  if (!refugio) return NextResponse.json({ error: "Refugio no encontrado" }, { status: 404 })

  const limite = LIMITES_AI[refugio.plan as keyof typeof LIMITES_AI]
  if (limite === 0) return NextResponse.json({ error: "El plan Regulador no tiene acceso a Axo AI" }, { status: 403 })

  // Verificar uso mensual si tiene límite
  if (limite !== Infinity) {
    const mesActual = new Date().toISOString().slice(0, 7) + "-01"
    const { data: uso } = await supabase
      .from("axo_ai_uso_mensual")
      .select("consultas_realizadas")
      .eq("refugio_id", refugio_id)
      .eq("mes", mesActual)
      .single()

    if (uso && uso.consultas_realizadas >= limite) {
      return NextResponse.json({
        error: `Límite de ${limite} consultas mensuales alcanzado. Actualiza a Estándar para uso ilimitado.`
      }, { status: 429 })
    }
  }

  // Obtener historial de conversación (máx 20 mensajes)
  const { data: historial } = await supabase
    .from("axo_ai_mensajes")
    .select("rol, contenido")
    .eq("conversacion_id", params.conv_id)
    .order("created_at", { ascending: true })
    .limit(20)

  const { data: perfil } = await supabase
    .from("usuarios_perfil")
    .select("nombre, apellido")
    .eq("id", user.id)
    .single()

  // Construir mensajes para Claude
  const messages: Anthropic.MessageParam[] = [
    ...(historial || []).map(m => ({
      role: m.rol as "user" | "assistant",
      content: m.contenido,
    })),
    { role: "user" as const, content: mensaje }
  ]

  const systemPrompt = buildSystemPrompt(refugio, perfil, membership.rol)
  const tools = buildAgentTools()

  // Loop de tool calling hasta respuesta final
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    tools,
    messages,
  })

  const allToolCalls: any[] = []
  const allToolResults: any[] = []
  const admin = createAdminClient()

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await executeTool(admin, refugio_id, user.id, toolUse.name, toolUse.input)
        allToolCalls.push({ name: toolUse.name, input: toolUse.input })
        allToolResults.push({ tool: toolUse.name, result })
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        }
      })
    )

    messages.push({ role: "assistant", content: response.content })
    messages.push({ role: "user", content: toolResults })

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    })
  }

  const textoFinal = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("\n")

  const tokensInput = response.usage.input_tokens
  const tokensOutput = response.usage.output_tokens

  // Guardar mensajes
  await admin.from("axo_ai_mensajes").insert([
    { conversacion_id: params.conv_id, refugio_id, rol: "user", contenido: mensaje },
    {
      conversacion_id: params.conv_id, refugio_id, rol: "assistant",
      contenido: textoFinal,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : null,
      tool_results: allToolResults.length > 0 ? allToolResults : null,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
    }
  ])

  // Incrementar uso mensual (atómico)
  const mesActual = new Date().toISOString().slice(0, 7) + "-01"
  await admin.rpc("increment_ai_usage", {
    p_refugio_id: refugio_id,
    p_mes: mesActual,
    p_tokens_input: tokensInput,
    p_tokens_output: tokensOutput,
  })

  return NextResponse.json({ respuesta: textoFinal })
}

function buildSystemPrompt(refugio: any, perfil: any, rol: string): string {
  return `Eres Axo AI, el agente de inteligencia del sistema Axo para gestión de refugios de Ambystoma mexicanum.

REFUGIO ACTIVO:
- Nombre: ${refugio.nombre}
- Tipo: ${refugio.tipo}
- Configuración regulatoria: ${JSON.stringify(refugio.config_regulatoria)}

USUARIO:
- Nombre: ${perfil?.nombre || "Usuario"} ${perfil?.apellido || ""}
- Rol: ${rol}
- Fecha actual: ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

INSTRUCCIONES:
1. Responde SIEMPRE en español formal científico. Directo, preciso, propositivo.
2. Usa las herramientas para consultar datos reales ANTES de responder afirmaciones sobre el refugio.
3. Para create_evento: muestra al usuario exactamente qué vas a registrar y espera que diga "sí" o "confirmar" antes de ejecutar. La herramienta requiere confirmado=true.
4. No inventes datos. Si no los tienes, úsalas herramientas para obtenerlos.
5. Formato de respuesta con hallazgos: (1) qué encontraste, (2) qué significa, (3) qué se sugiere hacer.
6. Máximo 300 palabras salvo que el usuario pida más detalle.`
}
```

---

## Herramientas del agente

```typescript
// src/lib/ai/tools.ts
import Anthropic from "@anthropic-ai/sdk"
import type { SupabaseClient } from "@supabase/supabase-js"

export function buildAgentTools(): Anthropic.Tool[] {
  return [
    {
      name: "get_agua_params",
      description: "Historial de parámetros de calidad del agua de un estanque. Úsala para analizar tendencias o detectar anomalías.",
      input_schema: {
        type: "object" as const,
        properties: {
          estanque_id: { type: "string", description: "UUID del estanque" },
          days: { type: "number", description: "Días hacia atrás (default: 14)" }
        },
        required: ["estanque_id"]
      }
    },
    {
      name: "get_inventario",
      description: "Inventario de ajolotes del refugio con filtros opcionales.",
      input_schema: {
        type: "object" as const,
        properties: {
          estado: { type: "string", enum: ["vivo", "fallecido", "transferido", "egresado"] },
          sexo: { type: "string", enum: ["macho", "hembra", "indeterminado"] },
          estanque_id: { type: "string" },
          limit: { type: "number" }
        },
        required: []
      }
    },
    {
      name: "get_historial_individuo",
      description: "Historial completo de un ajolote: eventos, mediciones, cruzas, observaciones.",
      input_schema: {
        type: "object" as const,
        properties: {
          ajolote_id: { type: "string", description: "UUID o código del ajolote (e.g. 'M-12')" }
        },
        required: ["ajolote_id"]
      }
    },
    {
      name: "calcular_coeficiente",
      description: "Calcula el coeficiente de consanguinidad entre dos individuos. Umbral: >0.125 warning, >0.25 alto riesgo.",
      input_schema: {
        type: "object" as const,
        properties: {
          hembra_id: { type: "string", description: "UUID o código de la hembra" },
          macho_id: { type: "string", description: "UUID o código del macho" }
        },
        required: ["hembra_id", "macho_id"]
      }
    },
    {
      name: "proponer_cruzas_optimas",
      description: "Analiza el árbol genealógico completo y propone el plan de cruzas que maximiza diversidad genética.",
      input_schema: {
        type: "object" as const,
        properties: {
          top_n: { type: "number", description: "Número de cruzas a sugerir (default: 5)" }
        },
        required: []
      }
    },
    {
      name: "get_reporte_periodo",
      description: "Resumen agregado del refugio: inventario, mortalidad, reproducción, promedios de agua.",
      input_schema: {
        type: "object" as const,
        properties: {
          fecha_inicio: { type: "string", description: "YYYY-MM-DD" },
          fecha_fin: { type: "string", description: "YYYY-MM-DD" }
        },
        required: ["fecha_inicio", "fecha_fin"]
      }
    },
    {
      name: "create_evento",
      description: "Registra un evento en el sistema. SIEMPRE muestra al usuario qué vas a registrar y espera confirmación antes de llamar esta herramienta. Requiere confirmado=true.",
      input_schema: {
        type: "object" as const,
        properties: {
          tipo: { type: "string", enum: ["muerte","enfermedad","tratamiento","transferencia_interna","transferencia_externa","ingreso","egreso","otro"] },
          sujeto_tipo: { type: "string", enum: ["ajolote","lote","estanque"] },
          ajolote_id: { type: "string" },
          estanque_id: { type: "string" },
          detalles: { type: "object" },
          confirmado: { type: "boolean", description: "El usuario confirmó explícitamente. Debe ser true." }
        },
        required: ["tipo", "sujeto_tipo", "confirmado"]
      }
    }
  ]
}

export async function executeTool(
  supabase: SupabaseClient,
  refugio_id: string,
  user_id: string,
  name: string,
  input: any
): Promise<any> {
  switch (name) {
    case "get_agua_params": {
      const days = input.days || 14
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("mediciones_agua")
        .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno, notas")
        .eq("estanque_id", input.estanque_id)
        .eq("refugio_id", refugio_id)
        .gte("fecha_hora", since)
        .order("fecha_hora", { ascending: false })
      return data || []
    }

    case "get_inventario": {
      let query = supabase
        .from("ajolotes")
        .select("id, codigo, nombre, sexo, estado, morfotipo, estanque_id, madre_id, padre_id")
        .eq("refugio_id", refugio_id)
        .limit(input.limit || 100)
      if (input.estado) query = query.eq("estado", input.estado)
      if (input.sexo) query = query.eq("sexo", input.sexo)
      if (input.estanque_id) query = query.eq("estanque_id", input.estanque_id)
      const { data } = await query
      return data || []
    }

    case "get_historial_individuo": {
      // Resolver si es código en lugar de UUID
      let id = input.ajolote_id
      if (id.length < 20) {
        const { data: aj } = await supabase
          .from("ajolotes")
          .select("id")
          .eq("refugio_id", refugio_id)
          .eq("codigo", id)
          .single()
        id = aj?.id
      }
      if (!id) return { error: "Ajolote no encontrado" }

      const [ajolote, eventosRes, medRes] = await Promise.all([
        supabase.from("ajolotes")
          .select("*, madre:madre_id(codigo), padre:padre_id(codigo)")
          .eq("id", id).single(),
        supabase.from("eventos")
          .select("tipo, fecha, detalles, post_mortem_analisis")
          .eq("ajolote_id", id)
          .order("fecha", { ascending: false }).limit(20),
        supabase.from("mediciones_agua")
          .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
          .eq("estanque_id", ajolote.data?.estanque_id)
          .order("fecha_hora", { ascending: false }).limit(10),
      ])
      return { ajolote: ajolote.data, eventos: eventosRes.data, mediciones_recientes: medRes.data }
    }

    case "calcular_coeficiente": {
      const resolveId = async (idOrCode: string) => {
        if (idOrCode.length > 20) return idOrCode
        const { data } = await supabase.from("ajolotes")
          .select("id").eq("refugio_id", refugio_id).eq("codigo", idOrCode).single()
        return data?.id
      }
      const hembraId = await resolveId(input.hembra_id)
      const machoId = await resolveId(input.macho_id)
      const { data } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
        p_individuo_a_id: hembraId,
        p_individuo_b_id: machoId
      })
      return {
        coeficiente: data,
        riesgo: data > 0.25 ? "alto" : data > 0.125 ? "moderado" : "bajo",
        recomendacion: data > 0.25 ? "No recomendada — riesgo alto de endogamia" : data > 0.125 ? "Proceder con precaución" : "Cruza segura"
      }
    }

    case "proponer_cruzas_optimas": {
      const topN = input.top_n || 5
      const [hembrasRes, machosRes] = await Promise.all([
        supabase.from("ajolotes").select("id, codigo").eq("refugio_id", refugio_id).eq("sexo", "hembra").eq("estado", "vivo"),
        supabase.from("ajolotes").select("id, codigo").eq("refugio_id", refugio_id).eq("sexo", "macho").eq("estado", "vivo"),
      ])
      const combinaciones = []
      for (const h of hembrasRes.data || []) {
        for (const m of machosRes.data || []) {
          const { data: coef } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
            p_individuo_a_id: h.id, p_individuo_b_id: m.id
          })
          combinaciones.push({ hembra: h.codigo, macho: m.codigo, coeficiente: coef })
        }
      }
      combinaciones.sort((a, b) => a.coeficiente - b.coeficiente)
      return { cruzas_optimas: combinaciones.slice(0, topN) }
    }

    case "get_reporte_periodo": {
      const { data } = await supabase.rpc("get_refugio_summary", {
        p_refugio_id: refugio_id,
        p_inicio: input.fecha_inicio,
        p_fin: input.fecha_fin
      })
      return data
    }

    case "create_evento": {
      if (!input.confirmado) {
        return { error: "El usuario debe confirmar la acción antes de ejecutarla. Muestra el resumen y espera confirmación." }
      }
      const { data, error } = await supabase.from("eventos").insert({
        refugio_id,
        tipo: input.tipo,
        sujeto_tipo: input.sujeto_tipo,
        ajolote_id: input.ajolote_id || null,
        estanque_id: input.estanque_id || null,
        detalles: input.detalles || {},
        registrado_por: user_id,
      }).select().single()
      if (error) return { error: error.message }
      return { success: true, evento_id: data.id, mensaje: "Evento registrado correctamente." }
    }

    default:
      return { error: `Herramienta desconocida: ${name}` }
  }
}
```
