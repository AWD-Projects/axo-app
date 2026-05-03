import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; lote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("lotes_larvales")
    .select("*, estanques(id, nombre), cruzas(id, estado, hembra_id, macho_id)")
    .eq("id", params.lote_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; lote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { cantidad_actual, etapa, estanque_id, notas, activo } = await request.json()

  const { data, error } = await supabase
    .from("lotes_larvales")
    .update({ cantidad_actual, etapa, estanque_id, notas, activo })
    .eq("id", params.lote_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
