"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Copy, RefreshCw, Loader2 } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

type Rol = "tecnico" | "investigador" | "estudiante" | "lectura"
type Step = "form" | "success"

interface GenerarCodigoModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  refugioNombre: string
  onSuccess: () => void
}

interface RoleOption {
  rol: Rol
  label: string
  accentColor: string
  bgLight: string
  pillBg: string
  pillText: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: RoleOption[] = [
  { rol: "tecnico",      label: "Técnico",      accentColor: "#1e3a8a", bgLight: "#eff6ff", pillBg: "#eff6ff", pillText: "#1e3a8a" },
  { rol: "investigador", label: "Investigador",  accentColor: "#15803d", bgLight: "#f0fdf4", pillBg: "#f0fdf4", pillText: "#15803d" },
  { rol: "estudiante",   label: "Estudiante",    accentColor: "#92400e", bgLight: "#fffbeb", pillBg: "#fffbeb", pillText: "#92400e" },
  { rol: "lectura",      label: "Lectura",       accentColor: "#9a958f", bgLight: "#f3f2ef", pillBg: "#f3f2ef", pillText: "#9a958f" },
]

// Unambiguous alphanumeric chars for random suffix
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// ── Helpers ────────────────────────────────────────────────────────────────────

function toAbbreviation(nombre: string): string {
  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "o", "en", "a"])
  const words = nombre.trim().toUpperCase().split(/\s+/).filter(Boolean)
  const significant = words.filter(w => !stopWords.has(w.toLowerCase()))
  if (significant.length === 0) return "REF"
  if (significant.length === 1) {
    const clean = significant[0].replace(/[^A-Z0-9]/g, "")
    return clean.slice(0, 4) || "REF"
  }
  const initials = significant.slice(0, 4).map(w => w.replace(/[^A-Z0-9]/g, "")[0]).filter(Boolean).join("")
  return initials || "REF"
}

function generateUniqueCode(nombre: string, existing: string[]): string {
  const abr = toAbbreviation(nombre)
  for (let i = 0; i < 50; i++) {
    const suffix = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("")
    const code = `${abr}-${suffix}`
    if (!existing.includes(code)) return code
  }
  const suffix = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("")
  return `${abr}-${suffix}`
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? "#1a6560" : "#e5e2dc",
        border: "none", cursor: "pointer", padding: 2,
        display: "flex", alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0, transition: "background 0.15s ease",
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", display: "block", flexShrink: 0 }} />
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function GenerarCodigoModal({ open, onClose, refugioId, refugioNombre, onSuccess }: GenerarCodigoModalProps) {
  const [step, setStep] = useState<Step>("form")
  const [createdCode, setCreatedCode] = useState("")

  // Form state
  const [generatedCode, setGeneratedCode] = useState("")
  const [rol, setRol] = useState<Rol>("tecnico")
  const [limitarUsos, setLimitarUsos] = useState(false)
  const [maxUsos, setMaxUsos] = useState(10)
  const [establecerExpiracion, setEstablecerExpiracion] = useState(false)
  const [expiresAt, setExpiresAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState(false)

  const existingCodesRef = useRef<string[]>([])

  const sans = "var(--font-dm-sans), DM Sans, sans-serif"
  const mono = "var(--font-dm-mono), DM Mono, monospace"

  const regenerate = useCallback(() => {
    const code = generateUniqueCode(refugioNombre || "REF", existingCodesRef.current)
    setGeneratedCode(code)
  }, [refugioNombre])

  // Reset and generate on open
  useEffect(() => {
    if (open) {
      setStep("form")
      setCreatedCode("")
      setRol("tecnico")
      setLimitarUsos(false)
      setMaxUsos(10)
      setEstablecerExpiracion(false)
      setExpiresAt("")
      setSubmitting(false)
      setSubmitError(null)
      setLoadingCode(true)
      existingCodesRef.current = []

      fetch(`/api/refugios/${refugioId}/codigos`)
        .then(r => r.json())
        .then(({ data }) => {
          existingCodesRef.current = (data ?? []).map((c: { codigo: string }) => c.codigo.toUpperCase())
          const code = generateUniqueCode(refugioNombre || "REF", existingCodesRef.current)
          setGeneratedCode(code)
        })
        .catch(() => {
          const code = generateUniqueCode(refugioNombre || "REF", [])
          setGeneratedCode(code)
        })
        .finally(() => setLoadingCode(false))
    }
  }, [open, refugioId, refugioNombre])

  const canSubmit = !!generatedCode && !submitting && !loadingCode

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/codigos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: generatedCode,
          rol,
          max_usos: limitarUsos ? maxUsos : null,
          expires_at: establecerExpiracion && expiresAt ? expiresAt : null,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSubmitError(body.error ?? "Error al crear el código")
        return
      }
      setCreatedCode(generatedCode)
      setStep("success")
    } catch {
      setSubmitError("Error de red al crear el código")
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopyCreated() {
    navigator.clipboard.writeText(createdCode).catch(() => {})
  }

  function handleCloseSuccess() {
    onSuccess()
    onClose()
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
          onClick={e => { if (e.target === e.currentTarget) { if (step === "success") handleCloseSuccess(); else onClose() } }}
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
            {step === "form" ? (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ fontFamily: sans, fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                      Nuevo código de acceso
                    </h2>
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

                  {/* Código generado */}
                  <div>
                    <label style={{ display: "block", fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                      Código de acceso
                    </label>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc",
                      borderRadius: 8, padding: "0 12px", height: 42,
                    }}>
                      {loadingCode ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                          <Loader2 size={14} color="#9a958f" style={{ animation: "spin 1s linear infinite" }} />
                          <span style={{ fontFamily: mono, fontSize: 13, color: "#9a958f" }}>Generando…</span>
                        </div>
                      ) : (
                        <span style={{
                          fontFamily: mono, fontSize: 15, fontWeight: 500,
                          color: "#0d0d0d", letterSpacing: "0.08em", flex: 1,
                        }}>
                          {generatedCode}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={regenerate}
                        disabled={loadingCode}
                        title="Generar otro código"
                        style={{
                          background: "none", border: "none", cursor: loadingCode ? "default" : "pointer",
                          padding: 4, color: "#9a958f", lineHeight: 0, flexShrink: 0,
                          opacity: loadingCode ? 0.4 : 1,
                        }}
                        onMouseEnter={e => { if (!loadingCode) (e.currentTarget as HTMLButtonElement).style.color = "#1a6560" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9a958f" }}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <span style={{ fontFamily: sans, fontSize: 11, color: "#9a958f", display: "block", marginTop: 4 }}>
                      Generado automáticamente. Usa el botón para regenerar.
                    </span>
                  </div>

                  {/* Rol asignado */}
                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: "block", fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                      Rol asignado
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {ROLE_OPTIONS.map(option => {
                        const isSelected = rol === option.rol
                        return (
                          <button
                            key={option.rol}
                            type="button"
                            onClick={() => setRol(option.rol)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                              backgroundColor: isSelected ? option.bgLight : "#ffffff",
                              border: isSelected ? `1.5px solid ${option.accentColor}` : "0.5px solid #e5e2dc",
                              textAlign: "left",
                              transition: "border-color 0.1s, background-color 0.1s",
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = option.accentColor
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e2dc"
                            }}
                          >
                            <span style={{
                              backgroundColor: option.pillBg, color: option.pillText,
                              fontSize: 10, fontWeight: 500, borderRadius: 999,
                              padding: "2px 6px", whiteSpace: "nowrap", flexShrink: 0,
                              fontFamily: sans,
                            }}>
                              {option.label}
                            </span>
                            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                              {option.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Usos máximos */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: sans, fontSize: 13, color: "#0d0d0d", flex: 1 }}>Limitar usos</span>
                      <Toggle checked={limitarUsos} onChange={setLimitarUsos} />
                      {limitarUsos && (
                        <input
                          type="number"
                          min={1}
                          value={maxUsos}
                          onChange={e => setMaxUsos(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{
                            width: 80, height: 36, borderRadius: 8,
                            border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
                            padding: "0 10px", fontFamily: mono, fontSize: 13,
                            color: "#0d0d0d", outline: "none", boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Fecha de expiración */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: sans, fontSize: 13, color: "#0d0d0d", flex: 1 }}>Establecer expiración</span>
                      <Toggle checked={establecerExpiracion} onChange={setEstablecerExpiracion} />
                      {establecerExpiracion && (
                        <input
                          type="date"
                          value={expiresAt}
                          onChange={e => setExpiresAt(e.target.value)}
                          style={{
                            height: 36, borderRadius: 8,
                            border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
                            padding: "0 10px", fontFamily: mono, fontSize: 12,
                            color: "#0d0d0d", outline: "none", boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
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
                    disabled={submitting}
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
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "background-color 150ms",
                    }}
                  >
                    {submitting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                    {submitting ? "Creando..." : "Crear código"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ fontFamily: sans, fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                      Código creado
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseSuccess}
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

                {/* Code display */}
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: mono, fontSize: 28, fontWeight: 500, color: "#0d0d0d",
                    letterSpacing: "0.1em", backgroundColor: "#f9f9f7",
                    borderRadius: 8, padding: 16, margin: "16px 0",
                  }}>
                    {createdCode}
                  </div>
                  <p style={{ fontFamily: sans, fontSize: 13, color: "#9a958f", margin: "0 0 20px" }}>
                    Comparte este código con los nuevos usuarios.
                  </p>

                  {/* Copy button */}
                  <button
                    type="button"
                    onClick={handleCopyCreated}
                    style={{
                      width: "100%", height: 40, borderRadius: 8, border: "none",
                      backgroundColor: "#1a6560", color: "#f9f9f7",
                      fontFamily: sans, fontSize: 13, fontWeight: 500, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <Copy size={14} />
                    Copiar código
                  </button>

                  {/* Close link */}
                  <button
                    type="button"
                    onClick={handleCloseSuccess}
                    style={{
                      display: "block", width: "100%", marginTop: 8,
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: sans, fontSize: 12, color: "#9a958f", textAlign: "center",
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
