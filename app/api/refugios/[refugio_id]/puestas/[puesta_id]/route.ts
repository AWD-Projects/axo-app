import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; puesta_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("puestas")
    .select("*, cruzas(id, estado, hembra_id, macho_id), lotes_larvales(id, codigo, etapa, cantidad_actual)")
    .eq("id", params.puesta_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Puesta no encontrada" }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; puesta_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { fecha_puesta, cantidad_huevos, fecha_eclosion, cantidad_eclosionada, notas } = await request.json()

  const { data, error } = await supabase
    .from("puestas")
    .update({
      ...(fecha_puesta !== undefined && { fecha_puesta }),
      ...(cantidad_huevos !== undefined && { cantidad_huevos }),
      ...(fecha_eclosion !== undefined && { fecha_eclosion }),
      ...(cantidad_eclosionada !== undefined && { cantidad_eclosionada }),
      ...(notas !== undefined && { notas }),
    })
    .eq("id", params.puesta_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; puesta_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: puesta } = await supabase
    .from("puestas")
    .select("lote_id")
    .eq("id", params.puesta_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!puesta) return NextResponse.json({ error: "Puesta no encontrada" }, { status: 404 })
  if (puesta.lote_id) return NextResponse.json({ error: "No se puede eliminar una puesta con lote larval asociado" }, { status: 400 })

  const { error } = await supabase
    .from("puestas")
    .delete()
    .eq("id", params.puesta_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
