"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence, useAnimate } from "framer-motion"
import { Logo } from "@/components/Logo"
import { createClient } from "@/src/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "A" | "B"
type TokenStatus = "loading" | "valid" | "expired" | "used"
type OtpStatus = "idle" | "submitting" | "wrong" | "expired" | "locked" | "success"
type StepState = "inactive" | "active" | "done"

interface Invitation {
  email: string
  rol: string
  otp_expires_at: string | null
  locked: boolean
  refugio: { nombre: string; tipo: string; ciudad: string }
  inviter_name: string
  inviter_initials: string
}

// ── Variants ──────────────────────────────────────────────────────────────────

const colContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
const colItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "#e5e2dc" }
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const long = pwd.length >= 8
  if (!long) return { score: 1, label: "Débil", color: "#991b1b" }
  if (!hasUpper && !hasNumber) return { score: 2, label: "Aceptable", color: "#92400e" }
  if (hasUpper && hasNumber) return { score: 4, label: "Segura", color: "#15803d" }
  return { score: 3, label: "Fuerte", color: "#1a6560" }
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!expiresAt) { setRemaining(0); return }
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const m = Math.floor(remaining / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return {
    remaining,
    formatted: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    isExpired: remaining === 0 && !!expiresAt,
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
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

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckSmIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckMdIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

function ClockLgIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// ── Expired view ──────────────────────────────────────────────────────────────

function ExpiredTokenView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#f9f9f7" }}>
      <motion.div
        className="text-center max-w-[320px]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ color: "#e5e2dc", display: "inline-block" }}>
          <ClockLgIcon />
        </div>
        <h2 className="mt-4 text-[20px] font-medium" style={{ color: "#0d0d0d" }}>
          Esta invitación expiró
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#9a958f" }}>
          Los enlaces son válidos 7 días. Pide una nueva invitación al administrador.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 flex items-center justify-center w-full h-10 rounded-[8px] text-[13px] font-medium"
          style={{ backgroundColor: "#f3f2ef", color: "#3c3a36", border: "0.5px solid #e5e2dc" }}
        >
          Ir al inicio
        </Link>
      </motion.div>
    </div>
  )
}

// ── Refuge card (dark, left column) ──────────────────────────────────────────

function RefugeCard({ inv }: { inv: Invitation }) {
  return (
    <div
      className="w-full max-w-[340px] rounded-[10px] p-6"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "#1a6560" }}
      >
        Invitación a Refugio
      </p>
      <h3 className="mt-3 text-[22px] font-medium" style={{ color: "#f9f9f7" }}>
        {inv.refugio.nombre}
      </h3>
      <p className="mt-1 text-[12px]" style={{ color: "#9a958f" }}>
        {inv.refugio.tipo} · {inv.refugio.ciudad}
      </p>
      <div className="my-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: "#9a958f" }}>Tu rol en este refugio</span>
        <span
          className="px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium"
          style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}
        >
          {cap(inv.rol)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(26,101,96,0.3)" }}
        >
          <span
            className="text-[11px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "#1a6560" }}
          >
            {inv.inviter_initials}
          </span>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: "#9a958f" }}>Invitado por</p>
          <p className="text-[12px]" style={{ color: "#f9f9f7" }}>{inv.inviter_name}</p>
        </div>
      </div>
    </div>
  )
}

// ── Step indicator dot ────────────────────────────────────────────────────────

function StepDot({ state, n }: { state: StepState; n: number }) {
  return (
    <motion.div
      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
      animate={{
        backgroundColor:
          state === "active" ? "#1a6560" : state === "done" ? "#15803d" : "transparent",
      }}
      transition={{ duration: 0.3 }}
      style={{
        border: state === "inactive" ? "0.5px solid rgba(255,255,255,0.2)" : "none",
      }}
    >
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CheckSmIcon color="#f9f9f7" />
          </motion.div>
        ) : (
          <motion.span
            key="num"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[11px]"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: state === "active" ? "#f9f9f7" : "#9a958f",
            }}
          >
            {n}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Step A — account creation ──────────────────────────────────────────────────

interface StepAProps {
  formRef: React.RefObject<HTMLFormElement>
  inv: Invitation
  nombre: string; setNombre: (v: string) => void
  apellido: string; setApellido: (v: string) => void
  password: string; setPassword: (v: string) => void
  confirm: string; setConfirm: (v: string) => void
  showPwd: boolean; setShowPwd: (v: boolean) => void
  error: { field: string; message: string } | null
  clearError: () => void
  isLoading: boolean
  canContinue: boolean
  onSubmit: (e: React.FormEvent) => void
}

function StepAForm({
  formRef, inv,
  nombre, setNombre, apellido, setApellido,
  password, setPassword, confirm, setConfirm,
  showPwd, setShowPwd,
  error, clearError,
  isLoading, canContinue, onSubmit,
}: StepAProps) {
  const strength = getStrength(password)
  const showMatch = confirm.length > 0
  const matches = password === confirm

  function inputStyle(field: string): React.CSSProperties {
    const isErr = error?.field === field
    return {
      backgroundColor: isErr ? "#fff8f8" : "#ffffff",
      color: "#0d0d0d",
      border: isErr ? "1px solid #fca5a5" : "0.5px solid #e5e2dc",
      outline: "none",
    }
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>, field: string) {
    const isErr = error?.field === field
    e.target.style.border = isErr ? "1px solid #fca5a5" : "1.5px solid #1a6560"
    e.target.style.boxShadow = isErr ? "0 0 0 2px #fee2e2" : "0 0 0 2px #e2f0ee"
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>, field: string) {
    const isErr = error?.field === field
    e.target.style.border = isErr ? "1px solid #fca5a5" : "0.5px solid #e5e2dc"
    e.target.style.boxShadow = "none"
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
          Crea tu cuenta
        </h1>
        <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "#9a958f" }}>
          Tu cuenta quedará vinculada a la invitación de {inv.refugio.nombre}.
        </p>
        <div className="mt-2 flex items-center gap-1.5" style={{ color: "#9a958f" }}>
          <LockIcon />
          <span className="text-[12px]">Registrándote como {inv.email}</span>
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
            Nombre
          </label>
          <input
            type="text"
            autoComplete="given-name"
            required
            disabled={isLoading}
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); clearError() }}
            placeholder="Tu nombre"
            className="w-full h-[42px] px-3 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50"
            style={inputStyle("nombre")}
            onFocus={(e) => onFocus(e, "nombre")}
            onBlur={(e) => onBlur(e, "nombre")}
          />
          <AnimatePresence>
            {error?.field === "nombre" && <FieldError message={error.message} />}
          </AnimatePresence>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
            Apellido
          </label>
          <input
            type="text"
            autoComplete="family-name"
            required
            disabled={isLoading}
            value={apellido}
            onChange={(e) => { setApellido(e.target.value); clearError() }}
            placeholder="Tu apellido"
            className="w-full h-[42px] px-3 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50"
            style={inputStyle("apellido")}
            onFocus={(e) => onFocus(e, "apellido")}
            onBlur={(e) => onBlur(e, "apellido")}
          />
          <AnimatePresence>
            {error?.field === "apellido" && <FieldError message={error.message} />}
          </AnimatePresence>
        </div>
      </div>

      {/* Password */}
      <div className="mt-4 space-y-1.5">
        <label className="block text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
          Contraseña
        </label>
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            placeholder="Mínimo 8 caracteres"
            className="w-full h-[42px] px-3 pr-10 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50"
            style={inputStyle("password")}
            onFocus={(e) => onFocus(e, "password")}
            onBlur={(e) => onBlur(e, "password")}
          />
          <motion.button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5"
            style={{ color: "#9a958f" }}
            whileTap={{ scale: 0.8 }}
            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPwd ? <EyeOffIcon /> : <EyeIcon />}
          </motion.button>
        </div>
        <AnimatePresence>
          {error?.field === "password" && <FieldError message={error.message} />}
        </AnimatePresence>

        {/* Strength bar */}
        {password && (
          <div className="mt-2">
            <div className="flex gap-[3px]">
              {[1, 2, 3, 4].map((seg) => (
                <motion.div
                  key={seg}
                  className="h-[3px] flex-1 rounded-[2px]"
                  animate={{
                    backgroundColor: strength.score >= seg ? strength.color : "#e5e2dc",
                  }}
                  transition={{ duration: 0.25 }}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={strength.label}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-1 text-[10px] text-right"
                style={{ color: strength.color }}
              >
                {strength.label}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="mt-4 space-y-1.5">
        <label className="block text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
          Confirmar contraseña
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          disabled={isLoading}
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); clearError() }}
          placeholder="Repite tu contraseña"
          className="w-full h-[42px] px-3 rounded-[8px] text-[13px] transition-all duration-150 disabled:opacity-50"
          style={inputStyle("confirm")}
          onFocus={(e) => onFocus(e, "confirm")}
          onBlur={(e) => onBlur(e, "confirm")}
        />
        <AnimatePresence>
          {error?.field === "confirm" && <FieldError message={error.message} />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showMatch && (
            <motion.div
              key={matches ? "match" : "mismatch"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 mt-1"
            >
              {matches ? (
                <>
                  <CheckSmIcon color="#15803d" />
                  <span className="text-[10px]" style={{ color: "#15803d" }}>Coinciden</span>
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px]" style={{ color: "#991b1b" }}>No coinciden</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form-level error */}
      <AnimatePresence>
        {error?.field === "form" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <p className="mt-3 text-[12px] rounded-[8px] px-3 py-2" style={{ color: "#991b1b", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              {error.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="mt-7">
        <motion.button
          type="submit"
          disabled={!canContinue || isLoading}
          whileTap={canContinue && !isLoading ? { scale: 0.97 } : {}}
          className="w-full h-11 rounded-[8px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors duration-150"
          style={{
            backgroundColor: !canContinue || isLoading ? "#e5e2dc" : "#1a6560",
            color: !canContinue || isLoading ? "#9a958f" : "#f9f9f7",
            cursor: !canContinue || isLoading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (canContinue && !isLoading) e.currentTarget.style.backgroundColor = "#144f4b"
          }}
          onMouseLeave={(e) => {
            if (canContinue && !isLoading) e.currentTarget.style.backgroundColor = "#1a6560"
          }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Spinner /> Enviando código...
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Continuar →
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Footer */}
      <p className="mt-4 text-center text-[12px]" style={{ color: "#9a958f" }}>
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/invite?token=${encodeURIComponent("")}`}
          className="transition-colors duration-150"
          style={{ color: "#1a6560" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
        >
          Inicia sesión aquí
        </Link>
      </p>
    </form>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="text-[11px]"
      style={{ overflow: "hidden", color: "#991b1b", marginTop: "4px" }}
    >
      {message}
    </motion.p>
  )
}

// ── Step B — OTP verification ─────────────────────────────────────────────────

interface StepBProps {
  otpRef: React.RefObject<HTMLDivElement>
  inv: Invitation
  otp: string[]
  otpStatus: OtpStatus
  otpMessage: string
  otpFormatted: string
  isOtpExpired: boolean
  otpFilled: boolean
  isLoading: boolean
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  onOtpChange: (i: number, v: string) => void
  onOtpKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void
  onOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  onResend: () => void
}

function StepBForm({
  otpRef, inv, otp, otpStatus, otpMessage,
  otpFormatted, isOtpExpired, otpFilled, isLoading,
  inputRefs, onOtpChange, onOtpKeyDown, onOtpPaste,
  onSubmit, onBack, onResend,
}: StepBProps) {
  const isWrong = otpStatus === "wrong"
  const isSuccess = otpStatus === "success"
  const isDisabled = isOtpExpired || otpStatus === "locked"
  const timerExpired = isOtpExpired || otpStatus === "expired"

  function boxStyle(i: number): React.CSSProperties {
    const filled = !!otp[i]
    if (isSuccess) return {
      backgroundColor: "#f0fdf4",
      border: "1.5px solid #bbf7d0",
      color: "#15803d",
      transition: "all 150ms",
    }
    if (isWrong) return {
      backgroundColor: "#fff8f8",
      border: "1px solid #fca5a5",
      color: "#991b1b",
    }
    if (isDisabled) return {
      backgroundColor: "#f3f2ef",
      border: "0.5px solid #e5e2dc",
      color: "#9a958f",
    }
    return {
      backgroundColor: "#ffffff",
      border: filled ? "1.5px solid #1a6560" : "0.5px solid #e5e2dc",
      color: "#0d0d0d",
    }
  }

  const canSubmit = otpFilled && !isLoading && !isDisabled && !isSuccess

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Header */}
      <div className="mb-9">
        <h1 className="text-[28px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
          Revisa tu correo
        </h1>
        <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "#9a958f" }}>
          Enviamos un código de 6 dígitos a{" "}
          <span className="font-medium" style={{ color: "#0d0d0d" }}>{inv.email}</span>
        </p>
        {!timerExpired && (
          <button
            type="button"
            onClick={onResend}
            className="mt-1 text-[12px] transition-colors duration-150"
            style={{ color: "#1a6560", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
          >
            ¿No llegó? Reenviar código
          </button>
        )}
      </div>

      {/* OTP boxes */}
      <div>
        <label className="block text-[12px] font-medium mb-3" style={{ color: "#0d0d0d" }}>
          Código de verificación
        </label>

        <div ref={otpRef} className="flex gap-2">
          {otp.map((digit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex-1"
            >
              <input
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                disabled={isDisabled || isSuccess}
                value={digit}
                onChange={(e) => onOtpChange(i, e.target.value)}
                onKeyDown={(e) => onOtpKeyDown(i, e)}
                onPaste={onOtpPaste}
                className="w-full h-[52px] sm:h-[60px] rounded-[8px] text-center text-[20px] sm:text-[24px] transition-all duration-150 disabled:cursor-not-allowed"
                style={{
                  ...boxStyle(i),
                  fontFamily: "'DM Mono', monospace",
                  outline: "none",
                  caretColor: "transparent",
                }}
                onFocus={(e) => {
                  if (!isWrong && !isDisabled && !isSuccess) {
                    e.target.style.border = "1.5px solid #1a6560"
                    e.target.style.boxShadow = "0 0 0 2px #e2f0ee"
                    e.target.style.outlineOffset = "0"
                  }
                }}
                onBlur={(e) => {
                  if (!isWrong && !isDisabled && !isSuccess) {
                    e.target.style.border = digit ? "1.5px solid #1a6560" : "0.5px solid #e5e2dc"
                    e.target.style.boxShadow = "none"
                  }
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Timer / status messages */}
        <div className="mt-2.5 text-center">
          <AnimatePresence mode="wait">
            {isSuccess ? null : timerExpired ? (
              <motion.p
                key="expired"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px]"
                style={{ color: "#991b1b" }}
              >
                El código expiró.
              </motion.p>
            ) : isWrong ? (
              <motion.p
                key="wrong"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px]"
                style={{ color: "#991b1b" }}
              >
                {otpMessage}
              </motion.p>
            ) : otpStatus === "locked" ? (
              <motion.p
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] leading-[1.5]"
                style={{ color: "#991b1b" }}
              >
                Demasiados intentos. Solicita una nueva invitación al administrador del refugio.
              </motion.p>
            ) : (
              <motion.p
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px]"
                style={{ color: "#9a958f" }}
              >
                El código expira en{" "}
                <span style={{ fontFamily: "'DM Mono', monospace", color: "#1a6560" }}>
                  {otpFormatted}
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Resend button when expired */}
        {timerExpired && otpStatus !== "locked" && (
          <motion.button
            type="button"
            onClick={onResend}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 w-full h-10 rounded-[8px] text-[13px] font-medium"
            style={{ border: "0.5px solid #e5e2dc", color: "#3c3a36", backgroundColor: "#f9f9f7" }}
          >
            Solicitar nuevo código
          </motion.button>
        )}
      </div>

      {/* Refuge summary card */}
      <div
        className="mt-7 flex items-center justify-between rounded-[10px] px-4 py-3.5"
        style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
      >
        <p className="text-[12px]" style={{ color: "#9a958f" }}>
          Uniéndote a ·{" "}
          <span className="font-medium" style={{ color: "#0d0d0d" }}>{inv.refugio.nombre}</span>
        </p>
        <span
          className="px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium flex-shrink-0"
          style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}
        >
          {cap(inv.rol)}
        </span>
      </div>

      {/* CTA */}
      <div className="mt-6">
        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.97 } : {}}
          className="w-full h-11 rounded-[8px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors duration-150"
          style={{
            backgroundColor: isSuccess ? "#15803d" : canSubmit ? "#1a6560" : "#e5e2dc",
            color: canSubmit || isSuccess ? "#f9f9f7" : "#9a958f",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.backgroundColor = "#144f4b" }}
          onMouseLeave={(e) => { if (canSubmit && !isSuccess) e.currentTarget.style.backgroundColor = "#1a6560" }}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="flex items-center gap-2"
              >
                <CheckMdIcon /> ¡Bienvenido a Axo!
              </motion.span>
            ) : isLoading ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Spinner /> Verificando...
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Crear cuenta y unirme
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Back link */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] transition-colors duration-150"
          style={{ color: "#9a958f", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#3c3a36")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
        >
          ← Volver y corregir mis datos
        </button>
      </div>
    </form>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InviteNewClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading")
  const [inv, setInv] = useState<Invitation | null>(null)

  const [step, setStep] = useState<Step>("A")
  const [step1, setStep1] = useState<StepState>("active")
  const [step2, setStep2] = useState<StepState>("inactive")
  const [step3, setStep3] = useState<StepState>("inactive")

  // Step A
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [stepAError, setStepAError] = useState<{ field: string; message: string } | null>(null)
  const [stepALoading, setStepALoading] = useState(false)

  // Step B
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle")
  const [otpMessage, setOtpMessage] = useState("")
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [stepBLoading, setStepBLoading] = useState(false)

  const [formARef, animateFormA] = useAnimate()
  const [otpRef, animateOtp] = useAnimate()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const { formatted: otpFormatted, isExpired: isOtpExpired } = useCountdown(otpExpiresAt)

  const canContinue =
    !!nombre.trim() && !!apellido.trim() && !!password && !!confirm

  useEffect(() => {
    if (!token) { setTokenStatus("expired"); return }
    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setTokenStatus(data.code === "USED" ? "used" : "expired")
        } else {
          setInv(data)
          setTokenStatus("valid")
        }
      })
      .catch(() => setTokenStatus("expired"))
  }, [token])

  useEffect(() => {
    if (isOtpExpired && otpStatus === "idle") setOtpStatus("expired")
  }, [isOtpExpired, otpStatus])

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setStepAError({ field: "nombre", message: "El nombre es requerido." })
      animateFormA(formARef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 })
      return
    }
    if (!apellido.trim()) {
      setStepAError({ field: "apellido", message: "El apellido es requerido." })
      animateFormA(formARef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 })
      return
    }
    if (!/(?=.*[0-9])(?=.*[A-Z]).{8,}/.test(password)) {
      setStepAError({ field: "password", message: "Mínimo 8 caracteres, 1 número y 1 mayúscula." })
      animateFormA(formARef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 })
      return
    }
    if (password !== confirm) {
      setStepAError({ field: "confirm", message: "Las contraseñas no coinciden." })
      animateFormA(formARef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 })
      return
    }

    setStepALoading(true)
    setStepAError(null)
    try {
      const res = await fetch(`/api/invitations/${token}/register`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setStepAError({ field: "form", message: data.error ?? "Error al enviar código." })
        setStepALoading(false)
        return
      }
      setOtpExpiresAt(data.otp_expires_at)
      setStepALoading(false)
      setStep("B")
      setStep1("done")
      setStep2("active")
      setTimeout(() => inputRefs.current[0]?.focus(), 320)
    } catch {
      setStepAError({ field: "form", message: "Error de conexión." })
      setStepALoading(false)
    }
  }

  function handleBack() {
    setStep("A")
    setStep1("active")
    setStep2("inactive")
    setOtp(["", "", "", "", "", ""])
    setOtpStatus("idle")
    setOtpMessage("")
  }

  async function handleResend() {
    const res = await fetch(`/api/invitations/${token}/resend`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setOtpExpiresAt(data.otp_expires_at)
      setOtp(["", "", "", "", "", ""])
      setOtpStatus("idle")
      setOtpMessage("")
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  function handleOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next)
    if (otpStatus === "wrong") setOtpStatus("idle")
    if (digit && i < 5) inputRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (otp[i]) {
        const next = [...otp]; next[i] = ""; setOtp(next)
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus()
        const next = [...otp]; next[i - 1] = ""; setOtp(next)
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputRefs.current[i - 1]?.focus()
    } else if (e.key === "ArrowRight" && i < 5) {
      inputRefs.current[i + 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const next = [...otp]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtp(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!otp.every((d) => d) || stepBLoading) return
    setStepBLoading(true)
    setOtpStatus("submitting")

    try {
      const res = await fetch(`/api/invitations/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          password,
          otp: otp.join(""),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        // Sign in the newly created user
        const supabase = createClient()
        await supabase.auth.signInWithPassword({ email: inv!.email, password })

        setOtpStatus("success")
        setStep2("done")
        setStep3("active")
        const inputs = otpRef.current?.querySelectorAll("input") ?? []
        inputs.forEach((input: Element, i: number) => {
          animateOtp(input, { scale: [1, 1.12, 0.95, 1] }, { duration: 0.4, delay: i * 0.04 })
        })
        setTimeout(() => router.push("/onboarding"), 1200)
      } else if (data.code === "WRONG_OTP") {
        const left = data.attempts_left ?? 0
        setOtpStatus("wrong")
        setOtpMessage(`Código incorrecto. Te quedan ${left} intento${left === 1 ? "" : "s"}.`)
        animateOtp(otpRef.current, { x: [0, -7, 7, -5, 5, -3, 3, 0] }, { duration: 0.45 })
        setTimeout(() => {
          setOtp(["", "", "", "", "", ""])
          setOtpStatus("idle")
          inputRefs.current[0]?.focus()
        }, 800)
      } else if (data.code === "EXPIRED") {
        setOtpStatus("expired")
      } else if (data.code === "LOCKED") {
        setOtpStatus("locked")
      } else {
        setOtpStatus("idle")
        setOtpMessage(data.error ?? "Error al verificar.")
      }
    } catch {
      setOtpStatus("idle")
      setOtpMessage("Error de conexión.")
    }
    setStepBLoading(false)
  }

  // ── Render ──

  if (tokenStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9f9f7" }}>
        <div
          className="w-5 h-5 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#1a6560" }}
        />
      </div>
    )
  }

  if (tokenStatus === "expired" || tokenStatus === "used") return <ExpiredTokenView />

  return (
    <div className="min-h-screen flex">
      {/* ── Left column ── */}
      <motion.div
        className="hidden lg:flex flex-col w-[45%] min-h-screen relative overflow-hidden"
        style={{ backgroundColor: "#0d0d0d" }}
        variants={colContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="flex-none p-8" variants={colItem}>
          <Logo variant="white" size="md" />
        </motion.div>

        <motion.div className="flex-1 flex items-center justify-center px-10" variants={colItem}>
          {inv && <RefugeCard inv={inv} />}
        </motion.div>

        <motion.div className="flex-none p-8" variants={colItem}>
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <StepDot state={step1} n={1} />
            <span
              className="text-[12px] font-medium"
              style={{ color: step1 === "inactive" ? "#9a958f" : "#f9f9f7" }}
            >
              Crear cuenta
            </span>
          </div>
          <div
            className="ml-[9px] my-1.5"
            style={{ borderLeft: "1px dashed rgba(255,255,255,0.12)", height: "20px" }}
          />
          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <StepDot state={step2} n={2} />
            <span
              className="text-[12px]"
              style={{ color: step2 === "inactive" ? "#9a958f" : "#f9f9f7" }}
            >
              Verificar código
            </span>
          </div>
          <div
            className="ml-[9px] my-1.5"
            style={{ borderLeft: "1px dashed rgba(255,255,255,0.12)", height: "20px" }}
          />
          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <StepDot state={step3} n={3} />
            <span
              className="text-[12px]"
              style={{ color: step3 === "inactive" ? "#9a958f" : "#f9f9f7" }}
            >
              Ir al refugio
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Right column ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-16"
        style={{ backgroundColor: "#f9f9f7" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <div className="flex justify-center mb-4">
              <Logo variant="teal" size="md" />
            </div>
            {inv && (
              <div
                className="rounded-[10px] p-3.5"
                style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
              >
                <p className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>
                  Invitación de {inv.refugio.nombre}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px]" style={{ color: "#9a958f" }}>Tu rol:</span>
                  <span
                    className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                    style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}
                  >
                    {cap(inv.rol)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {([step1, step2, step3] as StepState[]).map((s, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      s === "active" || s === "done" ? "#1a6560" : "#e5e2dc",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Steps */}
          <AnimatePresence mode="wait">
            {step === "A" ? (
              <motion.div
                key="A"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {inv && (
                  <StepAForm
                    formRef={formARef}
                    inv={inv}
                    nombre={nombre} setNombre={setNombre}
                    apellido={apellido} setApellido={setApellido}
                    password={password} setPassword={setPassword}
                    confirm={confirm} setConfirm={setConfirm}
                    showPwd={showPwd} setShowPwd={setShowPwd}
                    error={stepAError}
                    clearError={() => setStepAError(null)}
                    isLoading={stepALoading}
                    canContinue={canContinue}
                    onSubmit={handleContinue}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="B"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {inv && (
                  <StepBForm
                    otpRef={otpRef}
                    inv={inv}
                    otp={otp}
                    otpStatus={otpStatus}
                    otpMessage={otpMessage}
                    otpFormatted={otpFormatted}
                    isOtpExpired={isOtpExpired && otpStatus !== "success"}
                    otpFilled={otp.every((d) => !!d)}
                    isLoading={stepBLoading}
                    inputRefs={inputRefs}
                    onOtpChange={handleOtpChange}
                    onOtpKeyDown={handleOtpKeyDown}
                    onOtpPaste={handleOtpPaste}
                    onSubmit={handleComplete}
                    onBack={handleBack}
                    onResend={handleResend}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
