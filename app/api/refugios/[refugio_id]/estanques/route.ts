import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: estanques, error } = await supabase
    .from("estanques")
    .select("*")
    .eq("refugio_id", params.refugio_id)
    .order("nombre")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con conteo de ajolotes vivos y última medición
  const enriched = await Promise.all(
    (estanques ?? []).map(async (estanque) => {
      const [{ count }, { data: ultimaMedicion }] = await Promise.all([
        supabase
          .from("ajolotes")
          .select("id", { count: "exact", head: true })
          .eq("estanque_id", estanque.id)
          .eq("estado", "vivo"),
        supabase
          .from("mediciones_agua")
          .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
          .eq("estanque_id", estanque.id)
          .order("fecha_hora", { ascending: false })
          .limit(1)
          .single(),
      ])
      return { ...estanque, ajolotes_vivos: count ?? 0, ultima_medicion: ultimaMedicion ?? null }
    })
  )

  return NextResponse.json({ data: enriched })
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

  if (!membership || !["admin", "tecnico"].includes(membership.rol)) {
    return NextResponse.json({ error: "Solo admin y tecnico pueden crear estanques" }, { status: 403 })
  }

  const { nombre, capacidad_litros, tipo_sistema, ubicacion_fisica, notas } = await request.json()
  if (!nombre) return NextResponse.json({ error: "nombre es requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("estanques")
    .insert({ refugio_id: params.refugio_id, nombre, capacidad_litros, tipo_sistema, ubicacion_fisica, notas })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 })
  return NextResponse.json({ data }, { status: 201 })
}
