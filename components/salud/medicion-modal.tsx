"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Estanque { id: string; nombre: string }

interface MedicionModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  onSuccess: () => void
  preselectedEstanqueId?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PARAMS = [
  { key: "temperatura", label: "Temperatura", unit: "°C",   placeholder: "17.0", step: 0.1  },
  { key: "ph",          label: "pH",           unit: "",     placeholder: "7.4",  step: 0.1  },
  { key: "amonio",      label: "Amonio",       unit: "mg/L", placeholder: "0.00", step: 0.01 },
  { key: "nitrito",     label: "Nitrito",      unit: "mg/L", placeholder: "0.00", step: 0.01 },
  { key: "oxigeno",     label: "Oxígeno",      unit: "mg/L", placeholder: "7.5",  step: 0.1  },
]

const RANGOS: Record<string, { optMin: number; optMax: number }> = {
  temperatura: { optMin: 16,  optMax: 18   },
  ph:          { optMin: 7.0, optMax: 7.8  },
  amonio:      { optMin: 0,   optMax: 0.25 },
  nitrito:     { optMin: 0,   optMax: 0.2  },
  oxigeno:     { optMin: 6.0, optMax: 10.0 },
}

function paramStatus(key: string, val: string): "ok" | "warning" | "critical" | "empty" {
  if (!val.trim()) return "empty"
  const n = parseFloat(val)
  if (isNaN(n)) return "empty"
  switch (key) {
    case "temperatura": if (n < 12 || n > 25) return "critical"; if (n < 14 || n > 22) return "warning"; return "ok"
    case "ph":          if (n < 6.5 || n > 8.5) return "critical"; if (n < 7.0 || n > 8.0) return "warning"; return "ok"
    case "amonio":      if (n > 1.0) return "critical"; if (n > 0.25) return "warning"; return "ok"
    case "nitrito":     if (n > 0.5) return "critical"; if (n > 0.2) return "warning"; return "ok"
    case "oxigeno":     if (n < 4.0) return "critical"; if (n < 6.0) return "warning"; return "ok"
    default: return "ok"
  }
}

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  ok:       { color: "#1a6560", label: "En rango" },
  warning:  { color: "#d97706", label: "Advertencia" },
  critical: { color: "#dc2626", label: "Fuera de rango" },
  empty:    { color: "transparent", label: "" },
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d",
  display: "block", marginBottom: 6,
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function MedicionModal({ open, onClose, refugioId, onSuccess, preselectedEstanqueId }: MedicionModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [estanqueId, setEstanqueId] = useState("")
  const [values, setValues] = useState({ temperatura: "", ph: "", amonio: "", nitrito: "", oxigeno: "" })
  const [notas, setNotas] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingEstanques, setLoadingEstanques] = useState(true)

  const loadEstanques = useCallback(async () => {
    setLoadingEstanques(true)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/estanques`)
      const { data } = await res.json()
      setEstanques((data ?? []).filter((e: { activo: boolean }) => e.activo !== false))
    } finally {
      setLoadingEstanques(false)
    }
  }, [refugioId])

  useEffect(() => {
    if (!open) return
    setStep(1); setError(""); setNotas("")
    setValues({ temperatura: "", ph: "", amonio: "", nitrito: "", oxigeno: "" })
    loadEstanques().then(() => {
      if (preselectedEstanqueId) {
        setEstanqueId(preselectedEstanqueId)
        setStep(2)
      } else {
        setEstanqueId("")
      }
    })
  }, [open, refugioId, preselectedEstanqueId, loadEstanques])

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    const hasValue = Object.values(values).some(v => v.trim() !== "")
    if (!hasValue) { setError("Ingresa al menos un parámetro"); return }

    setSaving(true); setError("")
    try {
      const body: Record<string, unknown> = {
        estanque_id: estanqueId,
        notas: notas.trim() || null,
      }
      for (const p of PARAMS) {
        const v = values[p.key as keyof typeof values].trim()
        body[p.key] = v ? parseFloat(v) : null
      }
      const res = await fetch(`/api/refugios/${refugioId}/mediciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al registrar"); toast.error(data.error ?? "Error al registrar"); return }
      toast.success("Medición registrada")
      onSuccess(); onClose()
    } catch { setError("Error de conexión"); toast.error("Error de conexión") }
    finally { setSaving(false) }
  }

  const selectedEstanque = estanques.find(e => e.id === estanqueId)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ backgroundColor: "#ffffff", borderRadius: 14, width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", padding: 28, boxShadow: "0 8px 32px rgba(13,13,13,0.12)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Registrar medición
                </h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  {step === 1 ? "Selecciona el estanque medido." : `Estanque: ${selectedEstanque?.nombre ?? ""}`}
                </p>
              </div>
              <button type="button" onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center" style={{ gap: 0, margin: "16px 0" }}>
              {[{ n: 1, label: "Estanque" }, { n: 2, label: "Valores" }].map((s, i) => (
                <div key={s.n} className="flex items-center" style={{ gap: 0 }}>
                  {i > 0 && <div style={{ width: 24, height: 1, backgroundColor: step > 1 ? "#1a6560" : "#e5e2dc", margin: "0 8px" }} />}
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: step >= s.n ? "#1a6560" : "#f3f2ef",
                      border: step >= s.n ? "none" : "0.5px solid #e5e2dc",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, fontWeight: 500,
                      color: step >= s.n ? "#ffffff" : "#9a958f",
                    }}>
                      {step > s.n ? "✓" : s.n}
                    </div>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: step === s.n ? 500 : 400, color: step === s.n ? "#0d0d0d" : "#9a958f" }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", marginBottom: 20 }} />

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loadingEstanques ? (
                  [1, 2, 3].map(i => <div key={i} style={{ height: 48, borderRadius: 8, backgroundColor: "#f3f2ef" }} />)
                ) : estanques.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", textAlign: "center", padding: "16px 0" }}>
                    No hay estanques activos.
                  </p>
                ) : (
                  estanques.map(e => (
                    <button key={e.id} type="button" onClick={() => setEstanqueId(e.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 8, cursor: "pointer", transition: "all 150ms", textAlign: "left",
                        border: estanqueId === e.id ? "1px solid #1a6560" : "0.5px solid #e5e2dc",
                        backgroundColor: estanqueId === e.id ? "#e2f0ee" : "#ffffff",
                      }}>
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: estanqueId === e.id ? "#1a6560" : "#0d0d0d" }}>
                        {e.nombre}
                      </span>
                      {estanqueId === e.id && (
                        <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#1a6560", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#ffffff", fontSize: 9, lineHeight: 1 }}>✓</span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0 }}>
                  Deja en blanco los parámetros que no mediste.
                </p>
                {PARAMS.map(p => {
                  const status = paramStatus(p.key, values[p.key as keyof typeof values])
                  const { optMin, optMax } = RANGOS[p.key]
                  const dot = STATUS_DOT[status]
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                        <label style={labelStyle}>
                          {p.label}
                          {p.unit && <span style={{ color: "#9a958f", fontWeight: 400, marginLeft: 4 }}>({p.unit})</span>}
                        </label>
                        {status !== "empty" && (
                          <div className="flex items-center" style={{ gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dot.color }} />
                            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: dot.color }}>{dot.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <input
                          type="number"
                          value={values[p.key as keyof typeof values]}
                          onChange={e => setValue(p.key, e.target.value)}
                          placeholder={p.placeholder}
                          step={p.step}
                          style={{
                            flex: 1, height: 40, borderRadius: 8, padding: "0 12px",
                            border: status === "critical" ? "1px solid #dc2626" : status === "warning" ? "1px solid #d97706" : "0.5px solid #e5e2dc",
                            backgroundColor: "#ffffff",
                            fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d", outline: "none",
                          }}
                        />
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {optMin}–{optMax}{p.unit ? ` ${p.unit}` : ""}
                        </span>
                      </div>
                    </div>
                  )
                })}

                <div>
                  <label style={labelStyle}>Notas <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span></label>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    style={{ width: "100%", height: 72, borderRadius: 8, border: "0.5px solid #e5e2dc", padding: "8px 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            {error && <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginTop: 12 }}>{error}</p>}

            {/* Footer */}
            <div className="flex items-center justify-between" style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 20 }}>
              {step === 2 ? (
                <button type="button" onClick={() => { if (!preselectedEstanqueId) setStep(1) }}
                  style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: preselectedEstanqueId ? "#c8c4be" : "#3c3a36", cursor: preselectedEstanqueId ? "default" : "pointer" }}>
                  ← Volver
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                  Cancelar
                </button>
              )}
              {step === 1 ? (
                <button type="button" onClick={() => { if (estanqueId) setStep(2) }} disabled={!estanqueId}
                  style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", backgroundColor: estanqueId ? "#1a6560" : "#e5e2dc", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: estanqueId ? "#f9f9f7" : "#9a958f", cursor: estanqueId ? "pointer" : "default", transition: "all 150ms" }}>
                  Continuar →
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving}
                  style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", backgroundColor: saving ? "#9a958f" : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: saving ? "default" : "pointer" }}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : "Registrar"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
