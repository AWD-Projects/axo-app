"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence, useAnimate } from "framer-motion"
import { Check, Clock, Loader2, ArrowLeft } from "lucide-react"
import { createClient } from "@/src/lib/supabase/client"
import { Logo } from "@/components/Logo"

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvitationData {
  email: string
  rol: string
  otp_expires_at: string | null
  locked: boolean
  refugio: { nombre: string; tipo: string | null; ciudad: string | null }
  inviter_name: string | null
  inviter_initials: string | null
}

type PageState = "fetching" | "valid" | "expired_token" | "not_found"
type OtpState = "idle" | "verifying" | "success" | "wrong" | "expired_otp" | "locked"

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeRol(rol: string): string {
  const map: Record<string, string> = {
    admin: "Administrador", tecnico: "Técnico", investigador: "Investigador",
    estudiante: "Estudiante", lectura: "Solo lectura",
  }
  return map[rol] ?? rol.charAt(0).toUpperCase() + rol.slice(1)
}

function normalizeType(tipo: string | null): string {
  if (!tipo) return ""
  const map: Record<string, string> = {
    laboratorio_academico: "Laboratorio académico", uma_privada: "UMA privada",
    zoo: "Zoológico", acuario: "Acuario", investigacion: "Centro de investigación",
  }
  return map[tipo] ?? tipo
}

function formatTimer(seconds: number): { text: string; color: string } {
  if (seconds <= 0) return { text: "00:00", color: "#991b1b" }
  if (seconds < 60) return { text: "Menos de 1 minuto", color: "#9a958f" }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return { text: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, color: "#9a958f" }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function InviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [pageState, setPageState] = useState<PageState>("fetching")
  const [invData, setInvData] = useState<InvitationData | null>(null)
  const [hasAccount, setHasAccount] = useState<boolean | null>(null) // null = not chosen yet
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)
  const [otpState, setOtpState] = useState<OtpState>("idle")
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [secondsLeft, setSecondsLeft] = useState(900)
  const [showResent, setShowResent] = useState(false)
  const [resentLoading, setResentLoading] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])
  const [otpRef, animateOtp] = useAnimate()

  // Fetch invitation + check session
  useEffect(() => {
    if (!token) { setPageState("not_found"); return }

    const supabase = createClient()
    Promise.all([
      fetch(`/api/invitations/${token}`),
      supabase.auth.getSession(),
    ]).then(async ([res, { data: { session } }]) => {
      const json = await res.json()
      if (!res.ok) {
        setPageState(json.code === "EXPIRED" || json.code === "USED" ? "expired_token" : "not_found")
        return
      }
      setInvData(json.data)
      setPageState("valid")
      if (json.data.locked) setOtpState("locked")
      // If already logged in, skip the account choice
      if (session) setHasAccount(true)
    }).catch(() => setPageState("not_found"))
  }, [token])

  // Countdown timer
  useEffect(() => {
    if (!invData?.otp_expires_at) return
    const calc = () => Math.max(0, Math.floor((new Date(invData.otp_expires_at!).getTime() - Date.now()) / 1000))
    setSecondsLeft(calc())
    const id = setInterval(() => {
      const s = calc()
      setSecondsLeft(s)
      if (s === 0) {
        clearInterval(id)
        setOtpState((prev) => (prev === "idle" ? "expired_otp" : prev))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [invData?.otp_expires_at])

  // Animate OTP boxes on state change
  useEffect(() => {
    if (!otpRef.current) return
    if (otpState === "wrong") {
      animateOtp(otpRef.current, { x: [0, -7, 7, -5, 5, -3, 3, 0] }, { duration: 0.4, ease: "easeInOut" })
    }
    if (otpState === "success") {
      const inputs = otpRef.current.querySelectorAll("input")
      inputs.forEach((input: Element, i: number) => {
        animateOtp(input, { scale: [1, 1.12, 0.95, 1] }, { duration: 0.35, delay: i * 0.04, ease: "easeOut" })
      })
    }
  }, [otpState, animateOtp, otpRef])

  // ── OTP handlers ─────────────────────────────────────────────────────────────

  const isBoxDisabled = otpState === "verifying" || otpState === "success" || otpState === "locked" || otpState === "expired_otp"

  const handleDigitChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setDigits((prev) => { const next = [...prev]; next[index] = digit; return next })
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }, [])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => { const n = [...prev]; n[index] = ""; return n })
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus()
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "")
    setDigits(next)
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────────

  const isOtpComplete = digits.every(Boolean)

  async function handleSubmit() {
    if (!isOtpComplete || otpState === "verifying" || otpState === "success") return
    setOtpState("verifying")
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, otp: digits.join(""), es_usuario_existente: true }),
    })
    const json = await res.json()
    if (res.ok) { setOtpState("success"); setTimeout(() => router.push("/dashboard"), 600); return }
    if (res.status === 429 || json.error?.includes("Demasiados")) { setOtpState("locked"); return }
    if (json.error?.includes("expiró") || json.error?.includes("OTP")) { setOtpState("expired_otp"); return }
    const remaining = json.intentos_restantes ?? attemptsLeft - 1
    setAttemptsLeft(remaining)
    setOtpState("wrong")
    setTimeout(() => { setDigits(["", "", "", "", "", ""]); setOtpState("idle"); inputRefs.current[0]?.focus() }, 800)
  }

  // ── Resend ────────────────────────────────────────────────────────────────────

  async function handleResend() {
    if (resentLoading) return
    setResentLoading(true)
    try {
      const res = await fetch(`/api/invitations/${token}/resend`, { method: "POST" })
      const json = await res.json()
      if (res.ok && json.otp_expires_at) {
        setInvData((prev) => prev ? { ...prev, otp_expires_at: json.otp_expires_at } : prev)
        setOtpState("idle"); setDigits(["", "", "", "", "", ""]); setSecondsLeft(900)
        setShowResent(true); setTimeout(() => setShowResent(false), 3000)
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } finally { setResentLoading(false) }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const timer = formatTimer(secondsLeft)
  const rolLabel = invData ? normalizeRol(invData.rol) : ""

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
          {pageState === "fetching" ? (
            <div
              className="w-full max-w-[320px] rounded-[10px] p-6 animate-pulse"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
            >
              <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <div className="h-6 w-40 rounded mb-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <div className="h-3 w-32 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
            </div>
          ) : invData ? (
            <RefugeCard refugio={invData.refugio} rol={rolLabel} inviterName={invData.inviter_name} inviterInitials={invData.inviter_initials} />
          ) : null}
        </motion.div>

        <motion.div className="flex-none p-8" variants={colItem}>
          <InviteStepIndicator />
        </motion.div>
      </motion.div>

      {/* ── Right column ── */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#f9f9f7" }}>
        <div className="min-h-full flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile: logo + refuge name */}
          <div className="flex flex-col items-center gap-1 mb-8 lg:hidden">
            <Logo variant="teal" size="md" />
            {invData && <p className="text-[13px] text-center mt-1" style={{ color: "#9a958f" }}>Invitación de {invData.refugio.nombre}</p>}
          </div>

          {/* Fetching */}
          {pageState === "fetching" && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin" color="#1a6560" />
            </div>
          )}

          {/* Expired / not found */}
          {(pageState === "expired_token" || pageState === "not_found") && <ExpiredTokenContent />}

          {/* Account choice */}
          {pageState === "valid" && invData && hasAccount === null && (
            <motion.div variants={formContainer} initial="hidden" animate="visible">
              <motion.div className="mb-8" variants={formItem}>
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
                  Acepta tu invitación
                </h1>
                <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "#9a958f" }}>
                  Para unirte a <span className="font-medium" style={{ color: "#3c3a36" }}>{invData.refugio.nombre}</span>, primero dinos si ya tienes una cuenta.
                </p>
              </motion.div>

              <motion.div className="flex flex-col gap-3" variants={formItem}>
                <button
                  type="button"
                  onClick={() => setHasAccount(true)}
                  className="w-full text-left rounded-[10px] px-5 py-4 transition-colors duration-150"
                  style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#1a6560")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e2dc")}
                >
                  <p className="text-[14px] font-medium" style={{ color: "#0d0d0d" }}>Ya tengo una cuenta</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#9a958f" }}>Ingresa tu código OTP y accede directamente.</p>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/invite/new?token=${token}`)}
                  className="w-full text-left rounded-[10px] px-5 py-4 transition-colors duration-150"
                  style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#1a6560")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e2dc")}
                >
                  <p className="text-[14px] font-medium" style={{ color: "#0d0d0d" }}>No tengo cuenta</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#9a958f" }}>Crea tu cuenta con el código que recibiste.</p>
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* OTP form */}
          {pageState === "valid" && invData && hasAccount === true && (
            <motion.div variants={formContainer} initial="hidden" animate="visible">
              {/* Header */}
              <motion.div className="mb-9" variants={formItem}>
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
                  Confirma tu identidad
                </h1>
                <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "#9a958f" }}>
                  Ingresa el código de 6 dígitos que enviamos a{" "}
                  <span className="font-medium" style={{ color: "#3c3a36" }}>{invData.email}</span>
                </p>
                <div className="mt-1.5">
                  {showResent ? (
                    <motion.span
                      key="sent"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: "#15803d" }}
                    >
                      <Check size={12} /> Código enviado
                    </motion.span>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleResend}
                      disabled={resentLoading || otpState === "locked"}
                      whileTap={{ scale: 0.95 }}
                      className="text-[12px] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: "#1a6560" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
                    >
                      {resentLoading ? "Enviando..." : "¿No lo recibiste? Reenviar código"}
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* OTP boxes */}
              <motion.div variants={formItem}>
                <p className="text-[12px] font-medium mb-3" style={{ color: "#0d0d0d" }}>
                  Código de verificación
                </p>

                <div ref={otpRef} className="flex gap-2">
                  {digits.map((digit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                      style={{ flex: 1 }}
                    >
                      <input
                        ref={(el) => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        disabled={isBoxDisabled}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        onFocus={() => setFocusedIdx(i)}
                        onBlur={() => setFocusedIdx(null)}
                        className="w-full h-[52px] sm:h-[60px] text-[20px] sm:text-[24px] text-center transition-all duration-150 disabled:cursor-not-allowed"
                        style={{
                          borderRadius: "8px",
                          fontFamily: "var(--font-dm-mono), monospace",
                          fontWeight: 500,
                          outline: "none",
                          ...getOtpBoxStyle(focusedIdx === i, otpState),
                        }}
                        aria-label={`Dígito ${i + 1} de 6`}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Timer */}
                <div className="mt-2.5 text-center">
                  {otpState !== "locked" && (
                    <span className="text-[11px]" style={{ color: "#9a958f" }}>
                      El código expira en{" "}
                      <span className="font-medium" style={{ fontFamily: "var(--font-dm-mono), monospace", color: timer.color }}>
                        {timer.text}
                      </span>
                      {secondsLeft > 0 && " minutos"}
                    </span>
                  )}
                </div>

                {/* State messages */}
                <AnimatePresence mode="wait">
                  {otpState === "wrong" && (
                    <motion.p key="wrong" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 text-[11px] text-center" style={{ color: "#991b1b" }}>
                      Código incorrecto.{attemptsLeft > 0 ? ` Te quedan ${attemptsLeft} intento${attemptsLeft !== 1 ? "s" : ""}.` : ""}
                    </motion.p>
                  )}
                  {otpState === "expired_otp" && (
                    <motion.div key="expired" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <p className="mt-2 text-[11px] text-center" style={{ color: "#991b1b" }}>El código expiró.</p>
                      <motion.button
                        type="button" onClick={handleResend} disabled={resentLoading}
                        whileTap={{ scale: 0.97 }}
                        className="mt-3 w-full rounded-[8px] text-[13px] font-medium transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ height: "40px", backgroundColor: "#ffffff", color: "#3c3a36", border: "0.5px solid #e5e2dc" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f2ef")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                      >
                        {resentLoading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : "Solicitar nuevo código"}
                      </motion.button>
                    </motion.div>
                  )}
                  {otpState === "locked" && (
                    <motion.p key="locked" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-[12px] text-center leading-[1.5]" style={{ color: "#991b1b" }}>
                      Demasiados intentos fallidos.<br />
                      Solicita una nueva invitación al administrador del refugio.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Refuge summary */}
              <motion.div
                className="mt-7 rounded-[10px] px-4 py-3.5 flex items-center justify-between"
                style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
                variants={formItem}
              >
                <div>
                  <p className="text-[11px] mb-0.5" style={{ color: "#9a958f" }}>Uniéndote a</p>
                  <p className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>{invData.refugio.nombre}</p>
                </div>
                <RoleBadge rol={rolLabel} />
              </motion.div>

              {/* CTA */}
              <motion.div className="mt-6" variants={formItem}>
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isOtpComplete || isBoxDisabled}
                  whileTap={isOtpComplete && !isBoxDisabled ? { scale: 0.97 } : {}}
                  className="w-full flex items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium transition-colors duration-200"
                  style={{
                    height: "44px",
                    backgroundColor: getCTABg(otpState, isOtpComplete),
                    color: getCTAColor(otpState, isOtpComplete),
                    cursor: !isOtpComplete || isBoxDisabled ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (isOtpComplete && !isBoxDisabled) e.currentTarget.style.backgroundColor = "#144f4b" }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = getCTABg(otpState, isOtpComplete) }}
                >
                  <AnimatePresence mode="wait">
                    {otpState === "verifying" && (
                      <motion.span key="v" className="flex items-center gap-2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                        <Loader2 size={16} className="animate-spin" /> Verificando...
                      </motion.span>
                    )}
                    {otpState === "success" && (
                      <motion.span key="s" className="flex items-center gap-2"
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                        <Check size={16} /> ¡Verificado!
                      </motion.span>
                    )}
                    {otpState !== "verifying" && otpState !== "success" && (
                      <motion.span key="idle"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                        Unirme al refugio
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              {/* Footer links */}
              <motion.div className="mt-4 flex flex-col items-center gap-2" variants={formItem}>
                <motion.button
                  type="button"
                  onClick={() => setHasAccount(null)}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 text-[12px] transition-colors duration-150"
                  style={{ color: "#9a958f" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#3c3a36")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
                >
                  <ArrowLeft size={14} /> Volver
                </motion.button>
                <p className="text-[12px] text-center" style={{ color: "#9a958f" }}>
                  ¿Esta invitación no es para ti?{" "}
                  <motion.button
                    type="button" onClick={handleSignOut} whileTap={{ scale: 0.95 }}
                    className="font-medium transition-colors duration-150"
                    style={{ color: "#1a6560" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#144f4b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#1a6560")}
                  >
                    Cerrar sesión
                  </motion.button>
                </p>
              </motion.div>
            </motion.div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function getOtpBoxStyle(isFocused: boolean, state: OtpState): React.CSSProperties {
  if (state === "success") return { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }
  if (state === "wrong") return { backgroundColor: "#fff8f8", border: "1px solid #fca5a5", color: "#991b1b" }
  if (state === "verifying" || state === "locked" || state === "expired_otp")
    return { backgroundColor: "#f3f2ef", border: "0.5px solid #e5e2dc", color: "#9a958f" }
  if (isFocused) return { backgroundColor: "#ffffff", border: "1.5px solid #1a6560", boxShadow: "0 0 0 2px #e2f0ee", color: "#0d0d0d" }
  return { backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", color: "#0d0d0d" }
}

function getCTABg(state: OtpState, isComplete: boolean): string {
  if (state === "success") return "#15803d"
  if (!isComplete || state === "verifying" || state === "locked" || state === "expired_otp") return "#e5e2dc"
  return "#1a6560"
}

function getCTAColor(state: OtpState, isComplete: boolean): string {
  if (!isComplete || state === "verifying" || state === "locked" || state === "expired_otp") return "#9a958f"
  return "#f9f9f7"
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RefugeCard({ refugio, rol, inviterName, inviterInitials }: {
  refugio: InvitationData["refugio"]; rol: string
  inviterName: string | null; inviterInitials: string | null
}) {
  const typeLabel = normalizeType(refugio.tipo)
  const subtitle = [typeLabel, refugio.ciudad].filter(Boolean).join(" · ")
  return (
    <div className="w-full max-w-[320px] rounded-[10px] p-6"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[10px] font-medium tracking-[0.08em] uppercase" style={{ color: "#1a6560" }}>
        Invitación a refugio
      </p>
      <h2 className="mt-3 text-[22px] font-medium leading-[1.2]" style={{ color: "#f9f9f7" }}>{refugio.nombre}</h2>
      {subtitle && <p className="mt-1 text-[12px]" style={{ color: "#9a958f" }}>{subtitle}</p>}
      <div className="my-4" style={{ height: "0.5px", backgroundColor: "rgba(255,255,255,0.08)" }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: "#9a958f" }}>Tu rol en este refugio</span>
        <RoleBadge rol={rol} />
      </div>
      {inviterName && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "#9a958f" }}>Invitado por</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(26,101,96,0.3)" }}>
              <span className="text-[10px] font-medium" style={{ color: "#1a6560", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                {inviterInitials}
              </span>
            </div>
            <span className="text-[12px]" style={{ color: "#f9f9f7" }}>{inviterName}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function RoleBadge({ rol }: { rol: string }) {
  return (
    <span className="text-[11px] font-medium px-2.5 py-[3px] rounded-[6px]"
      style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}>
      {rol}
    </span>
  )
}

function InviteStepIndicator() {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#15803d" }}>
          <Check size={10} color="#f9f9f7" strokeWidth={3} />
        </div>
        <span className="text-[12px]" style={{ color: "#9a958f", textDecoration: "line-through" }}>Cuenta creada</span>
      </div>
      <Connector />
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1a6560" }}>
          <span className="text-[11px] leading-none" style={{ fontFamily: "var(--font-dm-mono), monospace", color: "#f9f9f7" }}>2</span>
        </div>
        <span className="text-[12px] font-medium" style={{ color: "#f9f9f7" }}>Verificar invitación</span>
      </div>
      <Connector />
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}>
          <span className="text-[11px] leading-none" style={{ fontFamily: "var(--font-dm-mono), monospace", color: "#9a958f" }}>3</span>
        </div>
        <span className="text-[12px]" style={{ color: "#9a958f" }}>Ir al refugio</span>
      </div>
    </div>
  )
}

function Connector() {
  return <div className="ml-[9px] my-1" style={{ width: "2px", height: "20px", borderLeft: "2px dashed rgba(255,255,255,0.12)" }} />
}

function ExpiredTokenContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="flex flex-col items-center text-center py-8"
    >
      <Clock size={32} color="#e5e2dc" strokeWidth={1.5} />
      <h2 className="mt-4 text-[20px] font-medium" style={{ color: "#0d0d0d" }}>Esta invitación expiró</h2>
      <p className="mt-2 text-[13px] leading-[1.6] max-w-[320px]" style={{ color: "#9a958f" }}>
        Los enlaces de invitación son válidos por 7 días. Pide al administrador del refugio que te envíe una nueva invitación.
      </p>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Link href="/"
          className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
          style={{ backgroundColor: "#ffffff", color: "#3c3a36", border: "0.5px solid #e5e2dc" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f2ef")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
        >
          Ir al inicio
        </Link>
      </motion.div>
    </motion.div>
  )
}

