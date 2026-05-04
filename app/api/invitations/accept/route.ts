import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { token, otp, nombre, apellido, password, es_usuario_existente } = await request.json()
  const supabase = createAdminClient()

  const { data: inv } = await supabase
    .from("invitaciones")
    .select("*, refugios(nombre)")
    .eq("token", token)
    .in("estado", ["pendiente", "enviada"])
    .single()

  if (!inv) return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 })
  if (new Date(inv.expires_at) < new Date()) {
    await supabase.from("invitaciones").update({ estado: "expirada" as const }).eq("id", inv.id)
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 })
  }

  if (inv.otp_intentos >= 3)
    return NextResponse.json({ error: "Demasiados intentos. Solicita una nueva invitación." }, { status: 429 })
  if (inv.otp_expires_at && new Date(inv.otp_expires_at) < new Date())
    return NextResponse.json({ error: "El código OTP expiró. Pide reenvío." }, { status: 400 })

  const otpHash = await hashOtp(otp)
  if (otpHash !== inv.otp_code) {
    await supabase.from("invitaciones").update({ otp_intentos: inv.otp_intentos + 1 }).eq("id", inv.id)
    return NextResponse.json({ error: "Código incorrecto", intentos_restantes: 3 - (inv.otp_intentos + 1) }, { status: 400 })
  }

  let userId: string
  if (!es_usuario_existente) {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: inv.email, password, email_confirm: true,
      user_metadata: { nombre, apellido }
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = newUser.user.id
    await supabase.from("usuarios_perfil").upsert({ id: userId, nombre, apellido, email: inv.email })
  } else {
    const { data: profile } = await supabase
      .from("usuarios_perfil")
      .select("id")
      .eq("email", inv.email)
      .single()
    if (!profile) return NextResponse.json({ error: "No encontramos una cuenta con ese correo. Usa la opción 'No tengo cuenta' para registrarte." }, { status: 404 })
    userId = profile.id
  }

  await supabase.from("refugio_usuarios").upsert(
    { refugio_id: inv.refugio_id, usuario_id: userId, rol: inv.rol, activo: true, invitado_por: inv.invitado_por },
    { onConflict: "refugio_id,usuario_id" }
  )

  await supabase.from("invitaciones").update({ estado: "usada" as const }).eq("id", inv.id)

  return NextResponse.json({ data: { success: true, refugio_id: inv.refugio_id } }, { status: 200 })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
}
