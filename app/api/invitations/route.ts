import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { refugio_id, email, rol } = await request.json()

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership || membership.rol !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden invitar usuarios" }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from("invitaciones")
    .select("id")
    .eq("refugio_id", refugio_id)
    .eq("email", email)
    .in("estado", ["pendiente", "enviada"])
    .single()

  if (existing) {
    return NextResponse.json({ error: "Ya existe una invitación pendiente para este email" }, { status: 409 })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = await hashOtp(otp)

  const { data: refugio } = await supabase.from("refugios").select("nombre").eq("id", refugio_id).single()

  const supabaseAdmin = createAdminClient()
  const { data: invitacion, error } = await supabaseAdmin
    .from("invitaciones")
    .insert({
      refugio_id, email, rol,
      otp_code: otpHash,
      otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      estado: "enviada" as const,
      invitado_por: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${invitacion.token}`
  await resend.emails.send({
    from: "Axo <no-reply@amoxtli.tech>",
    to: email,
    subject: `Invitación al refugio ${refugio?.nombre} en Axo`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0a0a0a">
        <h2 style="color:#1a6560">Axo</h2>
        <p>Te invitaron a unirte a <strong>${refugio?.nombre}</strong> como <strong>${rol}</strong>.</p>
        <a href="${inviteUrl}" style="display:inline-block;background:#1a6560;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;margin:12px 0">
          Aceptar invitación
        </a>
        <p>Código OTP (válido 15 min):</p>
        <div style="font-size:32px;font-family:monospace;letter-spacing:8px;color:#1a6560;padding:16px;background:#e0efed;border-radius:8px;text-align:center">${otp}</div>
        <p style="color:#96928d;font-size:12px">Esta invitación expira en 7 días.</p>
      </div>
    `,
  })

  return NextResponse.json({ data: { success: true } }, { status: 201 })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
}
