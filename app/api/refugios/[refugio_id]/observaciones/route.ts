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
  const sujeto_tipo = searchParams.get("sujeto_tipo")
  const sujeto_id = searchParams.get("sujeto_id")
  const severidad = searchParams.get("severidad")

  let query = supabase
    .from("observaciones_clinicas")
    .select("*")
    .eq("refugio_id", params.refugio_id)
    .order("fecha_hora", { ascending: false })
    .limit(50)

  if (sujeto_tipo) query = query.eq("sujeto_tipo", sujeto_tipo as "ajolote" | "lote" | "estanque")
  if (severidad) query = query.eq("severidad", severidad as "leve" | "moderada" | "grave" | "critica")
  if (sujeto_id && sujeto_tipo === "ajolote") query = query.eq("ajolote_id", sujeto_id)
  if (sujeto_id && sujeto_tipo === "lote") query = query.eq("lote_id", sujeto_id)
  if (sujeto_id && sujeto_tipo === "estanque") query = query.eq("estanque_id", sujeto_id)

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

  const { sujeto_tipo, ajolote_id, lote_id, estanque_id, descripcion, severidad } = await request.json()

  if (!sujeto_tipo || !descripcion) {
    return NextResponse.json({ error: "sujeto_tipo y descripcion son requeridos" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("observaciones_clinicas")
    .insert({
      refugio_id: params.refugio_id,
      sujeto_tipo,
      ajolote_id: ajolote_id ?? null,
      lote_id: lote_id ?? null,
      estanque_id: estanque_id ?? null,
      registrado_por: user.id,
      descripcion,
      severidad: severidad ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
