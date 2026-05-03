import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; ajolote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: ajolote, error } = await supabase
    .from("ajolotes")
    .select(`
      *,
      madre:madre_id(id, codigo, nombre),
      padre:padre_id(id, codigo, nombre),
      estanques(id, nombre)
    `)
    .eq("id", params.ajolote_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !ajolote) return NextResponse.json({ error: "Ajolote no encontrado" }, { status: 404 })

  const [{ data: hijos }, { data: eventosRecientes }] = await Promise.all([
    supabase
      .from("ajolotes")
      .select("id, codigo, nombre, sexo, estado")
      .or(`madre_id.eq.${params.ajolote_id},padre_id.eq.${params.ajolote_id}`)
      .limit(5),
    supabase
      .from("eventos")
      .select("id, tipo, fecha, detalles, post_mortem_analisis")
      .eq("ajolote_id", params.ajolote_id)
      .order("fecha", { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({ data: { ...ajolote, hijos: hijos ?? [], eventos_recientes: eventosRecientes ?? [] } })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; ajolote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  // Proteger campos de genealogía — no se editan directamente
  const { madre_id: _m, padre_id: _p, ...updateData } = body

  const { data, error } = await supabase
    .from("ajolotes")
    .update(updateData)
    .eq("id", params.ajolote_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; ajolote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: ajolote } = await supabase
    .from("ajolotes")
    .select("estado")
    .eq("id", params.ajolote_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!ajolote) return NextResponse.json({ error: "Ajolote no encontrado" }, { status: 404 })
  if (ajolote.estado === "vivo") {
    return NextResponse.json({ error: "No se puede eliminar un ajolote vivo — registra un evento primero" }, { status: 400 })
  }

  const { error } = await supabase
    .from("ajolotes")
    .delete()
    .eq("id", params.ajolote_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
