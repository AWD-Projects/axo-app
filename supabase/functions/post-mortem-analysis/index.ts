import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.20.0"

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const evento = payload.record as {
      id: string
      tipo: string
      ajolote_id: string | null
      refugio_id: string
      detalles: unknown
    }

    if (evento.tipo !== "muerte" || !evento.ajolote_id) {
      return new Response("OK", { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch individual
    const { data: ajolote, error: ajoloteError } = await supabase
      .from("ajolotes")
      .select("codigo, sexo, fecha_nacimiento, morfotipo, estanque_id")
      .eq("id", evento.ajolote_id)
      .single()

    if (ajoloteError || !ajolote) {
      console.error("ajolote not found:", ajoloteError)
      return new Response("ajolote not found", { status: 200 })
    }

    // Fetch parámetros de agua de las últimas 2 semanas (solo si tiene estanque)
    const mediciones = ajolote.estanque_id
      ? (await supabase
          .from("mediciones_agua")
          .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
          .eq("estanque_id", ajolote.estanque_id)
          .gte("fecha_hora", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order("fecha_hora", { ascending: false })
          .limit(20)
        ).data ?? []
      : []

    // Fetch historial clínico previo
    const { data: eventosPrevios } = await supabase
      .from("eventos")
      .select("tipo, fecha, detalles")
      .eq("ajolote_id", evento.ajolote_id)
      .neq("id", evento.id)
      .order("fecha", { ascending: false })
      .limit(10)

    // Generar análisis con Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Analiza la muerte de este Ambystoma mexicanum en cautiverio y genera análisis post-mortem breve.

INDIVIDUO: ${JSON.stringify(ajolote)}
PARÁMETROS AGUA (14 días): ${JSON.stringify(mediciones)}
HISTORIAL PREVIO: ${JSON.stringify(eventosPrevios ?? [])}
DETALLES EVENTO: ${JSON.stringify(evento.detalles)}

Genera:
1. Causa probable (confianza: alta/media/baja)
2. Factores de riesgo en los datos
3. Recomendación específica para prevenir casos similares

Sé directo y científico. Máximo 150 palabras. En español.`,
        },
      ],
    })

    const firstBlock = response.content[0]
    const analisis = firstBlock.type === "text" ? (firstBlock as { type: "text"; text: string }).text : ""

    if (!analisis) {
      console.error("empty analysis from Claude")
      return new Response("empty analysis", { status: 200 })
    }

    // Guardar análisis en el evento
    // deno-lint-ignore no-explicit-any
    await (supabase.from("eventos") as any)
      .update({
        post_mortem_analisis: analisis,
        post_mortem_generado_at: new Date().toISOString(),
      })
      .eq("id", evento.id)

    // Crear alerta para el refugio
    await supabase.from("alertas").insert({
      refugio_id: evento.refugio_id,
      tipo: "post_mortem_generado",
      severidad: "info",
      ajolote_id: evento.ajolote_id,
      titulo: `Análisis post-mortem — ${ajolote.codigo}`,
      mensaje: analisis.slice(0, 250),
      datos_contexto: { evento_id: evento.id },
    })

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("post-mortem-analysis error:", err)
    return new Response("Internal error", { status: 500 })
  }
})
