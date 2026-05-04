"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────────

type Rol = "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"

interface InvitarUsuarioModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  onSuccess: () => void
}

interface RoleOption {
  rol: Rol
  label: string
  desc: string
  accentColor: string
  bgLight: string
  pillBg: string
  pillText: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: RoleOption[] = [
  {
    rol: "admin", label: "Admin",
    desc: "Acceso total. Puede gestionar usuarios y configuración.",
    accentColor: "#1a6560", bgLight: "#e2f0ee", pillBg: "#e2f0ee", pillText: "#1a6560",
  },
  {
    rol: "tecnico", label: "Técnico",
    desc: "Puede registrar datos y editar.",
    accentColor: "#1e3a8a", bgLight: "#eff6ff", pillBg: "#eff6ff", pillText: "#1e3a8a",
  },
  {
    rol: "investigador", label: "Investigador",
    desc: "Puede registrar. Sin permisos de edición.",
    accentColor: "#15803d", bgLight: "#f0fdf4", pillBg: "#f0fdf4", pillText: "#15803d",
  },
  {
    rol: "estudiante", label: "Estudiante",
    desc: "Solo lectura y registro básico.",
    accentColor: "#92400e", bgLight: "#fffbeb", pillBg: "#fffbeb", pillText: "#92400e",
  },
  {
    rol: "lectura", label: "Lectura",
    desc: "Solo puede ver datos del refugio.",
    accentColor: "#9a958f", bgLight: "#f3f2ef", pillBg: "#f3f2ef", pillText: "#9a958f",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function InvitarUsuarioModal({ open, onClose, refugioId, onSuccess }: InvitarUsuarioModalProps) {
  const [email, setEmail] = useState("")
  const [rol, setRol] = useState<Rol>("tecnico")
  const [nota, setNota] = useState("")
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)

  const sans = "var(--font-dm-sans), DM Sans, sans-serif"

  // Reset state on open
  useEffect(() => {
    if (open) {
      setEmail("")
      setRol("tecnico")
      setNota("")
      setSending(false)
      setSubmitError(null)
      setEmailTouched(false)
    }
  }, [open])

  const emailInvalid = emailTouched && email.length > 0 && !isValidEmail(email)
  const canSubmit = email.length > 0 && isValidEmail(email) && !sending

  async function handleSubmit() {
    if (!canSubmit) return
    setSending(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refugio_id: refugioId, email, rol, nota: nota || null }),
      })
      const body = await res.json()
      if (!res.ok) {
        const msg = body.error ?? "Error al enviar la invitación"
        setSubmitError(msg)
        toast.error(msg)
        return
      }
      toast.success(`Invitación enviada a ${email}`)
      onSuccess()
      onClose()
    } catch {
      const msg = "Error de red al enviar la invitación"
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)",
          }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              width: 440,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 8px 32px rgba(13,13,13,0.12)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontFamily: sans, fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Invitar usuario
                </h2>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  Se enviará un link + código OTP al correo.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  backgroundColor: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#9a958f", flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f5f2ed")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column" }}>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="nombre@institucion.mx"
                  style={{
                    width: "100%", height: 42, borderRadius: 8,
                    border: emailInvalid ? "1px solid #fca5a5" : "0.5px solid #e5e2dc",
                    backgroundColor: "#ffffff", padding: "0 12px",
                    fontFamily: sans, fontSize: 13, color: "#0d0d0d",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                {emailInvalid && (
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#991b1b", marginTop: 4, display: "block" }}>
                    Correo inválido
                  </span>
                )}
              </div>

              {/* Rol */}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                  Rol a asignar
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ROLE_OPTIONS.map(option => {
                    const isSelected = rol === option.rol
                    return (
                      <button
                        key={option.rol}
                        type="button"
                        onClick={() => setRol(option.rol)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                          backgroundColor: isSelected ? option.bgLight : "#ffffff",
                          border: isSelected ? `1.5px solid ${option.accentColor}` : "0.5px solid #e5e2dc",
                          textAlign: "left", width: "100%",
                          transition: "border-color 0.1s, background-color 0.1s",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = option.accentColor
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e2dc"
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>
                            {option.label}
                          </div>
                          <div style={{ fontFamily: sans, fontSize: 11, color: "#9a958f", marginTop: 2 }}>
                            {option.desc}
                          </div>
                        </div>
                        <span style={{
                          backgroundColor: option.pillBg, color: option.pillText,
                          fontSize: 11, fontWeight: 500, borderRadius: 999,
                          padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12,
                          fontFamily: sans,
                        }}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nota */}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                  Nota personalizada <span style={{ fontWeight: 400, color: "#9a958f" }}>(opcional)</span>
                </label>
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Mensaje opcional para el invitado..."
                  style={{
                    width: "100%", height: 72, borderRadius: 8,
                    border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
                    padding: "10px 12px", fontFamily: sans, fontSize: 12,
                    color: "#0d0d0d", outline: "none", resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Invitation preview */}
              <div style={{ marginTop: 14, backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc", borderRadius: 8, padding: 12 }}>
                <div style={{ fontFamily: sans, fontSize: 11, color: "#9a958f", marginBottom: 8 }}>
                  Vista previa del email
                </div>
                {[
                  `De: Axo · no-reply@amoxtli.tech`,
                  `Para: ${email || "—"}`,
                  `Asunto: Invitación a tu refugio en Axo`,
                  `Incluye: link de invitación + código OTP`,
                ].map((line, i) => (
                  <div key={i} style={{
                    fontFamily: sans,
                    fontSize: i === 3 ? 10 : 11,
                    color: i === 3 ? "#9a958f" : "#3c3a36",
                    lineHeight: 1.6,
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div style={{ marginTop: 12, backgroundColor: "#fef2f2", borderRadius: 8, padding: "10px 12px" }}>
                <span style={{ fontFamily: sans, fontSize: 12, color: "#991b1b" }}>{submitError}</span>
              </div>
            )}

            {/* Footer */}
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8,
              borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24,
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 8,
                  border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
                  fontFamily: sans, fontSize: 12, fontWeight: 500,
                  color: "#3c3a36", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 8, border: "none",
                  backgroundColor: canSubmit ? "#1a6560" : "#9a958f",
                  fontFamily: sans, fontSize: 12, fontWeight: 500,
                  color: "#f9f9f7", cursor: canSubmit ? "pointer" : "default",
                  transition: "background-color 150ms",
                }}
              >
                {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : "Enviar invitación"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
