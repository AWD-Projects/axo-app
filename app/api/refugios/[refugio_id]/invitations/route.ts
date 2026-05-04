import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
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
    return NextResponse.json({ error: "Solo admins pueden ver invitaciones" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("invitaciones")
    .select("id, email, rol, token, estado, expires_at, created_at")
    .eq("refugio_id", params.refugio_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shaped = (data ?? []).map(inv => ({
    id: inv.id,
    email: inv.email,
    rol: inv.rol,
    token: inv.token,
    used: inv.estado === "usada",
    expires_at: inv.expires_at,
    created_at: inv.created_at,
  }))

  return NextResponse.json({ data: shaped })
}
