import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: memberships, error } = await supabase
    .from("refugio_usuarios")
    .select("id, rol, activo, created_at, usuario_id")
    .eq("refugio_id", params.refugio_id)
    .eq("activo", true)
    .order("created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!memberships?.length) return NextResponse.json({ data: [] })

  const userIds = memberships.map(m => m.usuario_id)
  const admin = createAdminClient()
  const { data: perfiles } = await admin
    .from("usuarios_perfil")
    .select("id, nombre, apellido, email, avatar_url")
    .in("id", userIds)

  const perfilMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p]))
  const data = memberships.map(m => ({
    id: m.id,
    rol: m.rol,
    activo: m.activo,
    created_at: m.created_at,
    usuarios_perfil: perfilMap[m.usuario_id] ?? { id: m.usuario_id, nombre: null, apellido: null, email: "", avatar_url: null },
  }))

  return NextResponse.json({ data })
}
