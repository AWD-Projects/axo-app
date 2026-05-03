import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

async function getAncestros(supabase: ReturnType<typeof createClient>, id: string, generaciones = 3): Promise<unknown[]> {
  if (generaciones === 0) return []
  const { data } = await supabase
    .from("ajolotes")
    .select("id, codigo, nombre, sexo, madre_id, padre_id")
    .eq("id", id)
    .single()
  if (!data) return []
  const [madreAnc, padreAnc] = await Promise.all([
    data.madre_id ? getAncestros(supabase, data.madre_id, generaciones - 1) : [],
    data.padre_id ? getAncestros(supabase, data.padre_id, generaciones - 1) : [],
  ])
  return [{ ...data, madre: madreAnc[0] ?? null, padre: padreAnc[0] ?? null }]
}

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
      hembra:hembra_id(id, codigo, nombre, madre_id, padre_id),
      macho:macho_id(id, codigo, nombre, madre_id, padre_id),
      estanques(id, nombre),
      puestas(*)
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
