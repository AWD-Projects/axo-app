import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RANGOS_SEGUROS = {
  temperatura: { min: 16,   max: 18   },
  ph:          { min: 7.0,  max: 7.8  },
  amonio:      { min: 0,    max: 0.25 },
  nitrito:     { min: 0,    max: 0.2  },
  oxigeno:     { min: 6.0,  max: 10.0 },
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: refugios } = await supabase
    .from("refugios")
    .select("id, config_regulatoria")
    .eq("activo", true)

  type AlertTipo =
    | "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango"
    | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo"
    | "sin_registro_dias" | "reporte_uma_proximo" | "otro"

  const alertasNuevas: Array<{
    refugio_id: string
    estanque_id?: string
    tipo: AlertTipo
    severidad: "info" | "warning" | "error" | "critical"
    titulo: string
    mensaje: string
    datos_contexto?: Record<string, unknown>
  }> = []

  const ahora = new Date()

  for (const refugio of refugios ?? []) {
    // Alertas abiertas para deduplicación
    const { data: abiertas } = await supabase
      .from("alertas")
      .select("tipo, estanque_id")
      .eq("refugio_id", refugio.id)
      .is("resuelta_at", null)

    const abiertasSet = new Set(
      (abiertas ?? []).map((a: { tipo: string; estanque_id: string | null }) =>
        `${a.tipo}:${a.estanque_id ?? ""}`
      )
    )
    const yaExiste = (tipo: AlertTipo, estanque_id?: string) =>
      abiertasSet.has(`${tipo}:${estanque_id ?? ""}`)

    // Mediciones de los últimos 3 días
    const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: mediciones } = await supabase
      .from("mediciones_agua")
      .select("estanque_id, fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
      .eq("refugio_id", refugio.id)
      .gte("fecha_hora", since3d)

    type MedRow = {
      estanque_id: string; fecha_hora: string
      temperatura: number | null; ph: number | null
      amonio: number | null; nitrito: number | null; oxigeno: number | null
    }

    const porEstanque = (mediciones ?? []).reduce((acc: Record<string, MedRow[]>, m) => {
      if (!acc[m.estanque_id]) acc[m.estanque_id] = []
      acc[m.estanque_id].push(m as MedRow)
      return acc
    }, {})

    for (const [estanque_id, meds] of Object.entries(porEstanque)) {
      // Amonio elevado 3+ mediciones
      if (!yaExiste("agua_amonio_elevado", estanque_id)) {
        const casos = meds.filter(
          (m) => m.amonio != null && Number(m.amonio) > RANGOS_SEGUROS.amonio.max
        )
        if (casos.length >= 3) {
          alertasNuevas.push({
            refugio_id: refugio.id, estanque_id,
            tipo: "agua_amonio_elevado", severidad: "warning",
            titulo: "Amonio elevado 3+ días consecutivos",
            mensaje: `El amonio superó ${RANGOS_SEGUROS.amonio.max} ppm en ${casos.length} mediciones. Considera cambio parcial de agua.`,
            datos_contexto: {
              valor_actual: Math.max(...casos.map((m) => Number(m.amonio))),
              unidad: "ppm",
              umbral_max: RANGOS_SEGUROS.amonio.max,
              mediciones: casos.length,
            },
          })
        }
      }

      // Nitrito crítico (>2× umbral en 2+ mediciones)
      if (!yaExiste("agua_nitrito_elevado", estanque_id)) {
        const casos = meds.filter(
          (m) => m.nitrito != null && Number(m.nitrito) > RANGOS_SEGUROS.nitrito.max * 2
        )
        if (casos.length >= 2) {
          const maxNitrito = Math.max(...casos.map((m) => Number(m.nitrito)))
          alertasNuevas.push({
            refugio_id: refugio.id, estanque_id,
            tipo: "agua_nitrito_elevado", severidad: "error",
            titulo: "Nitrito en nivel crítico",
            mensaje: `Nitrito alcanzó ${maxNitrito.toFixed(2)} ppm — más del doble del umbral seguro. Acción inmediata requerida.`,
            datos_contexto: {
              valor_actual: maxNitrito,
              unidad: "ppm",
              umbral_max: RANGOS_SEGUROS.nitrito.max,
            },
          })
        }
      }

      // Temperatura fuera de rango (última medición)
      if (!yaExiste("agua_temperatura_fuera_rango", estanque_id)) {
        const ultima = meds.at(-1)
        if (ultima?.temperatura != null) {
          const temp = Number(ultima.temperatura)
          if (temp < RANGOS_SEGUROS.temperatura.min || temp > RANGOS_SEGUROS.temperatura.max) {
            alertasNuevas.push({
              refugio_id: refugio.id, estanque_id,
              tipo: "agua_temperatura_fuera_rango", severidad: "warning",
              titulo: `Temperatura fuera de rango: ${temp}°C`,
              mensaje: `Temperatura actual ${temp}°C fuera del rango óptimo (${RANGOS_SEGUROS.temperatura.min}–${RANGOS_SEGUROS.temperatura.max}°C) para Ambystoma mexicanum.`,
              datos_contexto: {
                valor_actual: temp,
                unidad: "°C",
                umbral_min: RANGOS_SEGUROS.temperatura.min,
                umbral_max: RANGOS_SEGUROS.temperatura.max,
              },
            })
          }
        }
      }

      // pH fuera de rango (última medición)
      if (!yaExiste("agua_ph_fuera_rango", estanque_id)) {
        const ultima = meds.at(-1)
        if (ultima?.ph != null) {
          const ph = Number(ultima.ph)
          if (ph < RANGOS_SEGUROS.ph.min || ph > RANGOS_SEGUROS.ph.max) {
            alertasNuevas.push({
              refugio_id: refugio.id, estanque_id,
              tipo: "agua_ph_fuera_rango", severidad: "warning",
              titulo: `pH fuera de rango: ${ph}`,
              mensaje: `pH actual ${ph} fuera del rango óptimo (${RANGOS_SEGUROS.ph.min}–${RANGOS_SEGUROS.ph.max}).`,
              datos_contexto: {
                valor_actual: ph,
                unidad: "",
                umbral_min: RANGOS_SEGUROS.ph.min,
                umbral_max: RANGOS_SEGUROS.ph.max,
              },
            })
          }
        }
      }

      // Oxígeno bajo (última medición)
      if (!yaExiste("agua_oxigeno_bajo", estanque_id)) {
        const ultima = meds.at(-1)
        if (ultima?.oxigeno != null) {
          const o2 = Number(ultima.oxigeno)
          if (o2 < RANGOS_SEGUROS.oxigeno.min) {
            alertasNuevas.push({
              refugio_id: refugio.id, estanque_id,
              tipo: "agua_oxigeno_bajo", severidad: "error",
              titulo: `Oxígeno bajo: ${o2} mg/L`,
              mensaje: `Oxígeno disuelto ${o2} mg/L por debajo del mínimo seguro (${RANGOS_SEGUROS.oxigeno.min} mg/L).`,
              datos_contexto: {
                valor_actual: o2,
                unidad: "mg/L",
                umbral_min: RANGOS_SEGUROS.oxigeno.min,
              },
            })
          }
        }
      }
    }

    // Sin registro en 48h
    if (!yaExiste("sin_registro_dias")) {
      const { data: ultimaMed } = await supabase
        .from("mediciones_agua")
        .select("fecha_hora")
        .eq("refugio_id", refugio.id)
        .order("fecha_hora", { ascending: false })
        .limit(1)
        .maybeSingle()

      const hSinRegistro = ultimaMed
        ? (Date.now() - new Date(ultimaMed.fecha_hora).getTime()) / 3_600_000
        : 999

      if (hSinRegistro > 48) {
        alertasNuevas.push({
          refugio_id: refugio.id,
          tipo: "sin_registro_dias", severidad: "warning",
          titulo: "Sin registro en 48+ horas",
          mensaje: `No hay mediciones registradas en las últimas ${Math.round(hSinRegistro)} horas.`,
          datos_contexto: { horas: Math.round(hSinRegistro) },
        })
      }
    }

    // Vencimiento UMA (solo los días exactos 30, 15, 7)
    const configReg = refugio.config_regulatoria as Record<string, boolean> | null
    if (configReg?.reporte_trimestral && !yaExiste("reporte_uma_proximo")) {
      const mes = ahora.getMonth() + 1
      const dia = ahora.getDate()
      const mesesVencimiento = [1, 4, 7, 10]
      const proximoMes = mesesVencimiento.find((m) => m >= mes) ?? 1
      const diasFin = new Date(ahora.getFullYear(), proximoMes, 0).getDate()
      const diasRestantes = diasFin - dia + (proximoMes - mes) * 30

      if ([30, 15, 7].includes(diasRestantes)) {
        alertasNuevas.push({
          refugio_id: refugio.id,
          tipo: "reporte_uma_proximo",
          severidad: diasRestantes <= 7 ? "error" : "warning",
          titulo: `Reporte UMA vence en ${diasRestantes} días`,
          mensaje: `El reporte trimestral para SEMARNAT vence en ${diasRestantes} días.`,
          datos_contexto: { dias_restantes: diasRestantes },
        })
      }
    }
  }

  if (alertasNuevas.length > 0) {
    await supabase.from("alertas").insert(alertasNuevas)
  }

  return new Response(
    JSON.stringify({
      alertas_generadas: alertasNuevas.length,
      refugios_procesados: refugios?.length ?? 0,
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
