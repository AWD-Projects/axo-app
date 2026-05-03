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
  const cruza_id = searchParams.get("cruza_id")

  let query = supabase
    .from("puestas")
    .select("*, cruzas(id, estado, hembra_id, macho_id)")
    .eq("refugio_id", params.refugio_id)
    .order("fecha_puesta", { ascending: false })

  if (cruza_id) query = query.eq("cruza_id", cruza_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { cruza_id, fecha_puesta, cantidad_huevos, fecha_eclosion, cantidad_eclosionada, notas } = await request.json()

  if (!cruza_id || !fecha_puesta) {
    return NextResponse.json({ error: "cruza_id y fecha_puesta son requeridos" }, { status: 400 })
  }

  const { data: puesta, error } = await supabase
    .from("puestas")
    .insert({
      refugio_id: params.refugio_id,
      cruza_id, fecha_puesta,
      cantidad_huevos: cantidad_huevos ?? null,
      fecha_eclosion: fecha_eclosion ?? null,
      cantidad_eclosionada: cantidad_eclosionada ?? null,
      notas: notas ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si se registra eclosión, crear lote larval automáticamente
  let lote = null
  if (fecha_eclosion && cantidad_eclosionada && cantidad_eclosionada > 0) {
    const { data: cruza } = await supabase
      .from("cruzas")
      .select("estanque_id")
      .eq("id", cruza_id)
      .single()

    const { data: loteCreado } = await supabase
      .from("lotes_larvales")
      .insert({
        refugio_id: params.refugio_id,
        cruza_id,
        estanque_id: cruza?.estanque_id ?? null,
        codigo: `LOT-${Date.now()}`,
        etapa: "larva_temprana" as const,
        cantidad_inicial: cantidad_eclosionada,
        cantidad_actual: cantidad_eclosionada,
        fecha_inicio: fecha_eclosion,
      })
      .select()
      .single()

    if (loteCreado) {
      await supabase.from("puestas").update({ lote_id: loteCreado.id }).eq("id", puesta.id)
      lote = loteCreado
    }
  }

  return NextResponse.json({ data: { ...puesta, lote_creado: lote } }, { status: 201 })
}
