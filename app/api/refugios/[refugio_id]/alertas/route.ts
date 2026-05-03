import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const solo_no_leidas = searchParams.get("solo_no_leidas") === "true"
  const severidad = searchParams.get("severidad")
  const tipo = searchParams.get("tipo")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  let query = supabase
    .from("alertas")
    .select("*")
    .eq("refugio_id", params.refugio_id)
    .order("leida_at", { ascending: true, nullsFirst: true })
    .order("generada_at", { ascending: false })
    .limit(limit)

  if (solo_no_leidas) query = query.is("leida_at", null)
  if (severidad) query = query.eq("severidad", severidad as "info" | "warning" | "error" | "critical")
  if (tipo) query = query.eq("tipo", tipo as "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango" | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo" | "mortalidad_anomala" | "endogamia_riesgo" | "reporte_uma_proximo" | "sin_registro_dias" | "post_mortem_generado" | "otro")

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: noLeidas } = await supabase
    .from("alertas")
    .select("id", { count: "exact", head: true })
    .eq("refugio_id", params.refugio_id)
    .is("leida_at", null)

  return NextResponse.json({ data, no_leidas: noLeidas ?? 0 })
}
