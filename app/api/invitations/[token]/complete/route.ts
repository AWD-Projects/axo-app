import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { nombre, apellido, password, otp } = body as {
    nombre: string
    apellido: string
    password: string
    otp: string
  }

  if (!nombre || !apellido || !password || !otp) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: inv } = await admin
    .from("invitaciones")
    .select("id, email, rol, refugio_id, otp_code, otp_expires_at, otp_intentos")
    .eq("token", params.token)
    .in("estado", ["pendiente", "enviada"])
    .single()

  if (!inv) return NextResponse.json({ error: "Invitación no válida" }, { status: 404 })

  // Check OTP expiry
  if (inv.otp_expires_at && new Date(inv.otp_expires_at) < new Date()) {
    return NextResponse.json({ error: "El código expiró.", code: "EXPIRED" }, { status: 422 })
  }

  // Check attempt limit
  const intentos = inv.otp_intentos ?? 0
  if (intentos >= 3) {
    return NextResponse.json({ error: "Demasiados intentos.", code: "LOCKED" }, { status: 422 })
  }

  // Verify OTP
  const otpHash = await hashOtp(otp)
  if (otpHash !== inv.otp_code) {
    const newIntentos = intentos + 1
    await admin.from("invitaciones").update({ otp_intentos: newIntentos }).eq("id", inv.id)
    const attemptsLeft = Math.max(0, 3 - newIntentos)
    return NextResponse.json(
      { error: "Código incorrecto.", code: "WRONG_OTP", attempts_left: attemptsLeft },
      { status: 422 }
    )
  }

  // Create auth user (email already confirmed via OTP)
  const { data: { user }, error: createError } = await admin.auth.admin.createUser({
    email: inv.email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })

  if (createError || !user) {
    const msg = createError?.message ?? "Error al crear cuenta."
    const isConflict = msg.toLowerCase().includes("already")
    return NextResponse.json(
      { error: isConflict ? "Este correo ya tiene una cuenta." : msg },
      { status: isConflict ? 409 : 500 }
    )
  }

  // Create profile
  await admin.from("usuarios_perfil").insert({ id: user.id, nombre, apellido, email: inv.email })

  // Link to refuge with invited role
  await admin.from("refugio_usuarios").insert({
    usuario_id: user.id,
    refugio_id: inv.refugio_id,
    rol: inv.rol,
  })

  // Mark invitation as used
  await admin.from("invitaciones").update({ estado: "usada" }).eq("id", inv.id)

  return NextResponse.json({ success: true })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
}
