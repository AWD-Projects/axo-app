import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const refugio_id = searchParams.get("refugio_id")
  if (!refugio_id) return NextResponse.json({ error: "refugio_id es requerido" }, { status: 400 })

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership) return NextResponse.json({ error: "Sin acceso al refugio" }, { status: 403 })

  const { data, error } = await supabase
    .from("axo_ai_conversaciones")
    .select("id, titulo, created_at, updated_at")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activa", true)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { refugio_id, titulo } = await request.json()
  if (!refugio_id) return NextResponse.json({ error: "refugio_id es requerido" }, { status: 400 })

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership) return NextResponse.json({ error: "Sin acceso al refugio" }, { status: 403 })

  const { data, error } = await supabase
    .from("axo_ai_conversaciones")
    .insert({
      refugio_id,
      usuario_id: user.id,
      titulo: titulo || "Nueva conversación",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
