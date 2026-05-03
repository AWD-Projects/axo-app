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
  const estado = searchParams.get("estado")
  const sexo = searchParams.get("sexo")
  const estanque_id = searchParams.get("estanque_id")
  const search = searchParams.get("search")

  let query = supabase
    .from("ajolotes")
    .select(`
      id, codigo, nombre, sexo, estado, morfotipo, fecha_nacimiento, fecha_ingreso, origen,
      estanques(id, nombre),
      madre:madre_id(id, codigo),
      padre:padre_id(id, codigo)
    `)
    .eq("refugio_id", params.refugio_id)
    .order("codigo")

  if (estado) query = query.eq("estado", estado as "vivo" | "fallecido" | "transferido" | "egresado")
  if (sexo) query = query.eq("sexo", sexo as "macho" | "hembra" | "indeterminado")
  if (estanque_id) query = query.eq("estanque_id", estanque_id)
  if (search) query = query.or(`codigo.ilike.%${search}%,nombre.ilike.%${search}%`)

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

  const body = await request.json()
  const { codigo, sexo, fecha_nacimiento, origen, estanque_id, morfotipo, madre_id, padre_id, notas, nombre, fecha_ingreso } = body

  if (!codigo) return NextResponse.json({ error: "codigo es requerido" }, { status: 400 })
  if (!origen) return NextResponse.json({ error: "origen es requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("ajolotes")
    .insert({
      refugio_id: params.refugio_id,
      codigo, nombre, sexo, fecha_nacimiento, fecha_ingreso, origen,
      estanque_id: estanque_id ?? null,
      morfotipo: morfotipo ?? null,
      madre_id: madre_id ?? null,
      padre_id: padre_id ?? null,
      notas: notas ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 })
  return NextResponse.json({ data }, { status: 201 })
}
