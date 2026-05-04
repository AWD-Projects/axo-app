"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  FileText, ChevronRight, AlertTriangle, Check,
  Download, Calendar, ArrowRight, ArrowLeft, X,
} from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ──────────────────────────────────────────────────────────────────────

export type TipoReporte = "uma_trimestral" | "inventario" | "mortalidad" | "salud" | "reproduccion"
type Step = "tipo" | "periodo" | "review" | "generating" | "success"

interface QuarterOption {
  label: string
  period: string
  inicio: string
  fin: string
  current?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedTipo?: TipoReporte | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoReporte, {
  bg: string; text: string; border: string; bgSubtle: string
  label: string; desc: string; semarnat?: boolean
}> = {
  uma_trimestral: {
    bg: "#e2f0ee", text: "#1a6560", border: "#1a6560", bgSubtle: "#f0f8f6",
    label: "Reporte UMA trimestral",
    desc: "Reporte oficial para SEMARNAT con altas, bajas e inventario del trimestre.",
    semarnat: true,
  },
  inventario: {
    bg: "#f0fdf4", text: "#15803d", border: "#15803d", bgSubtle: "#f6fdf9",
    label: "Reporte de inventario",
    desc: "Estado actual de todos los individuos: conteos, morfotipos, edades y estanques.",
  },
  mortalidad: {
    bg: "#fef2f2", text: "#991b1b", border: "#991b1b", bgSubtle: "#fff7f7",
    label: "Reporte de mortalidad",
    desc: "Análisis de muertes del período: causas, tendencias y tasa de mortalidad.",
  },
  salud: {
    bg: "#eff6ff", text: "#1e3a8a", border: "#1e3a8a", bgSubtle: "#f4f8ff",
    label: "Reporte de salud del agua",
    desc: "Historial de parámetros, alertas generadas y tendencias por estanque.",
  },
  reproduccion: {
    bg: "#f9f0ff", text: "#7c3aed", border: "#7c3aed", bgSubtle: "#fbf6ff",
    label: "Reporte reproductivo",
    desc: "Cruzas, puestas, supervivencia larval y diversidad genética de la colonia.",
  },
}

const TIPOS_ORDER: TipoReporte[] = ["uma_trimestral", "inventario", "mortalidad", "salud", "reproduccion"]

const GENERATING_STEPS = [
  "Recopilando inventario...",
  "Calculando altas y bajas...",
  "Construyendo el PDF...",
  "Finalizando...",
]

const UMA_SECTIONS = [
  { name: "Encabezado del refugio", detail: "Nombre, número UMA, responsable técnico, período" },
  { name: "Inventario inicial", detail: "Individuos al inicio del trimestre" },
  { name: "Altas del trimestre", detail: "Ingresos externos y nacimientos del período" },
  { name: "Bajas del trimestre", detail: "Muertes y egresos del período" },
  { name: "Inventario final", detail: "Individuos al cierre del trimestre" },
  { name: "Firma del responsable técnico", detail: "Campo para firma manual del responsable" },
]

// ── Styles ─────────────────────────────────────────────────────────────────────

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
  fontFamily: "var(--font-dm-mono), DM Mono, monospace",
  fontSize: 13, color: "#0d0d0d", outline: "none", boxSizing: "border-box",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getQuarters(): QuarterOption[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const currentQ = Math.ceil(month / 3)
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const quarters: QuarterOption[] = []

  for (let offset = -3; offset <= 0; offset++) {
    let q = currentQ + offset
    let y = year
    while (q < 1) { q += 4; y-- }

    const startM = (q - 1) * 3 + 1
    const endM = q * 3
    const endDay = new Date(y, endM, 0).getDate()

    quarters.push({
      label: `Q${q} ${y}`,
      period: `${MONTHS[startM - 1]}–${MONTHS[endM - 1]} ${y}`,
      inicio: `${y}-${String(startM).padStart(2, "0")}-01`,
      fin: `${y}-${String(endM).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
      current: q === currentQ && y === year,
    })
  }

  return quarters
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GenerarReporteModal({ open, onClose, onSuccess, preselectedTipo }: Props) {
  const { activeRefugioId, activeRefugio, user } = useRefugio()

  const [step, setStep] = useState<Step>(
    preselectedTipo && TIPO_CONFIG[preselectedTipo] ? "periodo" : "tipo"
  )
  const [tipo, setTipo] = useState<TipoReporte | null>(
    preselectedTipo && TIPO_CONFIG[preselectedTipo] ? preselectedTipo : null
  )
  const [periodoKey, setPeriodoKey] = useState<string | null>(null)
  const [customInicio, setCustomInicio] = useState("")
  const [customFin, setCustomFin] = useState("")
  const [generatingStep, setGeneratingStep] = useState(-1)
  const [apiDone, setApiDone] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfFilename, setPdfFilename] = useState("Reporte_Axo.pdf")
  const [error, setError] = useState<string | null>(null)

  const quarters = getQuarters()
  const currentQ = quarters.find(q => q.current) ?? quarters[quarters.length - 1]

  // Reset when opened with a new preselectedTipo
  useEffect(() => {
    if (open) {
      setStep(preselectedTipo && TIPO_CONFIG[preselectedTipo] ? "periodo" : "tipo")
      setTipo(preselectedTipo && TIPO_CONFIG[preselectedTipo] ? preselectedTipo : null)
      setPeriodoKey(preselectedTipo === "uma_trimestral" ? currentQ.label : null)
      setCustomInicio("")
      setCustomFin("")
      setGeneratingStep(-1)
      setApiDone(false)
      setPdfUrl(null)
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Pre-select current quarter for UMA
  useEffect(() => {
    if (tipo === "uma_trimestral" && !periodoKey) {
      setPeriodoKey(currentQ.label)
    }
  }, [tipo, periodoKey, currentQ.label])

  // Generating animation
  useEffect(() => {
    if (step !== "generating") return
    let cur = 0
    setGeneratingStep(0)
    const interval = setInterval(() => {
      cur++
      setGeneratingStep(cur)
      if (cur >= GENERATING_STEPS.length) clearInterval(interval)
    }, 1500)
    return () => clearInterval(interval)
  }, [step])

  // Transition to success when both animation and API done
  useEffect(() => {
    if (step === "generating" && apiDone && generatingStep >= GENERATING_STEPS.length) {
      const t = setTimeout(() => setStep("success"), 400)
      return () => clearTimeout(t)
    }
  }, [step, apiDone, generatingStep])

  const selectedQ = periodoKey === "custom" ? null : quarters.find(q => q.label === periodoKey)
  const selectedPeriodo = periodoKey === "custom"
    ? (customInicio && customFin ? { inicio: customInicio, fin: customFin, label: `${customInicio}–${customFin}`, period: `${customInicio} – ${customFin}` } : null)
    : (selectedQ ? { inicio: selectedQ.inicio, fin: selectedQ.fin, label: selectedQ.label, period: selectedQ.period } : null)

  async function handleGenerar() {
    if (!activeRefugioId || !tipo || !selectedPeriodo) return
    setError(null)
    setStep("generating")
    setGeneratingStep(0)
    setApiDone(false)

    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/reportes/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, periodo_inicio: selectedPeriodo.inicio, periodo_fin: selectedPeriodo.fin }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Error al generar el reporte")
      }

      const { data } = await res.json()
      const id = data.reporte_id as string
      setPdfUrl(`/api/refugios/${activeRefugioId}/reportes/${id}/pdf`)
      setPdfFilename(`Reporte_${tipo.replace(/_/g, "-")}_${selectedPeriodo.label.replace(/\s/g, "_")}.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setStep("review")
    } finally {
      setApiDone(true)
    }
  }

  const tipoConfig = tipo ? TIPO_CONFIG[tipo] : null
  const userName = user ? [user.nombre, user.apellido].filter(Boolean).join(" ") : "—"
  const isCloseable = step !== "generating"

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (isCloseable && e.target === e.currentTarget) onClose() }}
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
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  {step === "tipo" && "Generar reporte"}
                  {step === "periodo" && "Selecciona el período"}
                  {step === "review" && "Revisa y genera"}
                  {step === "generating" && "Generando reporte..."}
                  {step === "success" && "Reporte generado"}
                </h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  {step === "tipo" && "Selecciona el tipo de reporte a generar."}
                  {step === "periodo" && "Elige el período que cubre el reporte."}
                  {step === "review" && "Confirma los datos antes de generar el PDF."}
                  {step === "generating" && "Axo está compilando los datos del período."}
                  {step === "success" && `${tipo ? TIPO_CONFIG[tipo].label : "Reporte"} · ${activeRefugio?.nombre ?? ""}`}
                </p>
              </div>
              {isCloseable && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f", flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* ── STEP 1: TIPO ── */}
            {step === "tipo" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}>
                  {TIPOS_ORDER.map(t => {
                    const cfg = TIPO_CONFIG[t]
                    const selected = tipo === t
                    return (
                      <div
                        key={t}
                        style={{
                          backgroundColor: selected ? cfg.bgSubtle : "#ffffff",
                          border: selected ? `1.5px solid ${cfg.border}` : "0.5px solid #e5e2dc",
                          borderRadius: 10, padding: "14px 16px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          cursor: "pointer", transition: "border-color 150ms, background-color 150ms",
                        }}
                        onClick={() => setTipo(t)}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = cfg.border }}
                        onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "#e5e2dc" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={16} color={cfg.text} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>{cfg.label}</div>
                            <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>{cfg.desc}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                          {cfg.semarnat && (
                            <span style={{ fontSize: 10, fontWeight: 500, borderRadius: 4, padding: "2px 6px", backgroundColor: "#e2f0ee", color: "#1a6560" }}>
                              SEMARNAT
                            </span>
                          )}
                          <ChevronRight size={16} color="#e5e2dc" />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
                  <button type="button" onClick={onClose}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => { if (tipo) setStep("periodo") }} disabled={!tipo}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: tipo ? "#1a6560" : "#e5e2dc", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: tipo ? "#f9f9f7" : "#9a958f", cursor: tipo ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, transition: "background-color 150ms" }}
                    onMouseEnter={e => { if (tipo) e.currentTarget.style.backgroundColor = "#144f4b" }}
                    onMouseLeave={e => { if (tipo) e.currentTarget.style.backgroundColor = "#1a6560" }}>
                    Continuar <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: PERÍODO ── */}
            {step === "periodo" && (
              <>
                {tipo === "uma_trimestral" && (
                  <>
                    <label style={labelStyle}>Período trimestral</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      {quarters.map(q => {
                        const selected = periodoKey === q.label
                        return (
                          <div key={q.label}
                            style={{ flex: 1, position: "relative", backgroundColor: selected ? "#e2f0ee" : "#ffffff", border: selected ? "1.5px solid #1a6560" : "0.5px solid #e5e2dc", borderRadius: 8, padding: "10px 12px", textAlign: "center", cursor: "pointer", transition: "border-color 150ms, background-color 150ms" }}
                            onClick={() => setPeriodoKey(q.label)}
                            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "#1a6560" }}
                            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "#e5e2dc" }}
                          >
                            {q.current && (
                              <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", border: "0.5px solid #1a6560", borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>
                                actual
                              </div>
                            )}
                            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{q.label}</div>
                            <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>{q.period}</div>
                          </div>
                        )
                      })}
                      <div
                        style={{ flex: 1, backgroundColor: periodoKey === "custom" ? "#e2f0ee" : "#ffffff", border: periodoKey === "custom" ? "1.5px solid #1a6560" : "0.5px solid #e5e2dc", borderRadius: 8, padding: "10px 12px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "border-color 150ms" }}
                        onClick={() => setPeriodoKey("custom")}
                        onMouseEnter={e => { if (periodoKey !== "custom") e.currentTarget.style.borderColor = "#1a6560" }}
                        onMouseLeave={e => { if (periodoKey !== "custom") e.currentTarget.style.borderColor = "#e5e2dc" }}
                      >
                        <Calendar size={13} color="#9a958f" />
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>Personalizado</div>
                      </div>
                    </div>
                  </>
                )}

                {(tipo !== "uma_trimestral" || periodoKey === "custom") && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Fecha inicio</label>
                      <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)} style={inputStyle} />
                    </div>
                    <span style={{ fontSize: 13, color: "#9a958f", paddingBottom: 10 }}>→</span>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Fecha fin</label>
                      <input type="date" value={customFin} onChange={e => setCustomFin(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                )}

                {selectedPeriodo && (
                  <div style={{ backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 14, marginBottom: 0 }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d", margin: "0 0 10px 0" }}>
                      Vista previa de datos disponibles
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { label: "Período", value: selectedPeriodo.period },
                        { label: "Tipo", value: tipo ? TIPO_CONFIG[tipo].label : "—" },
                        { label: "Refugio", value: activeRefugio?.nombre ?? "—" },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "#9a958f" }}>{row.label}</span>
                          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #e5e2dc", display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={9} color="#15803d" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#15803d" }}>Datos disponibles para generar el reporte</span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
                  <button type="button" onClick={() => setStep("tipo")}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                    <ArrowLeft size={14} /> Cambiar tipo
                  </button>
                  <button type="button" onClick={() => { if (selectedPeriodo) setStep("review") }} disabled={!selectedPeriodo}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: selectedPeriodo ? "#1a6560" : "#e5e2dc", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: selectedPeriodo ? "#f9f9f7" : "#9a958f", cursor: selectedPeriodo ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, transition: "background-color 150ms" }}
                    onMouseEnter={e => { if (selectedPeriodo) e.currentTarget.style.backgroundColor = "#144f4b" }}
                    onMouseLeave={e => { if (selectedPeriodo) e.currentTarget.style.backgroundColor = "#1a6560" }}>
                    Continuar <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: REVIEW ── */}
            {step === "review" && tipo && tipoConfig && selectedPeriodo && (
              <>
                {error && (
                  <div style={{ backgroundColor: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", margin: 0 }}>{error}</p>
                  </div>
                )}

                <div style={{ border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "0 16px", marginBottom: 16 }}>
                  {[
                    { label: "Tipo", badge: true },
                    { label: "Refugio", value: activeRefugio?.nombre ?? "—" },
                    { label: "Período", value: `${selectedPeriodo.label} · ${selectedPeriodo.period}`, mono: true },
                    { label: "Generado por", value: userName },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "0.5px solid #edeae4" : "none" }}>
                      <span style={{ fontSize: 12, color: "#9a958f" }}>{row.label}</span>
                      {row.badge ? (
                        <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 4, padding: "2px 8px", backgroundColor: tipoConfig.bg, color: tipoConfig.text }}>
                          {tipoConfig.label}
                        </span>
                      ) : (
                        <span style={{ fontFamily: row.mono ? "var(--font-dm-mono), DM Mono, monospace" : undefined, fontSize: 13, color: "#0d0d0d" }}>
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {tipo === "uma_trimestral" && (
                  <div style={{ border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d", margin: "0 0 10px 0", paddingBottom: 10, borderBottom: "0.5px solid #e5e2dc" }}>
                      Contenido del reporte UMA
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {UMA_SECTIONS.map(s => (
                        <div key={s.name} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                            <Check size={9} color="#15803d" strokeWidth={3} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "#9a958f", marginTop: 1 }}>{s.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tipo === "uma_trimestral" && (
                  <div style={{ backgroundColor: "#fffbeb", border: "0.5px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <AlertTriangle size={14} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                      El PDF generado incluye un espacio para firma manual del responsable técnico antes de presentarlo ante SEMARNAT.
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
                  <button type="button" onClick={() => setStep("periodo")}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                    <ArrowLeft size={14} /> Atrás
                  </button>
                  <button type="button" onClick={handleGenerar}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#144f4b")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}>
                    <FileText size={14} /> Generar PDF
                  </button>
                </div>
              </>
            )}

            {/* ── GENERATING ── */}
            {step === "generating" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #e5e2dc" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#1a6560", animation: "spin 800ms linear infinite" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={24} color="#9a958f" />
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginTop: 20 }}>Generando tu reporte...</div>
                <div style={{ fontSize: 13, color: "#9a958f", marginTop: 4 }}>Axo está compilando los datos del período.</div>
                <div style={{ marginTop: 24, width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
                  {GENERATING_STEPS.map((label, i) => {
                    const isDone = generatingStep > i
                    const isActive = generatingStep === i
                    return (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, backgroundColor: isDone ? "#1a6560" : isActive ? "#e2f0ee" : "transparent", border: isDone || isActive ? "none" : "0.5px solid #e5e2dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isDone ? (
                            <Check size={10} color="#f9f9f7" strokeWidth={3} />
                          ) : isActive ? (
                            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "#1a6560", animation: "spin 600ms linear infinite" }} />
                          ) : (
                            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>{i + 1}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: isDone ? "#9a958f" : isActive ? "#0d0d0d" : "#9a958f", fontWeight: isActive ? 500 : 400 }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#e2f0ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={26} color="#1a6560" strokeWidth={2.5} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginTop: 14 }}>Reporte generado exitosamente</div>

                  <div style={{ marginTop: 16, width: "100%", backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ backgroundColor: "#e2f0ee", borderRadius: 8, padding: 14, flexShrink: 0 }}>
                      <FileText size={28} color="#1a6560" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pdfFilename}
                      </div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 3 }}>
                        PDF · Generado hoy {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {pdfUrl && (
                        <a href={pdfUrl} download={pdfFilename} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "5px 10px", borderRadius: 8, backgroundColor: "#1a6560", color: "#f9f9f7", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                          <Download size={13} /> Descargar PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24 }}>
                  <button type="button"
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                    Enviar por email
                  </button>
                  <button type="button" onClick={() => { onSuccess(); onClose() }}
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#144f4b")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}>
                    Ver en reportes
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
