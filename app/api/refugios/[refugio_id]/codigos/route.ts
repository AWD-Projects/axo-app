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
    return NextResponse.json({ error: "Solo admins pueden ver los códigos" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("codigos_refugio")
    .select("*")
    .eq("refugio_id", params.refugio_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
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
    return NextResponse.json({ error: "Solo admins pueden crear códigos" }, { status: 403 })
  }

  const body = await request.json()
  const { codigo, rol, descripcion, max_usos, expires_at } = body

  if (!codigo || !rol) return NextResponse.json({ error: "codigo y rol son requeridos" }, { status: 400 })
  if (rol === "admin") return NextResponse.json({ error: "No se pueden crear códigos con rol admin" }, { status: 400 })

  const { data, error } = await supabase
    .from("codigos_refugio")
    .insert({
      refugio_id: params.refugio_id,
      codigo: codigo.toUpperCase(),
      rol,
      descripcion,
      max_usos: max_usos ?? null,
      expires_at: expires_at ?? null,
      generado_por: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 })
  return NextResponse.json({ data }, { status: 201 })
}
