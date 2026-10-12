"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAnimate, useReducedMotion } from "framer-motion"
import { Check, X } from "lucide-react"
import { createClient } from "@/src/lib/supabase/client"
import { AuthShell } from "../_components/AuthShell"
import { Field, PasswordField, FormAlert, SubmitButton, linkClass } from "../_components/fields"

type FormState = "idle" | "loading" | "success" | "error"

interface FieldErrors {
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  confirm?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score as 0 | 1 | 2 | 3 | 4
}

const STRENGTH_LABELS = ["", "Muy débil", "Débil", "Aceptable", "Segura"]
const STRENGTH_BG = ["bg-border", "bg-error", "bg-warning", "bg-accent", "bg-success"]
const STRENGTH_TEXT = ["", "text-error", "text-warning", "text-accent", "text-success"]

function validateForm(
  nombre: string,
  apellido: string,
  email: string,
  password: string,
  confirm: string
): FieldErrors {
  if (!nombre.trim()) return { nombre: "El nombre es requerido." }
  if (!apellido.trim()) return { apellido: "El apellido es requerido." }
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { email: "Ingresa un correo válido." }
  if (password.length < 8 || !/[0-9]/.test(password) || !/[A-Z]/.test(password))
    return { password: "Mínimo 8 caracteres, 1 número y 1 mayúscula." }
  if (password !== confirm) return { confirm: "Las contraseñas no coinciden." }
  return {}
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState("")
  const [formRef, animateForm] = useAnimate()

  const strength = getPasswordStrength(password)
  const isLoading = formState === "loading"
  const isSuccess = formState === "success"
  const locked = isLoading || isSuccess

  const clearError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const shake = () => {
    if (!reduceMotion) {
      animateForm(formRef.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(nombre, apellido, email, password, confirm)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      shake()
      return
    }
    setFieldErrors({})
    setServerError("")
    setFormState("loading")

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setFormState("error")
      setServerError(
        error.message === "User already registered"
          ? "Ya existe una cuenta con este correo."
          : error.message
      )
      setFieldErrors({ email: "Ya existe una cuenta con este correo." })
      shake()
      return
    }

    setFormState("success")
    setTimeout(() => router.push("/onboarding"), 800)
  }

  return (
    <AuthShell
      titulo="Empieza por registrar a tu colonia."
      texto="Crea tu cuenta, configura tu refugio y carga tus primeros ejemplares."
      pasos={[
        { label: "Crear cuenta", activo: true },
        { label: "Configurar refugio", activo: false },
        { label: "Listo", activo: false },
      ]}
    >
      <h1 className="text-h1 text-text-primary">Crea tu cuenta</h1>
      <p className="mt-1.5 text-body-l text-text-secondary">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className={linkClass}>
          Iniciar sesión
        </Link>
      </p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <Field
            id="nombre"
            label="Nombre"
            autoComplete="given-name"
            placeholder="Ana"
            value={nombre}
            onChange={(v) => { setNombre(v); clearError("nombre") }}
            error={fieldErrors.nombre}
            disabled={locked}
          />
          <Field
            id="apellido"
            label="Apellido"
            autoComplete="family-name"
            placeholder="López"
            value={apellido}
            onChange={(v) => { setApellido(v); clearError("apellido") }}
            error={fieldErrors.apellido}
            disabled={locked}
          />
        </div>

        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@institucion.mx"
          value={email}
          onChange={(v) => { setEmail(v); clearError("email") }}
          error={fieldErrors.email}
          disabled={locked}
        />

        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(v) => { setPassword(v); clearError("password") }}
          error={fieldErrors.password}
          disabled={locked}
        >
          {password.length > 0 && <PasswordStrengthBar strength={strength} />}
        </PasswordField>

        <PasswordField
          id="confirm"
          label="Confirmar contraseña"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={confirm}
          onChange={(v) => { setConfirm(v); clearError("confirm") }}
          error={fieldErrors.confirm}
          disabled={locked}
        >
          {confirm.length > 0 && !fieldErrors.confirm && <MatchIndicator matches={password === confirm} />}
        </PasswordField>

        {serverError && !Object.keys(fieldErrors).length && <FormAlert message={serverError} />}

        <div className="pt-2">
          <SubmitButton
            disabled={!(!!nombre.trim() && !!apellido.trim() && !!email.trim() && !!password && !!confirm) || locked}
            loading={isLoading}
            success={isSuccess}
            idle="Crear cuenta"
            loadingText="Creando cuenta..."
            successText="Cuenta creada"
          />
        </div>
      </form>

      <p className="mt-6 text-small leading-[1.5] text-text-secondary">
        Al crear una cuenta aceptas los{" "}
        <Link href="/terminos" className={linkClass}>
          Términos de uso
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className={linkClass}>
          Política de privacidad
        </Link>{" "}
        de Axo y AMOXTLI.
      </p>
    </AuthShell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PasswordStrengthBar({ strength }: { strength: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="pt-1" aria-live="polite">
      <div className="mb-1 flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-[3px] flex-1 rounded-xs transition-colors duration-200 motion-reduce:transition-none ${
              seg <= strength ? STRENGTH_BG[strength] : "bg-border"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-right text-small font-medium ${STRENGTH_TEXT[strength]}`}>
          Contraseña: {STRENGTH_LABELS[strength].toLowerCase()}
        </p>
      )}
    </div>
  )
}

function MatchIndicator({ matches }: { matches: boolean }) {
  return (
    <p
      className={`flex items-center gap-1.5 text-small ${matches ? "text-success" : "text-error"}`}
      aria-live="polite"
    >
      {matches ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
      {matches ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
    </p>
  )
}
