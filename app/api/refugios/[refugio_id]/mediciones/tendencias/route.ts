import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { RANGOS_SEGUROS } from "@/src/lib/constants"

export async function GET(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const estanque_id = searchParams.get("estanque_id")
  const period = searchParams.get("period") ?? "7d"

  if (!estanque_id) return NextResponse.json({ error: "estanque_id es requerido" }, { status: 400 })

  const dias = period === "90d" ? 90 : period === "30d" ? 30 : 7
  const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

  const { data: mediciones, error } = await supabase
    .from("mediciones_agua")
    .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
    .eq("refugio_id", params.refugio_id)
    .eq("estanque_id", estanque_id)
    .gte("fecha_hora", since)
    .order("fecha_hora", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por día y calcular promedios
  const porDia = (mediciones ?? []).reduce((acc, m) => {
    const fecha = m.fecha_hora.slice(0, 10)
    if (!acc[fecha]) acc[fecha] = { temperatura: [], ph: [], amonio: [], nitrito: [], oxigeno: [] }
    if (m.temperatura != null) acc[fecha].temperatura.push(Number(m.temperatura))
    if (m.ph != null) acc[fecha].ph.push(Number(m.ph))
    if (m.amonio != null) acc[fecha].amonio.push(Number(m.amonio))
    if (m.nitrito != null) acc[fecha].nitrito.push(Number(m.nitrito))
    if (m.oxigeno != null) acc[fecha].oxigeno.push(Number(m.oxigeno))
    return acc
  }, {} as Record<string, Record<string, number[]>>)

  const avg = (arr: number[]) => arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : null

  const tendencias = Object.entries(porDia).map(([fecha, vals]) => {
    const temperatura_avg = avg(vals.temperatura)
    const ph_avg = avg(vals.ph)
    const amonio_avg = avg(vals.amonio)
    const nitrito_avg = avg(vals.nitrito)
    const oxigeno_avg = avg(vals.oxigeno)

    return {
      fecha,
      temperatura_avg,
      ph_avg,
      amonio_avg,
      nitrito_avg,
      oxigeno_avg,
      fuera_de_rango: {
        temperatura: temperatura_avg != null && (temperatura_avg < RANGOS_SEGUROS.temperatura.min || temperatura_avg > RANGOS_SEGUROS.temperatura.max),
        ph: ph_avg != null && (ph_avg < RANGOS_SEGUROS.ph.min || ph_avg > RANGOS_SEGUROS.ph.max),
        amonio: amonio_avg != null && amonio_avg > RANGOS_SEGUROS.amonio.max,
        nitrito: nitrito_avg != null && nitrito_avg > RANGOS_SEGUROS.nitrito.max,
        oxigeno: oxigeno_avg != null && oxigeno_avg < RANGOS_SEGUROS.oxigeno.min,
      }
    }
  })

  return NextResponse.json({ data: tendencias, rangos_seguros: RANGOS_SEGUROS })
}
