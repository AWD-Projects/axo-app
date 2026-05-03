import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { LIMITES_AI } from "@/src/lib/ai/limits"
import { buildAgentTools, executeTool } from "@/src/lib/ai/tools"
import type { Json } from "@/src/types/database"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  request: Request,
  { params }: { params: { conv_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { mensaje, refugio_id } = await request.json()

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership) return NextResponse.json({ error: "Sin acceso al refugio" }, { status: 403 })

  const { data: refugio } = await supabase
    .from("refugios")
    .select("nombre, tipo, plan, config_regulatoria")
    .eq("id", refugio_id)
    .single()

  if (!refugio) return NextResponse.json({ error: "Refugio no encontrado" }, { status: 404 })

  const limite = LIMITES_AI[refugio.plan as keyof typeof LIMITES_AI]
  if (limite === 0) return NextResponse.json({ error: "El plan Regulador no tiene acceso a Axo AI" }, { status: 403 })

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

  const messages: Anthropic.MessageParam[] = [
    ...(historial || []).map(m => ({
      role: m.rol as "user" | "assistant",
      content: m.contenido,
    })),
    { role: "user" as const, content: mensaje }
  ]

  const systemPrompt = buildSystemPrompt(refugio, perfil, membership.rol)
  const tools = buildAgentTools()

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    tools,
    messages,
  })

  const allToolCalls: Json[] = []
  const allToolResults: Json[] = []
  const admin = createAdminClient()

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await executeTool(admin, refugio_id, user.id, toolUse.name, toolUse.input as Record<string, unknown>)
        allToolCalls.push({ name: toolUse.name, input: toolUse.input } as Json)
        allToolResults.push({ tool: toolUse.name, result } as Json)
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

  await admin.from("axo_ai_mensajes").insert({
    conversacion_id: params.conv_id, refugio_id, rol: "user" as const, contenido: mensaje,
  })
  await admin.from("axo_ai_mensajes").insert({
    conversacion_id: params.conv_id, refugio_id, rol: "assistant" as const,
    contenido: textoFinal,
    tool_calls: allToolCalls.length > 0 ? allToolCalls as Json : null,
    tool_results: allToolResults.length > 0 ? allToolResults as Json : null,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
  })

  await admin.from("axo_ai_conversaciones")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conv_id)

  const mesActual = new Date().toISOString().slice(0, 7) + "-01"
  await admin.rpc("increment_ai_usage", {
    p_refugio_id: refugio_id,
    p_mes: mesActual,
    p_tokens_input: tokensInput,
    p_tokens_output: tokensOutput,
  })

  return NextResponse.json({ data: { respuesta: textoFinal } })
}

function buildSystemPrompt(refugio: { nombre: string; tipo: string; config_regulatoria: unknown }, perfil: { nombre?: string | null; apellido?: string | null } | null, rol: string): string {
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
4. No inventes datos. Si no los tienes, usa las herramientas para obtenerlos.
5. Formato de respuesta con hallazgos: (1) qué encontraste, (2) qué significa, (3) qué se sugiere hacer.
6. Máximo 300 palabras salvo que el usuario pida más detalle.`
}
