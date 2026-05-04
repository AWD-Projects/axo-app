"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Estanque { id: string; nombre: string }

const PARAMS = [
  { key: "temperatura", label: "Temperatura", unit: "°C", placeholder: "18.5", min: 0, max: 40, step: 0.1 },
  { key: "ph",          label: "pH",           unit: "",   placeholder: "7.2",  min: 0, max: 14, step: 0.1 },
  { key: "amonio",      label: "Amonio",        unit: "ppm", placeholder: "0.1", min: 0, max: 10, step: 0.01 },
  { key: "nitrito",     label: "Nitrito",       unit: "ppm", placeholder: "0.1", min: 0, max: 10, step: 0.01 },
  { key: "oxigeno",     label: "Oxígeno disuelto", unit: "mg/L", placeholder: "7.0", min: 0, max: 20, step: 0.1 },
]

const RANGOS: Record<string, { min: number; max: number }> = {
  temperatura: { min: 16,  max: 18   },
  ph:          { min: 7.0, max: 7.8  },
  amonio:      { min: 0,   max: 0.25 },
  nitrito:     { min: 0,   max: 0.2  },
  oxigeno:     { min: 6.0, max: 10.0 },
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

const statusDot: Record<string, { bg: string; label: string }> = {
  ok:       { bg: "#1a6560", label: "En rango" },
  warning:  { bg: "#d97706", label: "Advertencia" },
  critical: { bg: "#dc2626", label: "Fuera de rango" },
  empty:    { bg: "#e5e2dc", label: "" },
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d",
  display: "block", marginBottom: 6,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistrarMedicionPage() {
  const router = useRouter()
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [step, setStep] = useState<1 | 2>(1)
  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [estanqueId, setEstanqueId] = useState("")
  const [values, setValues] = useState<Record<string, string>>({
    temperatura: "", ph: "", amonio: "", nitrito: "", oxigeno: "",
  })
  const [notas, setNotas] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingEstanques, setLoadingEstanques] = useState(true)

  const loadEstanques = useCallback(async () => {
    if (!activeRefugioId) return
    setLoadingEstanques(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/estanques`)
      const { data } = await res.json()
      setEstanques((data ?? []).filter((e: { activo: boolean }) => e.activo !== false))
    } finally {
      setLoadingEstanques(false)
    }
  }, [activeRefugioId])

  useEffect(() => {
    if (!ctxLoading) loadEstanques()
  }, [ctxLoading, loadEstanques])

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
        const v = values[p.key].trim()
        body[p.key] = v ? parseFloat(v) : null
      }
      const res = await fetch(`/api/refugios/${activeRefugioId}/mediciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al registrar"); return }
      router.push("/dashboard/salud")
    } catch { setError("Error de conexión") }
    finally { setSaving(false) }
  }

  const selectedEstanque = estanques.find(e => e.id === estanqueId)

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <button type="button" onClick={() => router.push("/dashboard/salud")}
            style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
            Salud
          </button>
          <ChevronRight size={13} color="#9a958f" />
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", fontWeight: 500 }}>
            Registrar medición
          </span>
        </div>
        <button type="button" onClick={() => router.push("/dashboard/salud")}
          style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
          Cancelar
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center" style={{ gap: 0, marginBottom: 32 }}>
        {[
          { n: 1, label: "Seleccionar estanque" },
          { n: 2, label: "Ingresar valores" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center" style={{ gap: 0 }}>
            {i > 0 && (
              <div style={{ width: 32, height: 1, backgroundColor: step > 1 ? "#1a6560" : "#e5e2dc", margin: "0 8px" }} />
            )}
            <div className="flex items-center" style={{ gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                backgroundColor: step === s.n ? "#1a6560" : step > s.n ? "#1a6560" : "#f9f9f7",
                border: step >= s.n ? "none" : "0.5px solid #e5e2dc",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                fontSize: 11, fontWeight: 500,
                color: step >= s.n ? "#ffffff" : "#9a958f",
                flexShrink: 0,
              }}>
                {step > s.n ? "✓" : s.n}
              </div>
              <span style={{
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 13, fontWeight: step === s.n ? 500 : 400,
                color: step === s.n ? "#0d0d0d" : "#9a958f",
              }}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1 — Seleccionar estanque */}
      {step === 1 && (
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", padding: 24 }}>
          <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 16, fontWeight: 500, color: "#0d0d0d", margin: "0 0 4px 0" }}>
            ¿En qué estanque tomaste la medición?
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 20px 0" }}>
            Selecciona el estanque al que corresponden los valores que vas a registrar.
          </p>

          {loadingEstanques ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 56, borderRadius: 8, backgroundColor: "#f3f2ef" }} />
              ))}
            </div>
          ) : estanques.length === 0 ? (
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", textAlign: "center", padding: "24px 0" }}>
              No hay estanques activos en este refugio.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {estanques.map(e => (
                <button key={e.id} type="button" onClick={() => setEstanqueId(e.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderRadius: 8, cursor: "pointer", transition: "all 150ms",
                    border: estanqueId === e.id ? "1px solid #1a6560" : "0.5px solid #e5e2dc",
                    backgroundColor: estanqueId === e.id ? "#e2f0ee" : "#ffffff",
                    textAlign: "left",
                  }}>
                  <span style={{
                    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                    fontSize: 14, fontWeight: 500,
                    color: estanqueId === e.id ? "#1a6560" : "#0d0d0d",
                  }}>
                    {e.nombre}
                  </span>
                  {estanqueId === e.id && (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#1a6560", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#ffffff", fontSize: 10, lineHeight: 1 }}>✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end" style={{ marginTop: 24 }}>
            <button type="button" onClick={() => { if (estanqueId) setStep(2) }}
              disabled={!estanqueId}
              style={{
                height: 36, padding: "0 20px", borderRadius: 8, border: "none", cursor: estanqueId ? "pointer" : "default",
                backgroundColor: estanqueId ? "#1a6560" : "#e5e2dc",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500,
                color: estanqueId ? "#f9f9f7" : "#9a958f",
                transition: "all 150ms",
              }}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Ingresar valores */}
      {step === 2 && (
        <div>
          <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", padding: 24, marginBottom: 16 }}>
            {/* Selected estanque header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Estanque
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 15, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  {selectedEstanque?.nombre}
                </p>
              </div>
              <button type="button" onClick={() => setStep(1)}
                style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                Cambiar
              </button>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", marginBottom: 20 }} />

            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 20px 0" }}>
              Ingresa los valores que registraste. Puedes dejar en blanco los parámetros que no mediste.
            </p>

            {/* Parameter inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PARAMS.map(p => {
                const status = paramStatus(p.key, values[p.key])
                const rango = RANGOS[p.key]
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <label style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                        {p.label}
                        {p.unit && <span style={{ color: "#9a958f", fontWeight: 400, marginLeft: 4 }}>({p.unit})</span>}
                      </label>
                      {status !== "empty" && (
                        <div className="flex items-center" style={{ gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: statusDot[status].bg }} />
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: statusDot[status].bg }}>
                            {statusDot[status].label}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <input
                        type="number"
                        value={values[p.key]}
                        onChange={e => setValue(p.key, e.target.value)}
                        placeholder={p.placeholder}
                        min={p.min} max={p.max} step={p.step}
                        style={{
                          flex: 1, height: 42, borderRadius: 8,
                          border: status === "critical" ? "1px solid #dc2626" : status === "warning" ? "1px solid #d97706" : "0.5px solid #e5e2dc",
                          backgroundColor: "#ffffff", padding: "0 12px",
                          fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                          fontSize: 14, color: "#0d0d0d", outline: "none",
                        }}
                      />
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", whiteSpace: "nowrap" }}>
                        Óptimo: {rango.min}–{rango.max}{p.unit}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* Notas */}
            <div>
              <label style={labelStyle}>Notas <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span></label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones adicionales sobre la medición..."
                style={{ width: "100%", height: 80, borderRadius: 8, border: "0.5px solid #e5e2dc", padding: "10px 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginBottom: 12 }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)}
              style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
              ← Volver
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              style={{ height: 36, padding: "0 20px", borderRadius: 8, border: "none", backgroundColor: saving ? "#9a958f" : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#f9f9f7", cursor: saving ? "default" : "pointer" }}>
              {saving ? "Registrando..." : "Registrar medición"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
