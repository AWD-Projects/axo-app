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
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_agua_params": {
      const days = (input.days as number) || 14
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("mediciones_agua")
        .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno, notas")
        .eq("estanque_id", input.estanque_id as string)
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
        .limit((input.limit as number) || 100)
      if (input.estado) query = query.eq("estado", input.estado as "vivo" | "fallecido" | "transferido" | "egresado")
      if (input.sexo) query = query.eq("sexo", input.sexo as "macho" | "hembra" | "indeterminado")
      if (input.estanque_id) query = query.eq("estanque_id", input.estanque_id as string)
      const { data } = await query
      return data || []
    }

    case "get_historial_individuo": {
      let id = input.ajolote_id as string
      if (id.length < 20) {
        const { data: aj } = await supabase
          .from("ajolotes")
          .select("id")
          .eq("refugio_id", refugio_id)
          .eq("codigo", id)
          .single()
        id = aj?.id ?? id
      }
      if (!id) return { error: "Ajolote no encontrado" }

      const [ajoloteRes, eventosRes, medRes] = await Promise.all([
        supabase.from("ajolotes")
          .select("*, madre:madre_id(codigo), padre:padre_id(codigo)")
          .eq("id", id).single(),
        supabase.from("eventos")
          .select("tipo, fecha, detalles, post_mortem_analisis")
          .eq("ajolote_id", id)
          .order("fecha", { ascending: false }).limit(20),
        supabase.from("mediciones_agua")
          .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
          .eq("estanque_id", (await supabase.from("ajolotes").select("estanque_id").eq("id", id).single()).data?.estanque_id ?? "")
          .order("fecha_hora", { ascending: false }).limit(10),
      ])
      return { ajolote: ajoloteRes.data, eventos: eventosRes.data, mediciones_recientes: medRes.data }
    }

    case "calcular_coeficiente": {
      const resolveId = async (idOrCode: string) => {
        if (idOrCode.length > 20) return idOrCode
        const { data } = await supabase.from("ajolotes")
          .select("id").eq("refugio_id", refugio_id).eq("codigo", idOrCode).single()
        return data?.id
      }
      const hembraId = await resolveId(input.hembra_id as string)
      const machoId = await resolveId(input.macho_id as string)
      const { data } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
        p_individuo_a_id: hembraId,
        p_individuo_b_id: machoId
      })
      return {
        coeficiente: data,
        riesgo: (data ?? 0) > 0.25 ? "alto" : (data ?? 0) > 0.125 ? "moderado" : "bajo",
        recomendacion: (data ?? 0) > 0.25 ? "No recomendada — riesgo alto de endogamia" : (data ?? 0) > 0.125 ? "Proceder con precaución" : "Cruza segura"
      }
    }

    case "proponer_cruzas_optimas": {
      const topN = (input.top_n as number) || 5
      const [hembrasRes, machosRes] = await Promise.all([
        supabase.from("ajolotes").select("id, codigo").eq("refugio_id", refugio_id).eq("sexo", "hembra").eq("estado", "vivo"),
        supabase.from("ajolotes").select("id, codigo").eq("refugio_id", refugio_id).eq("sexo", "macho").eq("estado", "vivo"),
      ])
      const combinaciones: { hembra: string; macho: string; coeficiente: number }[] = []
      for (const h of hembrasRes.data ?? []) {
        for (const m of machosRes.data ?? []) {
          const { data: coef } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
            p_individuo_a_id: h.id, p_individuo_b_id: m.id
          })
          combinaciones.push({ hembra: h.codigo, macho: m.codigo, coeficiente: coef ?? 0 })
        }
      }
      combinaciones.sort((a, b) => a.coeficiente - b.coeficiente)
      return { cruzas_optimas: combinaciones.slice(0, topN) }
    }

    case "get_reporte_periodo": {
      const { data } = await supabase.rpc("get_refugio_summary", {
        p_refugio_id: refugio_id,
        p_inicio: input.fecha_inicio as string,
        p_fin: input.fecha_fin as string
      })
      return data
    }

    case "create_evento": {
      if (!input.confirmado) {
        return { error: "El usuario debe confirmar la acción antes de ejecutarla. Muestra el resumen y espera confirmación." }
      }
      const { data, error } = await supabase.from("eventos").insert({
        refugio_id,
        tipo: input.tipo as "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "otro",
        sujeto_tipo: input.sujeto_tipo as "ajolote" | "lote" | "estanque",
        ajolote_id: (input.ajolote_id as string) || null,
        estanque_id: (input.estanque_id as string) || null,
        detalles: (input.detalles as object) || {},
        registrado_por: user_id,
      }).select().single()
      if (error) return { error: error.message }
      return { success: true, evento_id: data.id, mensaje: "Evento registrado correctamente." }
    }

    default:
      return { error: `Herramienta desconocida: ${name}` }
  }
}
