import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; estanque_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: estanque, error } = await supabase
    .from("estanques")
    .select("*")
    .eq("id", params.estanque_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !estanque) return NextResponse.json({ error: "Estanque no encontrado" }, { status: 404 })

  const [{ data: mediciones }, { data: ajolotes }] = await Promise.all([
    supabase
      .from("mediciones_agua")
      .select("fecha_hora, temperatura, ph, amonio, nitrito, nitrato, oxigeno, conductividad, notas")
      .eq("estanque_id", params.estanque_id)
      .order("fecha_hora", { ascending: false })
      .limit(7),
    supabase
      .from("ajolotes")
      .select("id, codigo, nombre, sexo, estado, morfotipo")
      .eq("estanque_id", params.estanque_id)
      .eq("estado", "vivo"),
  ])

  return NextResponse.json({ data: { ...estanque, mediciones: mediciones ?? [], ajolotes: ajolotes ?? [] } })
}

export async function PATCH(
  request: Request,
  { params }: { params: { refugio_id: string; estanque_id: string } }
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

  if (!membership || !["admin", "tecnico"].includes(membership.rol)) {
    return NextResponse.json({ error: "Sin permisos para editar estanques" }, { status: 403 })
  }

  const body = await request.json()
  const { data, error } = await supabase
    .from("estanques")
    .update(body)
    .eq("id", params.estanque_id)
    .eq("refugio_id", params.refugio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { refugio_id: string; estanque_id: string } }
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
    return NextResponse.json({ error: "Solo admins pueden desactivar estanques" }, { status: 403 })
  }

  const { count } = await supabase
    .from("ajolotes")
    .select("id", { count: "exact", head: true })
    .eq("estanque_id", params.estanque_id)
    .eq("estado", "vivo")

  if (count && count > 0) {
    return NextResponse.json({ error: `No se puede desactivar — hay ${count} ajolotes vivos en este estanque` }, { status: 400 })
  }

  const { error } = await supabase
    .from("estanques")
    .update({ activo: false })
    .eq("id", params.estanque_id)
    .eq("refugio_id", params.refugio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
