# Axo — Edge Functions y Cron Jobs

## Despliegue de Edge Functions

```bash
# Desplegar una función
npx supabase functions deploy <nombre> --project-ref gszgkqvtrsvmjtqiaslc

# Ver logs
npx supabase functions logs <nombre> --project-ref gszgkqvtrsvmjtqiaslc
```

Secrets configurados en Supabase Dashboard → Edge Functions → Secrets:
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`
- `APP_URL` = https://axo.amoxtli.tech

---

## Edge Function: post-mortem-analysis

**Activación:** Database Webhook en Supabase en INSERT a `eventos` donde `tipo = 'muerte'`

**Configuración del webhook en Supabase Dashboard:**
- Tabla: `eventos`
- Evento: INSERT
- Filtro: `tipo = 'muerte'`
- URL: `https://gszgkqvtrsvmjtqiaslc.supabase.co/functions/v1/post-mortem-analysis`

```typescript
// supabase/functions/post-mortem-analysis/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.20.0"

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

serve(async (req) => {
  const payload = await req.json()
  const evento = payload.record

  if (evento.tipo !== "muerte" || !evento.ajolote_id) {
    return new Response("OK", { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: ajolote } = await supabase
    .from("ajolotes")
    .select("codigo, sexo, fecha_nacimiento, morfotipo, estanque_id")
    .eq("id", evento.ajolote_id)
    .single()

  const { data: mediciones } = await supabase
    .from("mediciones_agua")
    .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
    .eq("estanque_id", ajolote?.estanque_id)
    .gte("fecha_hora", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order("fecha_hora", { ascending: false })
    .limit(20)

  const { data: eventos_previos } = await supabase
    .from("eventos")
    .select("tipo, fecha, detalles")
    .eq("ajolote_id", evento.ajolote_id)
    .neq("id", evento.id)
    .order("fecha", { ascending: false })
    .limit(10)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Analiza la muerte de este Ambystoma mexicanum en cautiverio y genera análisis post-mortem breve.

INDIVIDUO: ${JSON.stringify(ajolote)}
PARÁMETROS AGUA (14 días): ${JSON.stringify(mediciones)}
HISTORIAL PREVIO: ${JSON.stringify(eventos_previos)}
DETALLES EVENTO: ${JSON.stringify(evento.detalles)}

Genera:
1. Causa probable (confianza: alta/media/baja)
2. Factores de riesgo en los datos
3. Recomendación específica para prevenir casos similares

Sé directo y científico. Máximo 150 palabras. En español.`
    }]
  })

  const analisis = response.content[0].type === "text" ? response.content[0].text : ""

  await supabase.from("eventos").update({
    post_mortem_analisis: analisis,
    post_mortem_generado_at: new Date().toISOString()
  }).eq("id", evento.id)

  await supabase.from("alertas").insert({
    refugio_id: evento.refugio_id,
    tipo: "post_mortem_generado",
    severidad: "info",
    ajolote_id: evento.ajolote_id,
    titulo: `Análisis post-mortem — ${ajolote?.codigo}`,
    mensaje: analisis.slice(0, 250),
    datos_contexto: { evento_id: evento.id }
  })

  return new Response("OK", { status: 200 })
})
```

---

## Cron — evaluate-alerts (cada 6h)

```typescript
// app/api/cron/evaluate-alerts/route.ts
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"
import { RANGOS_SEGUROS } from "@/src/lib/constants"

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: refugios } = await supabase
    .from("refugios")
    .select("id, config_regulatoria")
    .eq("activo", true)

  const alertasNuevas = []
  const ahora = new Date()

  for (const refugio of refugios || []) {
    // ── Parámetros de agua ─────────────────────────────────────────
    const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: mediciones } = await supabase
      .from("mediciones_agua")
      .select("estanque_id, fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
      .eq("refugio_id", refugio.id)
      .gte("fecha_hora", since3d)

    // Agrupar por estanque
    const porEstanque = (mediciones || []).reduce((acc, m) => {
      if (!acc[m.estanque_id]) acc[m.estanque_id] = []
      acc[m.estanque_id].push(m)
      return acc
    }, {} as Record<string, any[]>)

    for (const [estanque_id, meds] of Object.entries(porEstanque)) {
      const amonio3d = meds.filter(m => m.amonio > RANGOS_SEGUROS.amonio.max)
      if (amonio3d.length >= 3) {
        alertasNuevas.push({
          refugio_id: refugio.id, estanque_id,
          tipo: "agua_amonio_elevado", severidad: "warning",
          titulo: "Amonio elevado 3+ días consecutivos",
          mensaje: `El amonio superó ${RANGOS_SEGUROS.amonio.max} ppm en ${amonio3d.length} mediciones. Considera cambio parcial de agua.`,
          datos_contexto: { promedio: amonio3d.reduce((s, m) => s + m.amonio, 0) / amonio3d.length }
        })
      }

      const nitritoCritico = meds.filter(m => m.nitrito > RANGOS_SEGUROS.nitrito.max * 2)
      if (nitritoCritico.length >= 2) {
        alertasNuevas.push({
          refugio_id: refugio.id, estanque_id,
          tipo: "agua_nitrito_elevado", severidad: "error",
          titulo: "Nitrito en nivel crítico",
          mensaje: `Nitrito > ${RANGOS_SEGUROS.nitrito.max * 2} ppm detectado. Acción inmediata requerida.`,
          datos_contexto: { max: Math.max(...nitritoCritico.map(m => m.nitrito)) }
        })
      }

      const ultima = meds[meds.length - 1]
      if (ultima?.temperatura && (ultima.temperatura < RANGOS_SEGUROS.temperatura.min || ultima.temperatura > RANGOS_SEGUROS.temperatura.max)) {
        alertasNuevas.push({
          refugio_id: refugio.id, estanque_id,
          tipo: "agua_temperatura_fuera_rango", severidad: "warning",
          titulo: `Temperatura fuera de rango: ${ultima.temperatura}°C`,
          mensaje: `Rango óptimo Ambystoma: ${RANGOS_SEGUROS.temperatura.min}-${RANGOS_SEGUROS.temperatura.max}°C`,
          datos_contexto: { temperatura_actual: ultima.temperatura }
        })
      }
    }

    // ── Sin registro en 48h ────────────────────────────────────────
    const { data: ultimaMed } = await supabase
      .from("mediciones_agua")
      .select("fecha_hora")
      .eq("refugio_id", refugio.id)
      .order("fecha_hora", { ascending: false })
      .limit(1)
      .single()

    const hSinRegistro = ultimaMed
      ? (Date.now() - new Date(ultimaMed.fecha_hora).getTime()) / 3600000
      : 999

    if (hSinRegistro > 48) {
      alertasNuevas.push({
        refugio_id: refugio.id,
        tipo: "sin_registro_dias", severidad: "warning",
        titulo: "Sin registro en 48+ horas",
        mensaje: `No hay mediciones registradas en las últimas ${Math.round(hSinRegistro)} horas.`,
        datos_contexto: { horas: Math.round(hSinRegistro) }
      })
    }

    // ── Vencimiento UMA ────────────────────────────────────────────
    if (refugio.config_regulatoria?.reporte_trimestral) {
      const mes = ahora.getMonth() + 1
      const dia = ahora.getDate()
      const mesesVencimiento = [1, 4, 7, 10]
      const proximoMes = mesesVencimiento.find(m => m >= mes) || 1
      const diasFin = new Date(ahora.getFullYear(), proximoMes, 0).getDate()
      const diasRestantes = diasFin - dia + (proximoMes - mes) * 30

      if ([30, 15, 7].includes(diasRestantes)) {
        alertasNuevas.push({
          refugio_id: refugio.id,
          tipo: "reporte_uma_proximo",
          severidad: diasRestantes <= 7 ? "error" : "warning",
          titulo: `Reporte UMA vence en ${diasRestantes} días`,
          mensaje: `El reporte trimestral para SEMARNAT vence en ${diasRestantes} días.`,
          datos_contexto: { dias_restantes: diasRestantes }
        })
      }
    }
  }

  if (alertasNuevas.length > 0) {
    await supabase.from("alertas").insert(alertasNuevas)
  }

  return NextResponse.json({ alertas_generadas: alertasNuevas.length, refugios_procesados: refugios?.length })
}
```
