"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Search } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Estanque { id: string; nombre: string }
interface Lote { id: string; codigo: string; fecha_inicio: string | null }
interface AjoloteOpt { id: string; codigo: string; nombre: string | null }

interface ObservacionModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  onSuccess: () => void
  preselectedAjolote?: { id: string; codigo: string; nombre: string | null } | null
}

const SEV_OPTIONS = [
  { val: "leve",     label: "Leve",     border: "#9a958f", bg: "#f3f2ef", text: "#3c3a36" },
  { val: "moderada", label: "Moderada", border: "#d97706", bg: "#fffbeb", text: "#92400e" },
  { val: "grave",    label: "Grave",    border: "#dc2626", bg: "#fef2f2", text: "#991b1b" },
  { val: "critica",  label: "Crítica",  border: "#991b1b", bg: "#fef2f2", text: "#991b1b" },
]

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d",
  display: "block", marginBottom: 6,
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function ObservacionModal({ open, onClose, refugioId, onSuccess, preselectedAjolote }: ObservacionModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [sujeto, setSujeto] = useState<"ajolote" | "estanque" | "lote">("ajolote")
  const [severidad, setSeveridad] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [estanqueId, setEstanqueId] = useState("")
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteId, setLoteId] = useState("")
  const [ajoloteSearch, setAjoloteSearch] = useState("")
  const [ajoloteResults, setAjoloteResults] = useState<AjoloteOpt[]>([])
  const [ajoloteId, setAjoloteId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(""); setSeveridad(""); setDescripcion(""); setSujeto("ajolote")
    setEstanqueId(""); setLoteId(""); setDropdownOpen(false)
    if (preselectedAjolote) {
      setAjoloteId(preselectedAjolote.id)
      setAjoloteSearch(preselectedAjolote.codigo)
    } else {
      setAjoloteSearch(""); setAjoloteId(null)
    }
    Promise.all([
      fetch(`/api/refugios/${refugioId}/estanques`).then(r => r.json()),
      fetch(`/api/refugios/${refugioId}/lotes?activo=true`).then(r => r.json()),
    ]).then(([estData, lotesData]) => {
      setEstanques((estData.data ?? []).filter((e: { activo: boolean }) => e.activo !== false))
      setLotes(lotesData.data ?? [])
    })
  }, [open, refugioId, preselectedAjolote])

  useEffect(() => {
    if (!ajoloteSearch.trim() || sujeto !== "ajolote") { setAjoloteResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/refugios/${refugioId}/ajolotes?search=${ajoloteSearch}`)
        .then(r => r.json())
        .then(({ data }) => setAjoloteResults((data ?? []).slice(0, 6)))
    }, 250)
    return () => clearTimeout(t)
  }, [ajoloteSearch, sujeto, refugioId])

  async function handleSubmit() {
    if (!severidad) { setError("Selecciona la severidad"); return }
    if (!descripcion.trim()) { setError("La descripción es requerida"); return }
    if (sujeto === "ajolote" && !ajoloteId) { setError("Selecciona un individuo"); return }
    if (sujeto === "estanque" && !estanqueId) { setError("Selecciona un estanque"); return }
    if (sujeto === "lote" && !loteId) { setError("Selecciona un lote larval"); return }

    setSaving(true); setError("")
    try {
      const body: Record<string, unknown> = {
        sujeto_tipo: sujeto, severidad, descripcion: descripcion.trim(),
        ajolote_id: sujeto === "ajolote" ? ajoloteId : null,
        estanque_id: sujeto === "estanque" ? estanqueId : null,
        lote_id: sujeto === "lote" ? loteId : null,
      }
      const res = await fetch(`/api/refugios/${refugioId}/observaciones`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al registrar"); return }
      onSuccess(); onClose()
    } catch { setError("Error de conexión") }
    finally { setSaving(false) }
  }

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
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Registrar observación</h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>Registra una observación clínica del refugio.</p>
              </div>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                <X size={18} />
              </button>
            </div>
            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Sujeto */}
              <div>
                <label style={labelStyle}>Sujeto</label>
                <div className="grid grid-cols-3" style={{ gap: 8 }}>
                  {[
                    { val: "ajolote" as const, label: "Individuo" },
                    { val: "estanque" as const, label: "Estanque" },
                    { val: "lote" as const, label: "Lote larval" },
                  ].map(o => (
                    <button key={o.val} type="button" onClick={() => setSujeto(o.val)}
                      style={{ border: sujeto === o.val ? "1px solid #1a6560" : "0.5px solid #e5e2dc", borderRadius: 8, padding: "8px 12px", textAlign: "center", cursor: "pointer", backgroundColor: sujeto === o.val ? "#e2f0ee" : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: sujeto === o.val ? "#1a6560" : "#0d0d0d", transition: "all 150ms" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional subject search */}
              {sujeto === "ajolote" && (
                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>Individuo</label>
                  {preselectedAjolote ? (
                    <div className="flex items-center" style={{ gap: 8, height: 42, borderRadius: 8, border: "1px solid #1a6560", backgroundColor: "#e2f0ee", padding: "0 12px" }}>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#ffffff", borderRadius: 4, padding: "2px 6px" }}>{preselectedAjolote.codigo}</span>
                      {preselectedAjolote.nombre && <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560" }}>{preselectedAjolote.nombre}</span>}
                    </div>
                  ) : (
                  <div style={{ position: "relative" }}>
                    <Search size={13} color="#9a958f" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="text" value={ajoloteSearch}
                      onChange={e => { setAjoloteSearch(e.target.value); setDropdownOpen(true) }}
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                      placeholder="Buscar por código..."
                      style={{ width: "100%", height: 42, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 12px 0 30px", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  )}
                  {dropdownOpen && ajoloteResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, overflow: "hidden", marginTop: 4, boxShadow: "0 4px 16px rgba(13,13,13,0.08)" }}>
                      {ajoloteResults.map(a => (
                        <button key={a.id} type="button"
                          onMouseDown={() => { setAjoloteId(a.id); setAjoloteSearch(a.codigo); setDropdownOpen(false) }}
                          className="flex items-center w-full" style={{ gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "1px 5px" }}>{a.codigo}</span>
                          {a.nombre && <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{a.nombre}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sujeto === "estanque" && (
                <div>
                  <label style={labelStyle}>Estanque</label>
                  <select value={estanqueId} onChange={e => setEstanqueId(e.target.value)}
                    style={{ width: "100%", height: 42, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", appearance: "none" }}>
                    <option value="">Seleccionar estanque</option>
                    {estanques.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              )}

              {sujeto === "lote" && (
                <div>
                  <label style={labelStyle}>Lote larval</label>
                  <select value={loteId} onChange={e => setLoteId(e.target.value)}
                    style={{ width: "100%", height: 42, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 12px", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d", outline: "none", appearance: "none" }}>
                    <option value="">Seleccionar lote</option>
                    {lotes.length === 0
                      ? <option disabled>Sin lotes activos</option>
                      : lotes.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.codigo}{l.fecha_inicio ? ` — ${new Date(l.fecha_inicio).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                          </option>
                        ))
                    }
                  </select>
                </div>
              )}

              {/* Severidad */}
              <div>
                <label style={labelStyle}>Severidad</label>
                <div className="grid grid-cols-4" style={{ gap: 8 }}>
                  {SEV_OPTIONS.map(o => (
                    <button key={o.val} type="button" onClick={() => setSeveridad(o.val)}
                      style={{ border: severidad === o.val ? `1px solid ${o.border}` : "0.5px solid #e5e2dc", borderRadius: 8, padding: "8px 0", textAlign: "center", cursor: "pointer", backgroundColor: severidad === o.val ? o.bg : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: severidad === o.val ? o.text : "#0d0d0d", transition: "all 150ms" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={labelStyle}>Descripción <span style={{ color: "#dc2626" }}>*</span></label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describe lo observado..."
                  style={{ width: "100%", height: 100, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "10px 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {error && <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginTop: 12 }}>{error}</p>}

            <div className="flex items-center justify-end" style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24, gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: saving ? "#9a958f" : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: saving ? "default" : "pointer" }}>
                {saving ? "Registrando..." : "Registrar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
