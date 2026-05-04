import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; alerta_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("alertas")
    .select("*, estanque:estanques(id, nombre), ajolote:ajolotes(id, codigo, nombre)")
    .eq("id", params.alerta_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; alerta_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { accion } = await request.json()

  if (!["leer", "resolver"].includes(accion)) {
    return NextResponse.json({ error: "accion debe ser 'leer' o 'resolver'" }, { status: 400 })
  }

  const updateData = accion === "leer"
    ? { leida_at: new Date().toISOString() }
    : { resuelta_at: new Date().toISOString(), resuelta_por: user.id }

  const { data, error } = await supabase
    .from("alertas")
    .update(updateData)
    .eq("id", params.alerta_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
