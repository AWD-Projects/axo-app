"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useAnimate } from "framer-motion"
import { createClient } from "@/src/lib/supabase/client"
import { Logo } from "@/components/Logo"

type FormState = "idle" | "loading" | "success" | "error"

interface FieldErrors {
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  confirm?: string
}

// ── Variants ──────────────────────────────────────────────────────────────────

const colContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
const colItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
}
const formContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const formItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
}
const errorItem = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: "auto", marginTop: 4 },
  exit: { opacity: 0, height: 0, marginTop: 0 },
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
const STRENGTH_COLORS = ["#e5e2dc", "#991b1b", "#92400e", "#1a6560", "#15803d"]

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

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    height: "44px",
    padding: "0 14px",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#0d0d0d",
    backgroundColor: hasError ? "#fff8f8" : "#ffffff",
    border: hasError ? "1px solid #fca5a5" : "0.5px solid #e5e2dc",
    outline: "none",
    width: "100%",
    fontFamily: "var(--font-dm-sans), sans-serif",
    transition: "border 150ms, box-shadow 150ms",
  }
}

function applyFocusStyle(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
  e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #1a6560"
  e.target.style.boxShadow = hasError ? "0 0 0 2px #fee2e2" : "0 0 0 2px #e2f0ee"
}

function applyBlurStyle(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
  e.target.style.border = hasError ? "1px solid #fca5a5" : "0.5px solid #e5e2dc"
  e.target.style.boxShadow = "none"
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formState, setFormState] = useState<FormState>("idle")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState("")
  const [formRef, animateForm] = useAnimate()

  const strength = getPasswordStrength(password)
  const isLoading = formState === "loading"
  const isSuccess = formState === "success"

  const clearError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(nombre, apellido, email, password, confirm)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      animateForm(formRef.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
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
      animateForm(formRef.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
      return
    }

    setFormState("success")
    setTimeout(() => router.push("/onboarding"), 800)
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left column ── */}
      <motion.div
        className="hidden lg:flex flex-col w-[45%] min-h-screen p-10 relative overflow-hidden"
        style={{ backgroundColor: "#0d0d0d" }}
        variants={colContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="flex-none" variants={colItem}>
          <Logo variant="white" size="md" />
        </motion.div>

        <motion.div className="flex-1 flex items-center justify-center" variants={colItem}>
          <div className="max-w-[320px]">
            <blockquote>
              <p className="text-[22px] leading-[1.5] font-normal italic" style={{ color: "#f9f9f7" }}>
                &ldquo;Cada ajolote registrado es un dato que la ciencia puede usar para salvar a la especie.&rdquo;
              </p>
              <footer className="mt-6">
                <span className="text-[11px]" style={{ color: "#9a958f" }}>
                  — Axo. Trazabilidad genética para <em>Ambystoma mexicanum.</em>
                </span>
              </footer>
            </blockquote>
          </div>
        </motion.div>

        <motion.div className="flex-none pb-8" variants={colItem}>
          <StepIndicator />
        </motion.div>
      </motion.div>

      {/* ── Right column ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: "#f9f9f7" }}
      >
        <div className="min-h-full flex items-center justify-center px-6 py-10 lg:px-16">
        <motion.div
          className="w-full max-w-[400px]"
          variants={formContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile: logo */}
          <motion.div className="flex justify-center mb-8 lg:hidden" variants={formItem}>
            <Logo variant="teal" size="md" />
          </motion.div>

          {/* Header */}
          <motion.div className="mb-9" variants={formItem}>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
              Crea tu cuenta
            </h1>
            <p className="mt-1.5 text-[13px]" style={{ color: "#9a958f" }}>
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/auth/login"
                className="font-medium transition-colors duration-150"
                style={{ color: "#1a6560" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
              >
                Iniciar sesión
              </Link>
            </p>
          </motion.div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name row */}
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={formItem}>
              <FormField
                id="nombre"
                label="Nombre"
                type="text"
                autoComplete="given-name"
                placeholder="Ana"
                value={nombre}
                onChange={(v) => { setNombre(v); clearError("nombre") }}
                error={fieldErrors.nombre}
                disabled={isLoading || isSuccess}
              />
              <FormField
                id="apellido"
                label="Apellido"
                type="text"
                autoComplete="family-name"
                placeholder="López"
                value={apellido}
                onChange={(v) => { setApellido(v); clearError("apellido") }}
                error={fieldErrors.apellido}
                disabled={isLoading || isSuccess}
              />
            </motion.div>

            {/* Email */}
            <motion.div variants={formItem}>
              <FormField
                id="email"
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                placeholder="tu@institucion.mx"
                value={email}
                onChange={(v) => { setEmail(v); clearError("email") }}
                error={fieldErrors.email}
                disabled={isLoading || isSuccess}
              />
            </motion.div>

            {/* Password */}
            <motion.div className="space-y-1.5" variants={formItem}>
              <label htmlFor="password" className="text-[13px] font-medium" style={{ color: "#3c3a36" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading || isSuccess}
                  value={password}
                  placeholder="Mínimo 8 caracteres"
                  onChange={(e) => { setPassword(e.target.value); clearError("password") }}
                  className="w-full pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={inputStyle(!!fieldErrors.password)}
                  onFocus={(e) => applyFocusStyle(e, !!fieldErrors.password)}
                  onBlur={(e) => applyBlurStyle(e, !!fieldErrors.password)}
                />
                <motion.button
                  type="button"
                  tabIndex={-1}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5"
                  style={{ color: "#9a958f" }}
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </motion.button>
              </div>

              <AnimatePresence>
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: "hidden" }}
                  >
                    <PasswordStrengthBar strength={strength} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {fieldErrors.password && (
                  <motion.div variants={errorItem} initial="hidden" animate="visible" exit="exit" style={{ overflow: "hidden" }}>
                    <FieldError message={fieldErrors.password} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Confirm password */}
            <motion.div className="space-y-1.5" variants={formItem}>
              <label htmlFor="confirm" className="block text-[13px] font-medium" style={{ color: "#3c3a36" }}>
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading || isSuccess}
                  value={confirm}
                  placeholder="Repite tu contraseña"
                  onChange={(e) => { setConfirm(e.target.value); clearError("confirm") }}
                  className="w-full pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={inputStyle(!!fieldErrors.confirm)}
                  onFocus={(e) => applyFocusStyle(e, !!fieldErrors.confirm)}
                  onBlur={(e) => applyBlurStyle(e, !!fieldErrors.confirm)}
                />
                <motion.button
                  type="button"
                  tabIndex={-1}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5"
                  style={{ color: "#9a958f" }}
                  aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {confirm.length > 0 && !fieldErrors.confirm && (
                  <motion.div
                    key="match"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <MatchIndicator matches={password === confirm} />
                  </motion.div>
                )}
                {fieldErrors.confirm && (
                  <motion.div
                    key="error"
                    variants={errorItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ overflow: "hidden" }}
                  >
                    <FieldError message={fieldErrors.confirm} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Server error */}
            <AnimatePresence>
              {serverError && !Object.keys(fieldErrors).length && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] text-[13px]"
                    role="alert"
                    style={{ backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}
                  >
                    <AlertIcon className="mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div className="pt-3" variants={formItem}>
              <SubmitButton
                state={formState}
                canSubmit={!!nombre.trim() && !!apellido.trim() && !!email.trim() && !!password && !!confirm}
              />
            </motion.div>
          </form>

          {/* Legal */}
          <motion.p className="mt-7 text-center text-[11px] leading-[1.5]" style={{ color: "#9a958f" }} variants={formItem}>
            Al crear una cuenta aceptas los{" "}
            <Link href="/terminos" className="transition-colors duration-150" style={{ color: "#1a6560" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
            >Términos de uso</Link>{" "}y la{" "}
            <Link href="/privacidad" className="transition-colors duration-150" style={{ color: "#1a6560" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
            >Política de privacidad</Link>{" "}de Axo y AMOXTLI.
          </motion.p>
        </motion.div>
        </div>
      </div>

      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0d0d0d !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormField({
  id, label, type, autoComplete, placeholder, value, onChange, error, disabled,
}: {
  id: string; label: string; type: string; autoComplete: string; placeholder: string
  value: string; onChange: (v: string) => void; error?: string; disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium" style={{ color: "#3c3a36" }}>
        {label}
      </label>
      <input
        id={id} type={type} autoComplete={autoComplete} required disabled={disabled}
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
        style={inputStyle(!!error)}
        onFocus={(e) => applyFocusStyle(e, !!error)}
        onBlur={(e) => applyBlurStyle(e, !!error)}
      />
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.16 }}
            style={{ overflow: "hidden" }}
          >
            <FieldError message={error} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <XSmallIcon />
      <span className="text-[11px]" style={{ color: "#991b1b" }}>{message}</span>
    </div>
  )
}

function PasswordStrengthBar({ strength }: { strength: 0 | 1 | 2 | 3 | 4 }) {
  const color = STRENGTH_COLORS[strength]
  const label = STRENGTH_LABELS[strength]
  return (
    <div className="mt-2">
      <div className="flex gap-[3px] mb-1">
        {[1, 2, 3, 4].map((seg) => (
          <motion.div
            key={seg}
            className="flex-1 rounded-[2px]"
            style={{ height: "3px" }}
            animate={{ backgroundColor: seg <= strength ? color : "#e5e2dc" }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {strength > 0 && (
          <motion.div
            key={strength}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="flex justify-end"
          >
            <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MatchIndicator({ matches }: { matches: boolean }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      {matches ? (
        <><CheckSmallIcon color="#15803d" /><span className="text-[10px]" style={{ color: "#15803d" }}>Las contraseñas coinciden</span></>
      ) : (
        <><XSmallIcon color="#991b1b" /><span className="text-[10px]" style={{ color: "#991b1b" }}>Las contraseñas no coinciden</span></>
      )}
    </div>
  )
}

function SubmitButton({ state, canSubmit }: { state: FormState; canSubmit: boolean }) {
  const isLoading = state === "loading"
  const isSuccess = state === "success"
  const isDisabled = !canSubmit || isLoading || isSuccess

  const bg = isDisabled && !isLoading && !isSuccess ? "#9a958f" : isSuccess ? "#15803d" : "#1a6560"

  return (
    <motion.button
      type="submit"
      disabled={isDisabled}
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      className="w-full flex items-center justify-center gap-2 text-[13px] font-medium rounded-[8px] transition-colors duration-200 disabled:cursor-not-allowed"
      style={{ height: "44px", backgroundColor: bg, color: "#f9f9f7" }}
      onMouseEnter={(e) => { if (canSubmit && !isLoading && !isSuccess) e.currentTarget.style.backgroundColor = "#144f4b" }}
      onMouseLeave={(e) => { if (canSubmit && !isLoading && !isSuccess) e.currentTarget.style.backgroundColor = "#1a6560" }}
    >
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.span key="loading" className="flex items-center gap-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Spinner /> Creando cuenta...
          </motion.span>
        )}
        {isSuccess && (
          <motion.span key="success" className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <CheckIcon /> ¡Cuenta creada!
          </motion.span>
        )}
        {!isLoading && !isSuccess && (
          <motion.span key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            Crear cuenta
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function StepIndicator() {
  const steps = [
    { n: 1, label: "Crear cuenta", active: true },
    { n: 2, label: "Configurar refugio", active: false },
    { n: 3, label: "Listo", active: false },
  ]
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.n}>
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={step.active ? { backgroundColor: "#1a6560" } : { border: "0.5px solid #3c3a36" }}
            >
              <span className="text-[11px] leading-none"
                style={{ fontFamily: "var(--font-dm-mono), monospace", color: step.active ? "#f9f9f7" : "#9a958f" }}>
                {step.n}
              </span>
            </div>
            <span className="text-[12px]" style={{ fontWeight: step.active ? 500 : 400, color: step.active ? "#f9f9f7" : "#9a958f" }}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="ml-[9px] my-1" style={{ width: "2px", height: "20px", borderLeft: "2px dashed rgba(255,255,255,0.12)" }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CheckSmallIcon({ color }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XSmallIcon({ color }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color ?? "#991b1b"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  )
}

