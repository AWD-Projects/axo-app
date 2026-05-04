"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PuestaModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  cruzaId: string
  cruzaLabel: string
  onSuccess: () => void
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 500,
  color: "#0d0d0d",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  border: "0.5px solid #e5e2dc",
  backgroundColor: "#ffffff",
  padding: "0 12px",
  fontFamily: "var(--font-dm-mono), DM Mono, monospace",
  fontSize: 13,
  color: "#0d0d0d",
  outline: "none",
  boxSizing: "border-box",
}

export function PuestaModal({ open, onClose, refugioId, cruzaId, cruzaLabel, onSuccess }: PuestaModalProps) {
  const [fechaPuesta, setFechaPuesta] = useState("")
  const [cantidadHuevos, setCantidadHuevos] = useState("")
  const [notas, setNotas] = useState("")
  const [fechaEclosion, setFechaEclosion] = useState("")
  const [cantidadEclosionada, setCantidadEclosionada] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFechaPuesta(new Date().toISOString().split("T")[0])
      setCantidadHuevos("")
      setNotas("")
      setFechaEclosion("")
      setCantidadEclosionada("")
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    if (!fechaPuesta) { setError("La fecha de la puesta es requerida"); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/puestas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cruza_id: cruzaId,
          fecha_puesta: fechaPuesta,
          cantidad_huevos: cantidadHuevos ? parseInt(cantidadHuevos) : null,
          fecha_eclosion: fechaEclosion || null,
          cantidad_eclosionada: cantidadEclosionada ? parseInt(cantidadEclosionada) : null,
          notas: notas || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? "Error al registrar puesta"); toast.error(body.error ?? "Error al registrar puesta"); return }
      toast.success("Puesta registrada")
      onSuccess()
      onClose()
    } catch {
      setError("Error de red al registrar la puesta"); toast.error("Error de red al registrar la puesta")
    } finally {
      setSubmitting(false)
    }
  }

  const willCreateLote = !!fechaEclosion && !!cantidadEclosionada

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              width: 480,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 8px 32px rgba(13,13,13,0.12)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Registrar puesta
                </h2>
                <p style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  Cruza {cruzaLabel}
                </p>
              </div>
              <button type="button" onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f", flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                <X size={18} />
              </button>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Fecha puesta */}
              <div>
                <label style={labelStyle}>Fecha de la puesta</label>
                <input type="date" value={fechaPuesta} onChange={e => setFechaPuesta(e.target.value)} style={inputStyle} />
              </div>

              {/* Cantidad huevos */}
              <div>
                <label style={labelStyle}>Cantidad de huevos</label>
                <input type="number" value={cantidadHuevos} onChange={e => setCantidadHuevos(e.target.value)}
                  placeholder="Ej. 1200" min={1} style={inputStyle} />
              </div>

              {/* Notas */}
              <div>
                <label style={labelStyle}>
                  Notas <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones sobre la puesta..."
                  rows={3}
                  style={{ width: "100%", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "10px 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ borderTop: "0.5px solid #e5e2dc" }} />

              {/* Eclosion section */}
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: "0 0 12px 0", lineHeight: 1.5 }}>
                  Si la eclosión ya ocurrió, puedes registrarla ahora. De lo contrario, puedes completarla más tarde.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>
                      Fecha de eclosión <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <input type="date" value={fechaEclosion} onChange={e => setFechaEclosion(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Cantidad eclosionada <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <input type="number" value={cantidadEclosionada} onChange={e => setCantidadEclosionada(e.target.value)}
                      placeholder="Ej. 847" min={1} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Lote notice */}
              {willCreateLote && (
                <div style={{ backgroundColor: "#e2f0ee", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Sparkles size={14} color="#1a6560" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", margin: 0, lineHeight: 1.4 }}>
                    Al guardar se creará automáticamente el lote larval en el módulo de Inventario.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: "#fef2f2", borderRadius: 6, padding: "10px 14px" }}>
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", margin: 0 }}>{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
              <button type="button" onClick={onClose} disabled={submitting}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting || !fechaPuesta}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: !fechaPuesta ? "#9a958f" : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: !fechaPuesta ? "default" : "pointer", transition: "background-color 150ms" }}>
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : "Registrar puesta"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
