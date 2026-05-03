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
  const tipo = searchParams.get("tipo")
  const ajolote_id = searchParams.get("ajolote_id")
  const estanque_id = searchParams.get("estanque_id")
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const limit = parseInt(searchParams.get("limit") ?? "50")

  let query = supabase
    .from("eventos")
    .select(`
      id, tipo, sujeto_tipo, fecha, detalles, post_mortem_analisis, post_mortem_generado_at, created_at,
      ajolotes(id, codigo, nombre),
      estanques(id, nombre)
    `)
    .eq("refugio_id", params.refugio_id)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (tipo) query = query.eq("tipo", tipo as "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "promocion_larval" | "otro")
  if (ajolote_id) query = query.eq("ajolote_id", ajolote_id)
  if (estanque_id) query = query.eq("estanque_id", estanque_id)
  if (desde) query = query.gte("fecha", desde)
  if (hasta) query = query.lte("fecha", hasta)

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

  const { sujeto_tipo, tipo, ajolote_id, lote_id, estanque_id, fecha, detalles } = await request.json()

  if (!sujeto_tipo || !tipo) {
    return NextResponse.json({ error: "sujeto_tipo y tipo son requeridos" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("eventos")
    .insert({
      refugio_id: params.refugio_id,
      sujeto_tipo, tipo,
      ajolote_id: ajolote_id ?? null,
      lote_id: lote_id ?? null,
      estanque_id: estanque_id ?? null,
      registrado_por: user.id,
      fecha: fecha ?? new Date().toISOString(),
      detalles: detalles ?? {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
