import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; evento_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: evento, error } = await supabase
    .from("eventos")
    .select(`
      *,
      ajolotes(id, codigo, nombre, sexo, morfotipo),
      estanques(id, nombre)
    `)
    .eq("id", params.evento_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !evento) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })

  const response: Record<string, unknown> = { ...evento }

  if (evento.tipo === "muerte") {
    if (evento.post_mortem_generado_at) {
      response.post_mortem_disponible = true
    } else {
      response.analisis_pendiente = true
    }
  }

  return NextResponse.json({ data: response })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; evento_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { tipo, fecha, detalles, estanque_id, ajolote_id } = body

  const { data, error } = await supabase
    .from("eventos")
    .update({
      ...(tipo !== undefined && { tipo }),
      ...(fecha !== undefined && { fecha }),
      ...(detalles !== undefined && { detalles }),
      ...(estanque_id !== undefined && { estanque_id }),
      ...(ajolote_id !== undefined && { ajolote_id }),
    })
    .eq("id", params.evento_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; evento_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: evento } = await supabase
    .from("eventos")
    .select("tipo")
    .eq("id", params.evento_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!evento) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
  if (evento.tipo === "muerte") return NextResponse.json({ error: "No se puede eliminar un evento de muerte" }, { status: 400 })

  const { error } = await supabase
    .from("eventos")
    .delete()
    .eq("id", params.evento_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
