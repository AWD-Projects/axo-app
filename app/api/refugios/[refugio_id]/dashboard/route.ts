import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const rid = params.refugio_id

  const [
    ajolotesRes,
    estanquesRes,
    alertasRes,
    medicionRes,
    actividadRes,
    cruzasRes,
    lotesRes,
    refugioRes,
  ] = await Promise.all([
    supabase
      .from("ajolotes")
      .select("id, fecha_nacimiento", { count: "exact" })
      .eq("refugio_id", rid)
      .eq("estado", "vivo"),

    supabase
      .from("estanques")
      .select("id", { count: "exact", head: true })
      .eq("refugio_id", rid)
      .eq("activo", true),

    supabase
      .from("alertas")
      .select("id, tipo, severidad, titulo, mensaje, generada_at")
      .eq("refugio_id", rid)
      .is("leida_at", null)
      .order("generada_at", { ascending: false })
      .limit(5),

    supabase
      .from("mediciones_agua")
      .select("fecha_hora, temperatura, ph, amonio, oxigeno, nitrito, estanques(nombre)")
      .eq("refugio_id", rid)
      .order("fecha_hora", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("eventos")
      .select("id, tipo, fecha, sujeto_tipo, ajolote:ajolotes(codigo), estanque:estanques(nombre)")
      .eq("refugio_id", rid)
      .order("fecha", { ascending: false })
      .limit(5),

    supabase
      .from("cruzas")
      .select("id, fecha_inicio, fecha_planeada, estado, hembra:hembra_id(codigo), macho:macho_id(codigo)")
      .eq("refugio_id", rid)
      .in("estado", ["planeada", "activa"])
      .order("created_at", { ascending: false })
      .limit(3),

    supabase
      .from("lotes_larvales")
      .select("cantidad_actual")
      .eq("refugio_id", rid)
      .gt("cantidad_actual", 0),

    supabase
      .from("refugios")
      .select("config_regulatoria")
      .eq("id", rid)
      .single(),
  ])

  // Inventory
  const ajolotes = ajolotesRes.data ?? []
  const now = new Date()
  let adultos = 0, juveniles = 0, jovenes = 0

  for (const a of ajolotes) {
    if (!a.fecha_nacimiento) { adultos++; continue }
    const meses = (now.getTime() - new Date(a.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (meses >= 18) adultos++
    else if (meses >= 6) juveniles++
    else jovenes++
  }

  const larvas = (lotesRes.data ?? []).reduce((s: number, l: { cantidad_actual: number }) => s + (l.cantidad_actual ?? 0), 0)

  // Days until next quarterly report
  let diasReporte: number | null = null
  const cfg = refugioRes.data?.config_regulatoria as { uma_semarnat?: boolean } | null
  if (cfg?.uma_semarnat) {
    const quarter = Math.floor(now.getMonth() / 3)
    const endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
    diasReporte = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return NextResponse.json({
    data: {
      ajolotes_vivos: ajolotesRes.count ?? 0,
      estanques_activos: estanquesRes.count ?? 0,
      alertas_no_leidas: alertasRes.data?.length ?? 0,
      alertas: alertasRes.data ?? [],
      ultima_medicion: medicionRes.data ?? null,
      actividad_reciente: actividadRes.data ?? [],
      cruzas_activas: cruzasRes.data ?? [],
      inventario: { adultos, juveniles, jovenes, larvas, total: (ajolotesRes.count ?? 0) + larvas },
      dias_proximo_reporte: diasReporte,
    },
  })
}
