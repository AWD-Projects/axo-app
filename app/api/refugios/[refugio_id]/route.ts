import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: refugio, error } = await supabase
    .from("refugios")
    .select("*")
    .eq("id", params.refugio_id)
    .single()

  if (error || !refugio) return NextResponse.json({ error: "Refugio no encontrado" }, { status: 404 })

  const { data: estanques } = await supabase
    .from("estanques")
    .select("id, nombre, activo, tipo_sistema")
    .eq("refugio_id", params.refugio_id)

  const { count: ajolotesVivos } = await supabase
    .from("ajolotes")
    .select("id", { count: "exact", head: true })
    .eq("refugio_id", params.refugio_id)
    .eq("estado", "vivo")

  return NextResponse.json({ data: { ...refugio, estanques, ajolotes_vivos: ajolotesVivos ?? 0 } })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", params.refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership || membership.rol !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden editar el refugio" }, { status: 403 })
  }

  const body = await request.json()
  const { data, error } = await supabase
    .from("refugios")
    .update(body)
    .eq("id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", params.refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership || membership.rol !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden desactivar el refugio" }, { status: 403 })
  }

  const { error } = await supabase
    .from("refugios")
    .update({ activo: false })
    .eq("id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
