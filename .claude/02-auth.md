# Axo — Auth, invitaciones y códigos de refugio

## Los 4 flujos de acceso

```
FLUJO A — Crear cuenta + crear refugio (admin)
  /register → Supabase Auth → Onboarding → "Crear refugio"
  → POST /api/refugios → INSERT refugios + refugio_usuarios(rol=admin)

FLUJO B — Crear cuenta + unirse con código
  /register → Supabase Auth → Onboarding → "Tengo un código"
  → POST /api/refugios/join-by-code → validar codigos_refugio → INSERT refugio_usuarios

FLUJO C — Invitación por email, SIN cuenta
  /invite?token=X → "No tengo cuenta" → crear cuenta
  → ingresar OTP → POST /api/invitations/accept → INSERT refugio_usuarios

FLUJO D — Invitación por email, CON cuenta
  /invite?token=X → "Ya tengo cuenta" → login
  → ingresar OTP → POST /api/invitations/accept → INSERT refugio_usuarios
```

**Regla crítica:** Un usuario puede pertenecer a N refugios con roles distintos en cada uno. Los flujos son aditivos — usar un código o aceptar una invitación solo agrega una nueva fila en `refugio_usuarios`, no modifica las existentes.

---

## Supabase Client setup

### src/lib/supabase/client.ts
```typescript
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/src/types/database"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### src/lib/supabase/server.ts
```typescript
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/src/types/database"

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }) } catch {} },
        remove(name, options) { try { cookieStore.set({ name, value: "", ...options }) } catch {} },
      },
    }
  )
}
```

### src/lib/supabase/admin.ts
```typescript
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/src/types/database"

// Solo usar en server-side: Route Handlers, Edge Functions, Crons
// NUNCA en Client Components
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

---

## middleware.ts

```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/invite"]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (!session && !isPublicRoute && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (session && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

---

## API Route — POST /api/invitations (crear invitación)

```typescript
// app/api/invitations/route.ts
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

  // Verificar que el usuario es admin del refugio
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

  // Verificar invitación pendiente existente
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

  // Generar OTP de 6 dígitos y su hash SHA-256
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = await hashOtp(otp)

  // Obtener nombre del refugio
  const { data: refugio } = await supabase.from("refugios").select("nombre").eq("id", refugio_id).single()

  // Insertar invitación
  const supabaseAdmin = createAdminClient()
  const { data: invitacion, error } = await supabaseAdmin
    .from("invitaciones")
    .insert({
      refugio_id, email, rol,
      otp_code: otpHash,
      otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      estado: "enviada",
      invitado_por: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enviar email
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

  return NextResponse.json({ success: true }, { status: 201 })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
```

---

## API Route — POST /api/invitations/accept

```typescript
// app/api/invitations/accept/route.ts
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { token, otp, nombre, apellido, password, es_usuario_existente } = await request.json()
  const supabase = createAdminClient()

  // 1. Buscar invitación por token
  const { data: inv } = await supabase
    .from("invitaciones")
    .select("*, refugios(nombre)")
    .eq("token", token)
    .in("estado", ["pendiente", "enviada"])
    .single()

  if (!inv) return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 })
  if (new Date(inv.expires_at) < new Date()) {
    await supabase.from("invitaciones").update({ estado: "expirada" }).eq("id", inv.id)
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 })
  }

  // 2. Validar OTP
  if (inv.otp_intentos >= 3)
    return NextResponse.json({ error: "Demasiados intentos. Solicita una nueva invitación." }, { status: 429 })
  if (new Date(inv.otp_expires_at) < new Date())
    return NextResponse.json({ error: "El código OTP expiró. Pide reenvío." }, { status: 400 })

  const otpHash = await hashOtp(otp)
  if (otpHash !== inv.otp_code) {
    await supabase.from("invitaciones").update({ otp_intentos: inv.otp_intentos + 1 }).eq("id", inv.id)
    return NextResponse.json({ error: "Código incorrecto", intentos_restantes: 3 - (inv.otp_intentos + 1) }, { status: 400 })
  }

  // 3. Crear o buscar usuario
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
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existing = users.find(u => u.email === inv.email)
    if (!existing) return NextResponse.json({ error: "No encontramos cuenta con ese email" }, { status: 404 })
    userId = existing.id
  }

  // 4. Agregar al refugio
  await supabase.from("refugio_usuarios").upsert(
    { refugio_id: inv.refugio_id, usuario_id: userId, rol: inv.rol, activo: true, invitado_por: inv.invitado_por },
    { onConflict: "refugio_id,usuario_id" }
  )

  // 5. Marcar invitación como usada
  await supabase.from("invitaciones").update({ estado: "usada" }).eq("id", inv.id)

  return NextResponse.json({ success: true, refugio_id: inv.refugio_id }, { status: 200 })
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
```

---

## API Route — POST /api/refugios/join-by-code

```typescript
// app/api/refugios/join-by-code/route.ts
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

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

  // Verificar que no es ya miembro
  const { data: ya } = await admin
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", ref.refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (ya) return NextResponse.json({ error: `Ya eres miembro de este refugio (${ya.rol})` }, { status: 409 })

  // Agregar al refugio
  await admin.from("refugio_usuarios").insert({ refugio_id: ref.refugio_id, usuario_id: user.id, rol: ref.rol, activo: true })
  await admin.from("codigos_refugio").update({ usos: ref.usos + 1 }).eq("id", ref.id)

  return NextResponse.json({
    success: true,
    refugio_id: ref.refugio_id,
    refugio_nombre: (ref.refugios as any)?.nombre,
    rol: ref.rol
  })
}
```
