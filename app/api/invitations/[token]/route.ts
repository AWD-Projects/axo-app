import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient()

  const { data: inv } = await admin
    .from("invitaciones")
    .select("email, rol, estado, expires_at, otp_expires_at, otp_intentos, invitado_por, refugios(nombre, tipo, ciudad)")
    .eq("token", params.token)
    .single()

  if (!inv) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 })

  if (inv.estado === "usada") {
    return NextResponse.json({ error: "Esta invitación ya fue usada", code: "USED" }, { status: 410 })
  }

  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: "La invitación expiró", code: "EXPIRED" }, { status: 410 })
  }

  let inviterName: string | null = null
  let inviterInitials: string | null = null

  if (inv.invitado_por) {
    const { data: inviter } = await admin
      .from("usuarios_perfil")
      .select("nombre, apellido")
      .eq("id", inv.invitado_por)
      .single()

    if (inviter) {
      const n = inviter.nombre?.trim() ?? ""
      const a = inviter.apellido?.trim() ?? ""
      inviterName = `${n} ${a}`.trim() || null
      inviterInitials = `${n[0] ?? ""}${a[0] ?? ""}`.toUpperCase() || null
    }
  }

  const refugio = inv.refugios as { nombre?: string; tipo?: string; ciudad?: string } | null

  return NextResponse.json({
    data: {
      email: inv.email,
      rol: inv.rol,
      otp_expires_at: inv.otp_expires_at,
      locked: (inv.otp_intentos ?? 0) >= 3,
      refugio: {
        nombre: refugio?.nombre ?? "Refugio",
        tipo: refugio?.tipo ?? null,
        ciudad: refugio?.ciudad ?? null,
      },
      inviter_name: inviterName,
      inviter_initials: inviterInitials,
    },
  })
}
