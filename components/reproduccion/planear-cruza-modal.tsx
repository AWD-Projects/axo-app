"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { X, Search, CheckCircle, AlertTriangle, XCircle, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Ajolote {
  id: string
  codigo: string
  nombre: string | null
  sexo: "macho" | "hembra" | "indeterminado" | null
  morfotipo: string | null
  fecha_nacimiento: string | null
  estanques: { id: string; nombre: string } | null
}

interface CoefData {
  coeficiente: number
  riesgo: "bajo" | "moderado" | "alto"
  recomendacion: string
}

interface Estanque { id: string; nombre: string }

interface PlanearCruzaModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  onSuccess: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function edad(nacimiento: string | null): string {
  if (!nacimiento) return ""
  const diff = Date.now() - new Date(nacimiento).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (months < 12) return `${months}m`
  const yrs = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${yrs}a ${rem}m` : `${yrs}a`
}

const ALTERNATIVAS_MOCK = [
  { pair: "M-04 × H-11", coef: 0.02 },
  { pair: "M-08 × H-02", coef: 0.03 },
  { pair: "M-12 × H-11", coef: 0.02 },
]

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, borderRadius: 8,
  border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
  padding: "0 12px",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 13, color: "#0d0d0d", outline: "none", boxSizing: "border-box",
}

// ── Coefficient result card ────────────────────────────────────────────────────

function CoefCard({ data, hembra, macho }: { data: CoefData; hembra: Ajolote; macho: Ajolote }) {
  const coef = data.coeficiente
  const riesgo = data.riesgo
  const pct = Math.min((coef / 0.375) * 100, 98)

  const borderColor = riesgo === "alto" ? "#991b1b" : riesgo === "moderado" ? "#92400e" : "#15803d"
  const textColor   = riesgo === "alto" ? "#991b1b" : riesgo === "moderado" ? "#92400e" : "#15803d"
  const bgCircle    = riesgo === "alto" ? "#fef2f2" : riesgo === "moderado" ? "#fffbeb" : "#f0fdf4"
  const IconComp    = riesgo === "alto" ? XCircle : riesgo === "moderado" ? AlertTriangle : CheckCircle
  const label       = riesgo === "alto" ? "Riesgo alto de endogamia"
    : riesgo === "moderado" ? "Precaución recomendada" : "Cruza segura"
  const interpretation = riesgo === "alto"
    ? "Un coeficiente mayor a 0.25 indica parentesco cercano (equivalente a hermanos). Esta cruza puede resultar en descendencia con malformaciones o viabilidad reducida."
    : riesgo === "moderado"
    ? "Esta cruza tiene un coeficiente moderado. Considera otras combinaciones disponibles en tu refugio."
    : "Esta combinación tiene un coeficiente bajo. Buena elección para maximizar la diversidad genética."

  return (
    <div style={{ border: "0.5px solid #e5e2dc", borderTop: `3px solid ${borderColor}`, borderRadius: 10, overflow: "hidden", animation: "coefIn 220ms ease-out" }}>
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: bgCircle, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconComp size={18} color={textColor} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>
              {macho.codigo} × {hembra.codigo}
            </div>
            <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: textColor, marginTop: 1 }}>{label}</div>
          </div>
        </div>

        {/* Coef large */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 40, fontWeight: 500, color: textColor, lineHeight: 1 }}>{coef.toFixed(4)}</div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 4 }}>Coeficiente de consanguinidad</div>
        </div>

        {/* Risk meter */}
        <div style={{ position: "relative", marginBottom: 6 }}>
          <div style={{ height: 7, borderRadius: 4, background: "linear-gradient(to right, #15803d 0%, #92400e 50%, #991b1b 100%)" }} />
          <div style={{ position: "absolute", top: -5, left: `calc(${pct}% - 4px)`, width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "7px solid #0d0d0d" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>0</span>
          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>0.125 · Mod.</span>
          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>0.25 · Alto</span>
        </div>

        {/* Interpretation */}
        <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", lineHeight: 1.6, margin: 0 }}>{interpretation}</p>

        {/* Warning banner for alto */}
        {riesgo === "alto" && (
          <div style={{ backgroundColor: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", lineHeight: 1.5, margin: 0 }}>
              Se desaconseja fuertemente esta cruza. Considera las alternativas sugeridas.
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes coefIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}

// ── Individual selector ────────────────────────────────────────────────────────

function IndividualSelector({
  sexo, dotColor, labelText, selected, onSelect, onDeselect, refugioId,
}: {
  sexo: "hembra" | "macho"; dotColor: string; labelText: string
  selected: Ajolote | null
  onSelect: (a: Ajolote) => void
  onDeselect: () => void
  refugioId: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Ajolote[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    try {
      const res = await fetch(`/api/refugios/${refugioId}/ajolotes?sexo=${sexo}&estado=vivo&search=${encodeURIComponent(q)}`)
      const { data } = await res.json()
      setResults(data ?? [])
    } catch { setResults([]) }
  }, [refugioId, sexo])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", outside)
    return () => document.removeEventListener("mousedown", outside)
  }, [])

  const label = (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: dotColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{labelText}</span>
    </div>
  )

  if (selected) {
    return (
      <div>
        {label}
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "3px 8px" }}>{selected.codigo}</span>
            <div>
              <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#3c3a36" }}>
                {selected.sexo === "hembra" ? "Hembra" : "Macho"}{selected.morfotipo ? ` · ${selected.morfotipo}` : ""}
              </div>
              <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f" }}>
                {selected.fecha_nacimiento ? `${edad(selected.fecha_nacimiento)} · ` : ""}{selected.estanques?.nombre ?? "Sin estanque"}
              </div>
            </div>
          </div>
          <button type="button" onClick={onDeselect}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9a958f" }}>
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label}
      <div style={{ position: "relative" }}>
        <Search size={13} color="#9a958f" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por código..."
          style={{ ...inputStyle, padding: "0 12px 0 30px", fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 30, maxHeight: 180, overflowY: "auto" }}>
          {results.map(a => (
            <div key={a.id} onClick={() => { onSelect(a); setOpen(false); setQuery("") }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 6px" }}>{a.codigo}</span>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
                  {a.sexo === "hembra" ? "Hembra" : "Macho"}{a.fecha_nacimiento ? ` · ${edad(a.fecha_nacimiento)}` : ""}{a.estanques ? ` · ${a.estanques.nombre}` : ""}
                </span>
              </div>
              {a.morfotipo && (
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f", backgroundColor: "#f3f2ef", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>{a.morfotipo}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, padding: "10px 12px", zIndex: 30 }}>
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>Sin resultados</span>
        </div>
      )}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export function PlanearCruzaModal({ open, onClose, refugioId, onSuccess }: PlanearCruzaModalProps) {
  const router = useRouter()

  const [selectedHembra, setSelectedHembra] = useState<Ajolote | null>(null)
  const [selectedMacho, setSelectedMacho] = useState<Ajolote | null>(null)
  const [coefData, setCoefData] = useState<CoefData | null>(null)
  const [coefLoading, setCoefLoading] = useState(false)

  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [estanqueId, setEstanqueId] = useState("")
  const [fechaPlaneada, setFechaPlaneada] = useState("")
  const [notas, setNotas] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedHembra(null)
      setSelectedMacho(null)
      setCoefData(null)
      setEstanqueId("")
      setFechaPlaneada("")
      setNotas("")
      setSubmitError(null)
    }
  }, [open])

  // Fetch estanques once on open
  useEffect(() => {
    if (!open || !refugioId) return
    fetch(`/api/refugios/${refugioId}/estanques`)
      .then(r => r.json())
      .then(({ data }) => setEstanques(data ?? []))
      .catch(() => {})
  }, [open, refugioId])

  // Compute coef when both selected
  useEffect(() => {
    if (!selectedHembra || !selectedMacho) { setCoefData(null); return }
    setCoefLoading(true)
    fetch(`/api/refugios/${refugioId}/cruzas/coeficiente?hembra_id=${selectedHembra.id}&macho_id=${selectedMacho.id}`)
      .then(r => r.json())
      .then(({ data }) => setCoefData(data ?? null))
      .catch(() => setCoefData(null))
      .finally(() => setCoefLoading(false))
  }, [selectedHembra, selectedMacho, refugioId])

  async function handleSubmit() {
    if (!selectedHembra || !selectedMacho) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/cruzas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hembra_id: selectedHembra.id,
          macho_id: selectedMacho.id,
          estanque_id: estanqueId || null,
          fecha_planeada: fechaPlaneada || null,
          notas: notas || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) { setSubmitError(body.error ?? "Error al crear la cruza"); toast.error(body.error ?? "Error al crear la cruza"); return }
      toast.success("Cruza planeada")
      onSuccess()
      onClose()
      router.push(`/dashboard/reproduccion/${body.data.id}`)
    } catch {
      setSubmitError("Error de red al crear la cruza"); toast.error("Error de red al crear la cruza")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!selectedHembra && !!selectedMacho && !submitting
  const showAlternatives = coefData && (coefData.riesgo === "moderado" || coefData.riesgo === "alto")
  const isAlto = coefData?.riesgo === "alto"

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
              width: 560,
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
                  Planear nueva cruza
                </h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  Axo calculará automáticamente el coeficiente de consanguinidad.
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

              {/* Selector row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <IndividualSelector
                  sexo="hembra" dotColor="#991b1b" labelText="Hembra"
                  selected={selectedHembra}
                  onSelect={setSelectedHembra}
                  onDeselect={() => setSelectedHembra(null)}
                  refugioId={refugioId}
                />
                <IndividualSelector
                  sexo="macho" dotColor="#1e3a8a" labelText="Macho"
                  selected={selectedMacho}
                  onSelect={setSelectedMacho}
                  onDeselect={() => setSelectedMacho(null)}
                  refugioId={refugioId}
                />
              </div>

              {/* Coef loading */}
              {coefLoading && (
                <div style={{ backgroundColor: "#f9f9f7", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
                    Calculando coeficiente…
                  </span>
                </div>
              )}

              {/* Coef result */}
              {!coefLoading && coefData && selectedHembra && selectedMacho && (
                <CoefCard data={coefData} hembra={selectedHembra} macho={selectedMacho} />
              )}

              {/* Alternatives */}
              {showAlternatives && (
                <div style={{ border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "0.5px solid #e5e2dc", paddingBottom: 10, marginBottom: 10 }}>
                    <Sparkles size={13} color="#1a6560" />
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>Alternativas sugeridas por Axo AI</span>
                  </div>
                  {ALTERNATIVAS_MOCK.map((alt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < ALTERNATIVAS_MOCK.length - 1 ? "0.5px solid #edeae4" : "none" }}>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{alt.pair}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#15803d" }}>{alt.coef.toFixed(2)}</span>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#15803d", backgroundColor: "#f0fdf4", borderRadius: 4, padding: "1px 5px" }}>Bajo</span>
                        <button type="button"
                          style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          Usar esta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Config */}
              <div style={{ border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 14 }}>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d", margin: "0 0 12px 0", paddingBottom: 10, borderBottom: "0.5px solid #e5e2dc" }}>
                  Configuración de la cruza
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Estanque</label>
                    <select value={estanqueId} onChange={e => setEstanqueId(e.target.value)}
                      style={{ ...inputStyle, appearance: "none", cursor: "pointer", color: estanqueId ? "#0d0d0d" : "#9a958f" }}>
                      <option value="">Seleccionar...</option>
                      {estanques.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha planeada</label>
                    <input type="date" value={fechaPlaneada} onChange={e => setFechaPlaneada(e.target.value)}
                      style={{ ...inputStyle, fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Notas</label>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones..."
                    rows={2}
                    style={{ width: "100%", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "8px 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {submitError && (
                <div style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", margin: 0 }}>{submitError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
              <button type="button" onClick={onClose} disabled={submitting}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={!canSubmit}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: isAlto ? "0.5px solid #fca5a5" : "none", backgroundColor: isAlto ? "transparent" : (canSubmit ? "#1a6560" : "#9a958f"), fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: isAlto ? "#991b1b" : "#f9f9f7", cursor: canSubmit ? "pointer" : "default", transition: "background-color 150ms" }}>
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Creando cruza...</> : isAlto ? "Planear de todas formas" : "Planear cruza →"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
