import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get("code")?.trim().toUpperCase()
  if (!codigo) return NextResponse.json({ error: "Código requerido" }, { status: 400 })

  const admin = createAdminClient()
  const { data: ref } = await admin
    .from("codigos_refugio")
    .select("rol, activo, usos, max_usos, expires_at, refugios(nombre, tipo, ciudad, estado_republica)")
    .eq("codigo", codigo)
    .single()

  if (!ref) return NextResponse.json({ error: "Código no válido" }, { status: 404 })
  if (!ref.activo) return NextResponse.json({ error: "Código inactivo" }, { status: 400 })
  if (ref.expires_at && new Date(ref.expires_at) < new Date())
    return NextResponse.json({ error: "Código expirado" }, { status: 400 })
  if (ref.max_usos !== null && ref.usos >= ref.max_usos)
    return NextResponse.json({ error: "Código sin usos disponibles" }, { status: 400 })

  const refugio = ref.refugios as { nombre: string; tipo: string; ciudad: string; estado_republica: string } | null
  return NextResponse.json({
    data: {
      nombre: refugio?.nombre,
      tipo: refugio?.tipo,
      ciudad: refugio?.ciudad,
      estado_republica: refugio?.estado_republica,
      rol: ref.rol,
    }
  })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Debes iniciar sesión primero" }, { status: 401 })

  const { codigo } = await request.json()
  if (!codigo?.trim()) return NextResponse.json({ error: "Código requerido" }, { status: 400 })

  const admin = createAdminClient()
  const { data: ref } = await admin
    .from("codigos_refugio")
    .select("id, refugio_id, rol, activo, usos, max_usos, expires_at, refugios(nombre)")
    .eq("codigo", codigo.trim().toUpperCase())
    .single()

  if (!ref) return NextResponse.json({ error: "Código no válido" }, { status: 404 })
  if (!ref.activo) return NextResponse.json({ error: "Código inactivo" }, { status: 400 })
  if (ref.expires_at && new Date(ref.expires_at) < new Date())
    return NextResponse.json({ error: "Código expirado" }, { status: 400 })
  if (ref.max_usos !== null && ref.usos >= ref.max_usos)
    return NextResponse.json({ error: "Código sin usos disponibles" }, { status: 400 })

  const { data: ya } = await admin
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", ref.refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (ya) return NextResponse.json({ error: `Ya eres miembro de este refugio (${ya.rol})` }, { status: 409 })

  await admin.from("refugio_usuarios").insert({ refugio_id: ref.refugio_id, usuario_id: user.id, rol: ref.rol, activo: true })
  await admin.from("codigos_refugio").update({ usos: ref.usos + 1 }).eq("id", ref.id)

  return NextResponse.json({
    data: {
      success: true,
      refugio_id: ref.refugio_id,
      refugio_nombre: (ref.refugios as { nombre: string } | null)?.nombre,
      rol: ref.rol
    }
  })
}
