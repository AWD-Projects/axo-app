import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("refugio_usuarios")
    .select(`
      rol,
      refugios (
        id, nombre, tipo, numero_uma, ciudad, estado_republica,
        plan, activo, config_regulatoria, created_at
      )
    `)
    .eq("usuario_id", user.id)
    .eq("activo", true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { nombre, tipo, numero_uma, responsable_tecnico, rfc, ubicacion, ciudad, estado_republica, config_regulatoria } = body

  if (!nombre || !tipo) {
    return NextResponse.json({ error: "nombre y tipo son requeridos" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: refugio, error: refugioError } = await admin
    .from("refugios")
    .insert({ nombre, tipo, numero_uma, responsable_tecnico, rfc, ubicacion, ciudad, estado_republica, config_regulatoria })
    .select()
    .single()

  if (refugioError) return NextResponse.json({ error: refugioError.message }, { status: 500 })

  const { error: memberError } = await admin
    .from("refugio_usuarios")
    .insert({ refugio_id: refugio.id, usuario_id: user.id, rol: "admin" })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ data: refugio }, { status: 201 })
}
