import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("lotes_larvales")
    .select("*, estanques(id, nombre), cruzas(id, estado)")
    .eq("refugio_id", params.refugio_id)
    .eq("activo", true)
    .order("created_at", { ascending: false })

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

  const { codigo, etapa, cantidad_inicial, estanque_id, cruza_id, notas } = await request.json()

  if (!codigo || !etapa) return NextResponse.json({ error: "codigo y etapa son requeridos" }, { status: 400 })

  const { data, error } = await supabase
    .from("lotes_larvales")
    .insert({
      refugio_id: params.refugio_id,
      codigo, etapa,
      cantidad_inicial: cantidad_inicial ?? 0,
      cantidad_actual: cantidad_inicial ?? 0,
      estanque_id: estanque_id ?? null,
      cruza_id: cruza_id ?? null,
      notas: notas ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 })
  return NextResponse.json({ data }, { status: 201 })
}
