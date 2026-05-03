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
  const estanque_id = searchParams.get("estanque_id")
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const limit = parseInt(searchParams.get("limit") ?? "50")

  if (!estanque_id) return NextResponse.json({ error: "estanque_id es requerido" }, { status: 400 })

  let query = supabase
    .from("mediciones_agua")
    .select("*")
    .eq("refugio_id", params.refugio_id)
    .eq("estanque_id", estanque_id)
    .order("fecha_hora", { ascending: false })
    .limit(limit)

  if (desde) query = query.gte("fecha_hora", desde)
  if (hasta) query = query.lte("fecha_hora", hasta)

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

  const { estanque_id, temperatura, ph, amonio, nitrito, nitrato, oxigeno, conductividad, notas } = await request.json()

  if (!estanque_id) return NextResponse.json({ error: "estanque_id es requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("mediciones_agua")
    .insert({
      refugio_id: params.refugio_id,
      estanque_id,
      registrado_por: user.id,
      temperatura, ph, amonio, nitrito, nitrato, oxigeno, conductividad, notas,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
