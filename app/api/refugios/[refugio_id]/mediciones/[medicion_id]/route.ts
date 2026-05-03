import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; medicion_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("mediciones_agua")
    .select("*, estanques(id, nombre)")
    .eq("id", params.medicion_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Medición no encontrada" }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; medicion_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { temperatura, ph, amonio, nitrito, nitrato, oxigeno, conductividad, notas } = await request.json()

  const { data, error } = await supabase
    .from("mediciones_agua")
    .update({ temperatura, ph, amonio, nitrito, nitrato, oxigeno, conductividad, notas })
    .eq("id", params.medicion_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; medicion_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { error } = await supabase
    .from("mediciones_agua")
    .delete()
    .eq("id", params.medicion_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
