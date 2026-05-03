import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"
import { RANGOS_SEGUROS } from "@/src/lib/constants"
import type { Json } from "@/src/types/database"

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: refugios } = await supabase
    .from("refugios")
    .select("id, config_regulatoria")
    .eq("activo", true)

  const alertasNuevas: Array<{
    refugio_id: string
    estanque_id?: string
    tipo: "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango" | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo" | "sin_registro_dias" | "reporte_uma_proximo" | "otro"
    severidad: "info" | "warning" | "error" | "critical"
    titulo: string
    mensaje: string
    datos_contexto?: Json
  }> = []
  const ahora = new Date()

  for (const refugio of refugios ?? []) {
    const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: mediciones } = await supabase
      .from("mediciones_agua")
      .select("estanque_id, fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
      .eq("refugio_id", refugio.id)
      .gte("fecha_hora", since3d)

    type MedRow = { estanque_id: string; fecha_hora: string; temperatura: number | null; ph: number | null; amonio: number | null; nitrito: number | null; oxigeno: number | null }
    const porEstanque = (mediciones ?? []).reduce((acc, m) => {
      if (!acc[m.estanque_id]) acc[m.estanque_id] = []
      acc[m.estanque_id].push(m as MedRow)
      return acc
    }, {} as Record<string, MedRow[]>)

    for (const [estanque_id, meds] of Object.entries(porEstanque)) {
      const amonio3d = meds.filter(m => m.amonio != null && Number(m.amonio) > RANGOS_SEGUROS.amonio.max)
      if (amonio3d.length >= 3) {
        alertasNuevas.push({
          refugio_id: refugio.id, estanque_id,
          tipo: "agua_amonio_elevado", severidad: "warning",
          titulo: "Amonio elevado 3+ días consecutivos",
          mensaje: `El amonio superó ${RANGOS_SEGUROS.amonio.max} ppm en ${amonio3d.length} mediciones. Considera cambio parcial de agua.`,
          datos_contexto: { mediciones: amonio3d.length }
        })
      }

      const nitritoCritico = meds.filter(m => m.nitrito != null && Number(m.nitrito) > RANGOS_SEGUROS.nitrito.max * 2)
      if (nitritoCritico.length >= 2) {
        alertasNuevas.push({
          refugio_id: refugio.id, estanque_id,
          tipo: "agua_nitrito_elevado", severidad: "error",
          titulo: "Nitrito en nivel crítico",
          mensaje: `Nitrito > ${RANGOS_SEGUROS.nitrito.max * 2} ppm detectado. Acción inmediata requerida.`,
          datos_contexto: { max: Math.max(...nitritoCritico.map(m => Number(m.nitrito))) }
        })
      }

      const ultima = meds[meds.length - 1]
      if (ultima?.temperatura != null) {
        const temp = Number(ultima.temperatura)
        if (temp < RANGOS_SEGUROS.temperatura.min || temp > RANGOS_SEGUROS.temperatura.max) {
          alertasNuevas.push({
            refugio_id: refugio.id, estanque_id,
            tipo: "agua_temperatura_fuera_rango", severidad: "warning",
            titulo: `Temperatura fuera de rango: ${temp}°C`,
            mensaje: `Rango óptimo Ambystoma: ${RANGOS_SEGUROS.temperatura.min}-${RANGOS_SEGUROS.temperatura.max}°C`,
            datos_contexto: { temperatura_actual: temp }
          })
        }
      }
    }

    // Sin registro en 48h
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

    // Vencimiento UMA
    const configReg = refugio.config_regulatoria as Record<string, boolean> | null
    if (configReg?.reporte_trimestral) {
      const mes = ahora.getMonth() + 1
      const dia = ahora.getDate()
      const mesesVencimiento = [1, 4, 7, 10]
      const proximoMes = mesesVencimiento.find(m => m >= mes) ?? 1
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

  return NextResponse.json({ alertas_generadas: alertasNuevas.length, refugios_procesados: refugios?.length ?? 0 })
}
