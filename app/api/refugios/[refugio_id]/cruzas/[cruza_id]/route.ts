import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"


export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; cruza_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: cruza, error } = await supabase
    .from("cruzas")
    .select(`
      *,
      hembra:hembra_id(
        id, codigo, nombre, morfotipo,
        madre:madre_id(id, codigo),
        padre:padre_id(id, codigo)
      ),
      macho:macho_id(
        id, codigo, nombre, morfotipo,
        madre:madre_id(id, codigo),
        padre:padre_id(id, codigo)
      ),
      estanques(id, nombre),
      puestas(*, lote:lote_id(id, codigo, etapa, cantidad_actual, cantidad_inicial, fecha_inicio))
    `)
    .eq("id", params.cruza_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !cruza) return NextResponse.json({ error: "Cruza no encontrada" }, { status: 404 })

  return NextResponse.json({ data: cruza })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; cruza_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from("cruzas")
    .update({
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.fecha_inicio !== undefined && { fecha_inicio: body.fecha_inicio }),
      ...(body.fecha_fin !== undefined && { fecha_fin: body.fecha_fin }),
      ...(body.aprobado_por !== undefined && { aprobado_por: body.aprobado_por }),
      ...(body.notas !== undefined && { notas: body.notas }),
    })
    .eq("id", params.cruza_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; cruza_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: cruza } = await supabase
    .from("cruzas")
    .select("estado")
    .eq("id", params.cruza_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!cruza) return NextResponse.json({ error: "Cruza no encontrada" }, { status: 404 })
  if (cruza.estado === "activa") return NextResponse.json({ error: "No se puede eliminar una cruza activa" }, { status: 400 })

  const { error } = await supabase
    .from("cruzas")
    .delete()
    .eq("id", params.cruza_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
