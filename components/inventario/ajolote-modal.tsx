"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AjoloteOption {
  id: string
  codigo: string
  nombre: string | null
  sexo: string | null
}

interface Estanque {
  id: string
  nombre: string
}

interface AjoloteModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  refugioNombre: string
  onSuccess: () => void
}

// ── Code generation ───────────────────────────────────────────────────────────

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

function generateAjoloteCode(nombre: string, index: number): string {
  const abr = toAbbreviation(nombre)
  return `${abr}-${String(index).padStart(3, "0")}`
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d",
  display: "block", marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, borderRadius: 8,
  backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
  padding: "0 12px",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 13, color: "#0d0d0d", outline: "none", boxSizing: "border-box",
}

const monoInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "var(--font-dm-mono), DM Mono, monospace",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer", appearance: "none" as const,
}

// ── Code search field ─────────────────────────────────────────────────────────

function CodeSearch({
  label, value, onChange, refugioId, excludeId, sexoFilter,
}: {
  label: string
  value: string
  onChange: (id: string | null, codigo: string) => void
  refugioId: string
  excludeId?: string | null
  sexoFilter?: string
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<AjoloteOption[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => { setQuery(value) }, [value])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 1) { setResults([]); return }
    const params = new URLSearchParams({ search: q })
    if (sexoFilter) params.set("sexo", sexoFilter)
    const res = await fetch(`/api/refugios/${refugioId}/ajolotes?${params}`)
    if (res.ok) {
      const { data } = await res.json()
      setResults((data ?? []).filter((a: AjoloteOption) => a.id !== excludeId).slice(0, 6))
    }
  }, [refugioId, sexoFilter, excludeId])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div style={{ position: "relative" }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <Search size={13} color="#9a958f" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar por código..."
          style={{ ...monoInputStyle, paddingLeft: 30 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
          borderRadius: 8, overflow: "hidden", marginTop: 4,
          boxShadow: "0 4px 16px rgba(13,13,13,0.08)",
        }}>
          {results.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => { onChange(a.id, a.codigo); setQuery(a.codigo); setOpen(false) }}
              className="flex items-center w-full"
              style={{
                gap: 8, padding: "8px 12px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "1px 5px" }}>
                {a.codigo}
              </span>
              {a.nombre && (
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>
                  {a.nombre}
                </span>
              )}
              {a.sexo && (
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginLeft: "auto" }}>
                  {a.sexo === "macho" ? "Macho" : a.sexo === "hembra" ? "Hembra" : "S/D"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Coef badge ────────────────────────────────────────────────────────────────

function coefColor(c: number): { text: string; label: string } {
  if (c > 0.25) return { text: "#991b1b", label: "Riesgo alto" }
  if (c > 0.125) return { text: "#92400e", label: "Riesgo moderado" }
  return { text: "#15803d", label: "Riesgo bajo" }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AjoloteModal({ open, onClose, refugioId, refugioNombre, onSuccess }: AjoloteModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [estanques, setEstanques] = useState<Estanque[]>([])

  const [codigo, setCodigo] = useState("")
  const [loadingCode, setLoadingCode] = useState(false)
  const [nombre, setNombre] = useState("")
  const [sexo, setSexo] = useState<"macho" | "hembra" | "indeterminado" | "">("")
  const [morfotipo, setMorfotipo] = useState("normal")
  const [origen, setOrigen] = useState("nacido_en_refugio")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [estanqueId, setEstanqueId] = useState("")
  const [madreId, setMadreId] = useState<string | null>(null)
  const [madreCodigo, setMadreCodigo] = useState("")
  const [padreId, setPadreId] = useState<string | null>(null)
  const [padreCodigo, setPadreCodigo] = useState("")
  const [coef, setCoef] = useState<number | null>(null)
  const [loadingCoef, setLoadingCoef] = useState(false)
  const [notas, setNotas] = useState("")

  useEffect(() => {
    if (!open || !refugioId) return
    setError("")
    setCodigo(""); setNombre(""); setSexo(""); setMorfotipo("normal")
    setOrigen("nacido_en_refugio"); setFechaNacimiento(""); setEstanqueId("")
    setMadreId(null); setMadreCodigo(""); setPadreId(null); setPadreCodigo("")
    setCoef(null); setNotas("")

    setLoadingCode(true)
    Promise.all([
      fetch(`/api/refugios/${refugioId}/estanques`).then(r => r.json()),
      fetch(`/api/refugios/${refugioId}/ajolotes`).then(r => r.json()),
    ]).then(([estanquesData, ajolotesData]) => {
      setEstanques((estanquesData.data ?? []).filter((e: { activo: boolean }) => e.activo !== false))
      const count = (ajolotesData.data ?? []).length
      setCodigo(generateAjoloteCode(refugioNombre || "REF", count + 1))
    }).catch(() => {
      setCodigo(generateAjoloteCode(refugioNombre || "REF", 1))
    }).finally(() => setLoadingCode(false))
  }, [open, refugioId, refugioNombre])

  // Fetch coef when both parents selected
  useEffect(() => {
    if (!madreId || !padreId) { setCoef(null); return }
    setLoadingCoef(true)
    fetch(`/api/refugios/${refugioId}/cruzas?hembra_id=${madreId}&macho_id=${padreId}`)
      .then(r => r.json())
      .then(({ data }) => {
        const cruzas = data ?? []
        if (cruzas.length > 0 && cruzas[0].coeficiente_consanguinidad !== null) {
          setCoef(cruzas[0].coeficiente_consanguinidad)
        } else {
          setCoef(null)
        }
      })
      .catch(() => setCoef(null))
      .finally(() => setLoadingCoef(false))
  }, [madreId, padreId, refugioId])

  async function handleSubmit() {
    if (!origen) { setError("El origen es requerido"); return }
    setSaving(true); setError("")
    try {
      const body: Record<string, unknown> = {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim() || null,
        sexo: sexo || null,
        morfotipo: morfotipo || null,
        origen,
        fecha_nacimiento: fechaNacimiento || null,
        fecha_ingreso: fechaNacimiento || null,
        estanque_id: estanqueId || null,
        madre_id: madreId || null,
        padre_id: padreId || null,
        notas: notas.trim() || null,
      }
      const res = await fetch(`/api/refugios/${refugioId}/ajolotes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al registrar"); toast.error(data.error ?? "Error al registrar"); return }
      toast.success(`Ajolote ${codigo.trim().toUpperCase()} registrado`)
      onSuccess(); onClose()
    } catch {
      setError("Error de conexión"); toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const coefInfo = coef !== null ? coefColor(coef) : null

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
              backgroundColor: "#ffffff", borderRadius: 14, width: 520,
              maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 40px)",
              overflowY: "auto", padding: 28,
              boxShadow: "0 8px 32px rgba(13,13,13,0.12)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Registrar ajolote
                </h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  Agrega un nuevo individuo al inventario.
                </p>
              </div>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                <X size={18} />
              </button>
            </div>
            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Código + Nombre */}
              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <div>
                  <label style={labelStyle}>Código</label>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    height: 42, borderRadius: 8, border: "0.5px solid #e5e2dc",
                    backgroundColor: "#f9f9f7", padding: "0 12px",
                  }}>
                    {loadingCode ? (
                      <Loader2 size={13} color="#9a958f" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    ) : (
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 14, fontWeight: 500, color: "#0d0d0d", letterSpacing: "0.06em", flex: 1 }}>
                        {codigo}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", display: "block", marginTop: 4 }}>
                    Generado automáticamente
                  </span>
                </div>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Apodo opcional" style={inputStyle} />
                </div>
              </div>

              {/* Sexo radio cards */}
              <div>
                <label style={labelStyle}>Sexo</label>
                <div className="grid grid-cols-3" style={{ gap: 8 }}>
                  {[
                    { val: "macho" as const, label: "Macho" },
                    { val: "hembra" as const, label: "Hembra" },
                    { val: "indeterminado" as const, label: "Sin determinar" },
                  ].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setSexo(opt.val)}
                      style={{
                        border: sexo === opt.val ? "1px solid #1a6560" : "0.5px solid #e5e2dc",
                        borderRadius: 8, padding: "8px 12px", textAlign: "center", cursor: "pointer",
                        backgroundColor: sexo === opt.val ? "#e2f0ee" : "#ffffff",
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                        fontSize: 12, fontWeight: 500,
                        color: sexo === opt.val ? "#1a6560" : "#0d0d0d",
                        transition: "all 150ms",
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Morfotipo + Origen */}
              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <div>
                  <label style={labelStyle}>Morfotipo</label>
                  <select value={morfotipo} onChange={e => setMorfotipo(e.target.value)} style={selectStyle}>
                    <option value="normal">Normal</option>
                    <option value="leucistico">Leucístico</option>
                    <option value="albino">Albino</option>
                    <option value="melanico">Melánico</option>
                    <option value="golden">Dorado</option>
                    <option value="axanthic">Axántico</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Origen <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={origen} onChange={e => setOrigen(e.target.value)} style={selectStyle}>
                    <option value="nacido_en_refugio">Nacido en refugio</option>
                    <option value="ingreso_externo">Ingreso externo</option>
                    <option value="silvestre_rescatado">Silvestre rescatado</option>
                  </select>
                </div>
              </div>

              {/* Fecha + Estanque */}
              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fecha de nacimiento / ingreso</label>
                  <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)}
                    style={monoInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estanque actual</label>
                  <select value={estanqueId} onChange={e => setEstanqueId(e.target.value)} style={selectStyle}>
                    <option value="">Sin asignar</option>
                    {estanques.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Madre + Padre */}
              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <CodeSearch label="Madre (opcional)" value={madreCodigo}
                  onChange={(id, codigo) => { setMadreId(id); setMadreCodigo(codigo) }}
                  refugioId={refugioId} excludeId={padreId} sexoFilter="hembra" />
                <CodeSearch label="Padre (opcional)" value={padreCodigo}
                  onChange={(id, codigo) => { setPadreId(id); setPadreCodigo(codigo) }}
                  refugioId={refugioId} excludeId={madreId} sexoFilter="macho" />
              </div>

              {/* Coef strip */}
              {(madreId && padreId) && (
                <div style={{ backgroundColor: "#e2f0ee", borderRadius: 6, padding: "8px 12px" }}>
                  {loadingCoef ? (
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
                      Calculando coeficiente…
                    </span>
                  ) : coef !== null ? (
                    <div className="flex items-center" style={{ gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#1a6560" }}>
                        Coeficiente de consanguinidad: {coef.toFixed(3)}
                      </span>
                      {coefInfo && (
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: coefInfo.text }}>
                          {coefInfo.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0f3d3a" }}>
                      Parentesco registrado: {madreCodigo} × {padreCodigo}
                    </span>
                  )}
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  style={{ ...inputStyle, height: 60, padding: "10px 12px", resize: "none" }} />
              </div>
            </div>

            {error && (
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginTop: 12 }}>
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end" style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24, gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: saving ? "#9a958f" : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: saving ? "default" : "pointer", transition: "background-color 150ms" }}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : "Registrar ajolote"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
