"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useAnimate } from "framer-motion"
import { createClient } from "@/src/lib/supabase/client"
import { Logo } from "@/components/Logo"

type FormState = "idle" | "loading" | "error"

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [state, setState] = useState<FormState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formRef, animateForm] = useAnimate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setState("error")
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos"
          : error.message
      )
      animateForm(formRef.current, { x: [0, -6, 6, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
      return
    }

    router.push("/dashboard")
  }

  const isLoading = state === "loading"
  const hasError = state === "error"

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
          <blockquote className="max-w-[340px]">
            <p className="text-[22px] leading-[1.45] font-normal italic" style={{ color: "#c8c4bc" }}>
              &ldquo;La única forma de proteger al axolote es conocerlo mejor que nadie.&rdquo;
            </p>
            <footer className="mt-5 flex items-center gap-3">
              <div className="w-8 h-[1px]" style={{ backgroundColor: "#3c3a36" }} />
              <span className="text-[13px]" style={{ color: "#9a958f" }}>Equipo AMOXTLI</span>
            </footer>
          </blockquote>
        </motion.div>

        <motion.div className="flex-none space-y-2" variants={colItem}>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] tracking-widest uppercase font-medium" style={{ color: "#3c3a36" }}>
              Verificado por
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {["UNAM", "UAM-Xochimilco", "SEMARNAT UMA"].map((name) => (
              <span
                key={name}
                className="text-[12px] font-medium px-2.5 py-1 rounded-[6px]"
                style={{ color: "#9a958f", border: "1px solid #1e1e1c", backgroundColor: "#111110" }}
              >
                {name}
              </span>
            ))}
          </div>
          <p className="text-[11px] pt-2" style={{ color: "#3c3a36" }}>
            © 2026 AMOXTLI · Todos los derechos reservados
          </p>
        </motion.div>
      </motion.div>

      {/* ── Right column ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ backgroundColor: "#f9f9f7" }}>
        <motion.div
          className="w-full max-w-[400px] lg:max-w-[380px]"
          variants={formContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo */}
          <motion.div className="flex justify-center mb-8 lg:hidden" variants={formItem}>
            <Logo variant="teal" size="md" />
          </motion.div>

          {/* Heading */}
          <motion.div className="mb-8" variants={formItem}>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
              Bienvenido de vuelta
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: "#9a958f" }}>
              Ingresa tus datos para acceder a tu refugio
            </p>
          </motion.div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <motion.div className="space-y-1.5" variants={formItem}>
              <label htmlFor="email" className="block text-[13px] font-medium" style={{ color: "#3c3a36" }}>
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (hasError) setState("idle") }}
                placeholder="tu@correo.com"
                className="w-full h-11 px-3 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0d0d0d",
                  border: hasError ? "1.5px solid #991b1b" : "1.5px solid #e5e2dc",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #1a6560"
                  e.target.style.boxShadow = hasError ? "0 0 0 2px #fee2e2" : "0 0 0 2px #e2f0ee"
                }}
                onBlur={(e) => {
                  e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #e5e2dc"
                  e.target.style.boxShadow = "none"
                }}
              />
            </motion.div>

            {/* Password */}
            <motion.div className="space-y-1.5" variants={formItem}>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium" style={{ color: "#3c3a36" }}>
                  Contraseña
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-[12px] transition-colors duration-150"
                  style={{ color: "#9a958f" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1a6560")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (hasError) setState("idle") }}
                  placeholder="••••••••"
                  className="w-full h-11 px-3 pr-10 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0d0d0d",
                    border: hasError ? "1.5px solid #991b1b" : "1.5px solid #e5e2dc",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #1a6560"
                    e.target.style.boxShadow = hasError ? "0 0 0 2px #fee2e2" : "0 0 0 2px #e2f0ee"
                  }}
                  onBlur={(e) => {
                    e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #e5e2dc"
                    e.target.style.boxShadow = "none"
                  }}
                />
                <motion.button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5"
                  style={{ color: "#9a958f" }}
                  whileTap={{ scale: 0.8 }}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </motion.button>
              </div>
            </motion.div>

            {/* Error banner */}
            <AnimatePresence>
              {hasError && errorMsg && (
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
                    <span>{errorMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div variants={formItem}>
              <motion.button
                type="submit"
                disabled={isLoading || !email || !password}
                whileTap={!isLoading && email && password ? { scale: 0.97 } : {}}
                className="w-full h-11 rounded-[8px] text-[13px] font-medium transition-colors duration-150 flex items-center justify-center gap-2 mt-2"
                style={{
                  backgroundColor: isLoading || !email || !password ? "#9a958f" : "#1a6560",
                  color: "#f9f9f7",
                  cursor: isLoading || !email || !password ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && email && password)
                    e.currentTarget.style.backgroundColor = "#144f4b"
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && email && password)
                    e.currentTarget.style.backgroundColor = "#1a6560"
                }}
              >
                {isLoading ? <><Spinner /> Ingresando...</> : "Ingresar"}
              </motion.button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.p className="mt-8 text-center text-[13px]" style={{ color: "#9a958f" }} variants={formItem}>
            ¿No tienes cuenta?{" "}
            <Link
              href="/auth/register"
              className="font-medium transition-colors duration-150"
              style={{ color: "#1a6560" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
            >
              Crear cuenta
            </Link>
          </motion.p>
        </motion.div>
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
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

