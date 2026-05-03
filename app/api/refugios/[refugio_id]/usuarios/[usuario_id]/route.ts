import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; usuario_id: string } }
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
    return NextResponse.json({ error: "Solo admins pueden cambiar roles" }, { status: 403 })
  }

  if (params.usuario_id === user.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
  }

  const { rol } = await request.json()
  const { data, error } = await supabase
    .from("refugio_usuarios")
    .update({ rol })
    .eq("refugio_id", params.refugio_id)
    .eq("usuario_id", params.usuario_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; usuario_id: string } }
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
    return NextResponse.json({ error: "Solo admins pueden remover usuarios" }, { status: 403 })
  }

  if (params.usuario_id === user.id) {
    return NextResponse.json({ error: "No puedes removerte a ti mismo" }, { status: 400 })
  }

  const { error } = await supabase
    .from("refugio_usuarios")
    .update({ activo: false })
    .eq("refugio_id", params.refugio_id)
    .eq("usuario_id", params.usuario_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
