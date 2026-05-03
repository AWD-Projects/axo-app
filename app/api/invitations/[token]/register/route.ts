import { createAdminClient } from "@/src/lib/supabase/admin"
import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient()

  const { data: inv } = await admin
    .from("invitaciones")
    .select("id, email, refugios(nombre)")
    .eq("token", params.token)
    .in("estado", ["pendiente", "enviada"])
    .single()

  if (!inv) return NextResponse.json({ error: "Invitación no válida" }, { status: 404 })

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = await hashOtp(otp)
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { error } = await admin
    .from("invitaciones")
    .update({ otp_code: otpHash, otp_expires_at: otpExpiresAt, otp_intentos: 0, estado: "enviada" })
    .eq("id", inv.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const refugio = inv.refugios as { nombre?: string } | null
  await resend.emails.send({
    from: "Axo <no-reply@amoxtli.tech>",
    to: inv.email,
    subject: `Tu código para unirte a ${refugio?.nombre ?? "Axo"}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0a0a0a">
        <h2 style="color:#1a6560">Axo</h2>
        <p>Tu código para crear tu cuenta y unirte a <strong>${refugio?.nombre ?? "Axo"}</strong>:</p>
        <div style="font-size:32px;font-family:monospace;letter-spacing:8px;color:#1a6560;padding:16px;background:#e0efed;border-radius:8px;text-align:center">${otp}</div>
        <p style="color:#9a958f;font-size:12px">Este código expira en 15 minutos.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, otp_expires_at: otpExpiresAt })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
}
