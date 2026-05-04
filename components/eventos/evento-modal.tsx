"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Search, Sparkles, X as XIcon, Thermometer, Activity, ArrowRight, ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Estanque { id: string; nombre: string }
interface AjoloteOpt { id: string; codigo: string; nombre: string | null; sexo: string | null; estanque_nombre: string | null }

interface EventoModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  onSuccess: () => void
}

type TipoEvento = "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "otro"

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPOS: { val: TipoEvento; label: string; sub: string; bg: string; color: string; Icon: React.ElementType }[] = [
  { val: "muerte",               label: "Muerte",               sub: "Deceso de un individuo",     bg: "#fef2f2", color: "#991b1b", Icon: XIcon },
  { val: "enfermedad",           label: "Enfermedad",           sub: "Diagnóstico o síntomas",     bg: "#fff0f0", color: "#dc2626", Icon: Thermometer },
  { val: "tratamiento",          label: "Tratamiento",          sub: "Medicación o intervención",  bg: "#fffbeb", color: "#92400e", Icon: Activity },
  { val: "transferencia_interna",label: "Transf. interna",      sub: "Cambio de estanque",         bg: "#eff6ff", color: "#1e3a8a", Icon: ArrowRight },
  { val: "transferencia_externa",label: "Transf. externa",      sub: "Sale del refugio",           bg: "#f0f0ff", color: "#4338ca", Icon: ArrowRight },
  { val: "ingreso",              label: "Ingreso",              sub: "Nuevo individuo externo",    bg: "#f0fdf4", color: "#15803d", Icon: ArrowDownCircle },
  { val: "egreso",               label: "Egreso",               sub: "Sale permanentemente",       bg: "#f9f0ff", color: "#7c3aed", Icon: ArrowUpCircle },
  { val: "otro",                 label: "Otro",                 sub: "Observación general",        bg: "#f3f2ef", color: "#3c3a36", Icon: MoreHorizontal },
]

const tipoInfo = (t: TipoEvento) => TIPOS.find(x => x.val === t)!

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12, fontWeight: 500, color: "#0d0d0d", display: "block", marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 8, border: "0.5px solid #e5e2dc",
  backgroundColor: "#ffffff", padding: "0 12px",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", outline: "none", boxSizing: "border-box",
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function EventoModal({ open, onClose, refugioId, onSuccess }: EventoModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tipo, setTipo] = useState<TipoEvento | null>(null)
  const [estanques, setEstanques] = useState<Estanque[]>([])

  // Step 2 state
  const [ajoloteSearch, setAjoloteSearch] = useState("")
  const [ajoloteResults, setAjoloteResults] = useState<AjoloteOpt[]>([])
  const [ajoloteId, setAjoloteId] = useState<string | null>(null)
  const [ajoloteDisplay, setAjoloteDisplay] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [estanqueId, setEstanqueId] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")

  // Step 3 state — all optional, used by type
  const [causaMuerte, setCausaMuerte] = useState("")
  const [condicionEstanque, setCondicionEstanque] = useState("")
  const [encontradoPor, setEncontradoPor] = useState("")
  const [notas, setNotas] = useState("")
  const [medicamento, setMedicamento] = useState("")
  const [dosis, setDosis] = useState("")
  const [dosisUnidad, setDosisUnidad] = useState("mg/L")
  const [duracion, setDuracion] = useState("")
  const [prescritoPor, setPrescritoPor] = useState("")
  const [estanqueDestino, setEstanqueDestino] = useState("")
  const [motivo, setMotivo] = useState("")
  const [destino, setDestino] = useState("")
  const [guiaSemarnat, setGuiaSemarnat] = useState("")
  const [procedencia, setProcedencia] = useState("")
  const [oficio, setOficio] = useState("")
  const [crearAjolote, setCrearAjolote] = useState(true)
  const [nuevoCodigo, setNuevoCodigo] = useState("")
  const [nuevoSexo, setNuevoSexo] = useState("")
  const [nuevoEstanque, setNuevoEstanque] = useState("")
  const [descripcion, setDescripcion] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const resetAll = useCallback(() => {
    setStep(1); setTipo(null); setError("")
    setAjoloteSearch(""); setAjoloteResults([]); setAjoloteId(null); setAjoloteDisplay(""); setDropdownOpen(false)
    setEstanqueId("")
    const now = new Date()
    setFecha(now.toISOString().split("T")[0])
    setHora(now.toTimeString().slice(0, 5))
    setCausaMuerte(""); setCondicionEstanque(""); setEncontradoPor(""); setNotas("")
    setMedicamento(""); setDosis(""); setDosisUnidad("mg/L"); setDuracion(""); setPrescritoPor("")
    setEstanqueDestino(""); setMotivo(""); setDestino(""); setGuiaSemarnat("")
    setProcedencia(""); setOficio(""); setCrearAjolote(true); setNuevoCodigo(""); setNuevoSexo(""); setNuevoEstanque("")
    setDescripcion("")
  }, [])

  useEffect(() => {
    if (!open) return
    resetAll()
    fetch(`/api/refugios/${refugioId}/estanques`).then(r => r.json())
      .then(({ data }) => setEstanques((data ?? []).filter((e: { activo: boolean }) => e.activo !== false)))
  }, [open, refugioId, resetAll])

  useEffect(() => {
    if (!ajoloteSearch.trim()) { setAjoloteResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/refugios/${refugioId}/ajolotes?search=${encodeURIComponent(ajoloteSearch)}`)
        .then(r => r.json())
        .then(({ data }) => setAjoloteResults((data ?? []).slice(0, 6)))
    }, 250)
    return () => clearTimeout(t)
  }, [ajoloteSearch, refugioId])

  function nowChip() {
    const now = new Date()
    setFecha(now.toISOString().split("T")[0])
    setHora(now.toTimeString().slice(0, 5))
  }

  function validateStep2() {
    const needsAjolote = tipo !== "otro"
    if (needsAjolote && tipo !== "ingreso" && !ajoloteId) { setError("Selecciona un individuo"); return false }
    if (!fecha) { setError("La fecha es requerida"); return false }
    return true
  }

  function validateStep3() {
    if (tipo === "otro" && !descripcion.trim()) { setError("La descripción es requerida"); return false }
    if (tipo === "muerte" && !causaMuerte) { setError("Selecciona la causa probable"); return false }
    return true
  }

  async function handleSubmit() {
    if (!validateStep3()) return
    setSaving(true); setError("")
    try {
      const fechaHora = `${fecha}T${hora || "00:00"}:00`
      const detalles: Record<string, unknown> = {}
      if (tipo === "muerte") {
        detalles.causa_probable = causaMuerte
        detalles.condicion_estanque = condicionEstanque || null
        detalles.encontrado_por = encontradoPor || null
        detalles.notas = notas || null
      } else if (tipo === "tratamiento") {
        detalles.medicamento = medicamento
        detalles.dosis = dosis ? parseFloat(dosis) : null
        detalles.dosis_unidad = dosisUnidad
        detalles.duracion_dias = duracion ? parseInt(duracion) : null
        detalles.prescrito_por = prescritoPor || null
        detalles.notas = notas || null
      } else if (tipo === "transferencia_interna") {
        detalles.estanque_destino_id = estanqueDestino || null
        detalles.motivo = motivo || null
      } else if (tipo === "transferencia_externa" || tipo === "egreso") {
        detalles.destino = destino || null
        detalles.motivo = motivo || null
        detalles.guia_semarnat = guiaSemarnat || null
      } else if (tipo === "ingreso") {
        detalles.procedencia = procedencia || null
        detalles.numero_oficio = oficio || null
        if (crearAjolote) {
          detalles.nuevo_ajolote = { codigo: nuevoCodigo, sexo: nuevoSexo || null, estanque_id: nuevoEstanque || null }
        }
      } else {
        detalles.descripcion = descripcion
        detalles.notas = notas || null
      }

      const body: Record<string, unknown> = {
        tipo, fecha: fechaHora, detalles,
        sujeto_tipo: ajoloteId ? "ajolote" : estanqueId ? "estanque" : "refugio",
        ajolote_id: ajoloteId || null,
        estanque_id: estanqueId || null,
      }

      const res = await fetch(`/api/refugios/${refugioId}/eventos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al guardar"); toast.error(data.error ?? "Error al guardar"); return }
      toast.success("Evento registrado")
      onSuccess(); onClose()
    } catch { setError("Error de conexión"); toast.error("Error de conexión") }
    finally { setSaving(false) }
  }

  const ti = tipo ? tipoInfo(tipo) : null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ backgroundColor: "#ffffff", borderRadius: 14, width: 560, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", padding: 28, boxShadow: "0 8px 32px rgba(13,13,13,0.12)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Registrar evento</h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  {step === 1 ? "Selecciona el tipo de evento." : step === 2 ? "¿A quién afecta este evento?" : `${ti?.label} — Detalles`}
                </p>
              </div>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center" style={{ gap: 0, marginBottom: 20 }}>
              {[{ n: 1, label: "Tipo" }, { n: 2, label: "Sujeto" }, { n: 3, label: "Detalles" }].map((s, i) => (
                <div key={s.n} className="flex items-center">
                  {i > 0 && <div style={{ width: 28, height: 1, backgroundColor: step > s.n - 1 ? "#1a6560" : "#e5e2dc", margin: "0 8px" }} />}
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step >= s.n ? (ti && step >= s.n ? ti.color : "#1a6560") : "#f3f2ef", border: step >= s.n ? "none" : "0.5px solid #e5e2dc", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: step >= s.n ? "#ffffff" : "#9a958f" }}>
                      {step > s.n ? "✓" : s.n}
                    </div>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: step === s.n ? 500 : 400, color: step === s.n ? "#0d0d0d" : "#9a958f" }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "0.5px solid #e5e2dc", marginBottom: 20 }} />

            {/* ── STEP 1 — Tipo ── */}
            {step === 1 && (
              <div className="grid grid-cols-2" style={{ gap: 8 }}>
                {TIPOS.map(t => (
                  <button key={t.val} type="button" onClick={() => setTipo(t.val)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 150ms", border: tipo === t.val ? `1.5px solid ${t.color}` : "0.5px solid #e5e2dc", backgroundColor: tipo === t.val ? t.bg : "#ffffff" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `0.5px solid ${t.color}20` }}>
                      <t.Icon size={13} color={t.color} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: tipo === t.val ? t.color : "#0d0d0d" }}>{t.label}</div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f", marginTop: 1 }}>{t.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP 2 — Sujeto ── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {tipo !== "otro" && (
                  <div style={{ position: "relative" }}>
                    <label style={labelStyle}>Individuo{tipo === "ingreso" ? " (nuevo — opcional)" : ""}</label>
                    <div style={{ position: "relative" }}>
                      <Search size={13} color="#9a958f" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <input type="text" value={ajoloteDisplay || ajoloteSearch}
                        onChange={e => { if (ajoloteId) { setAjoloteId(null); setAjoloteDisplay("") }; setAjoloteSearch(e.target.value); setDropdownOpen(true) }}
                        onFocus={() => setDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                        placeholder="Buscar por código..."
                        style={{ ...inputStyle, paddingLeft: 30, fontFamily: "var(--font-dm-mono), DM Mono, monospace", height: 42 }} />
                    </div>
                    {dropdownOpen && ajoloteResults.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, overflow: "hidden", marginTop: 4, boxShadow: "0 4px 16px rgba(13,13,13,0.08)" }}>
                        {ajoloteResults.map(a => (
                          <button key={a.id} type="button"
                            onMouseDown={() => { setAjoloteId(a.id); setAjoloteDisplay(a.codigo); setAjoloteSearch(""); setDropdownOpen(false) }}
                            className="flex items-center w-full" style={{ gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "1px 5px" }}>{a.codigo}</span>
                            {a.nombre && <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{a.nombre}</span>}
                            {a.estanque_nombre && <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginLeft: "auto" }}>{a.estanque_nombre}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(tipo === "otro" || tipo === "transferencia_interna") && (
                  <div>
                    <label style={labelStyle}>Estanque relacionado <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span></label>
                    <select value={estanqueId} onChange={e => setEstanqueId(e.target.value)} style={{ ...inputStyle, height: 42, appearance: "none" }}>
                      <option value="">Ninguno</option>
                      {estanques.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Fecha y hora del evento</label>
                    <button type="button" onClick={nowChip}
                      style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#1a6560", background: "none", border: "0.5px solid #1a6560", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                      Ahora
                    </button>
                  </div>
                  <div className="flex" style={{ gap: 8 }}>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...inputStyle, flex: 1, height: 42 }} />
                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...inputStyle, width: 110, height: 42 }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 — Detalles ── */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {tipo === "muerte" && <>
                  <div>
                    <label style={labelStyle}>Causa probable <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={causaMuerte} onChange={e => setCausaMuerte(e.target.value)} style={{ ...inputStyle, height: 42, appearance: "none" }}>
                      <option value="">Seleccionar...</option>
                      <option value="toxicidad_amonio_nitrito">Toxicidad (amonio/nitrito)</option>
                      <option value="enfermedad">Enfermedad</option>
                      <option value="trauma">Trauma</option>
                      <option value="desconocida">Causa desconocida</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Condición del estanque al momento</label>
                    <textarea value={condicionEstanque} onChange={e => setCondicionEstanque(e.target.value)} placeholder="Ej. Amonio: 0.8 ppm, Temperatura: 22°C..." style={{ ...inputStyle, height: 72, padding: "8px 12px", resize: "none" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Encontrado por</label>
                    <input type="text" value={encontradoPor} onChange={e => setEncontradoPor(e.target.value)} placeholder="Nombre del operador" style={{ ...inputStyle, height: 42 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Notas adicionales</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones, signos previos..." style={{ ...inputStyle, height: 72, padding: "8px 12px", resize: "none" }} />
                  </div>
                  <div style={{ backgroundColor: "#e2f0ee", borderRadius: 6, padding: "8px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Sparkles size={13} color="#1a6560" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#1a6560", lineHeight: 1.5 }}>
                      Axo AI analizará automáticamente las causas de esta muerte al guardar el evento.
                    </span>
                  </div>
                </>}

                {tipo === "enfermedad" && <>
                  <div>
                    <label style={labelStyle}>Diagnóstico o síntomas <span style={{ color: "#dc2626" }}>*</span></label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe los síntomas observados..." style={{ ...inputStyle, height: 80, padding: "8px 12px", resize: "none" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Notas adicionales</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones, contexto..." style={{ ...inputStyle, height: 64, padding: "8px 12px", resize: "none" }} />
                  </div>
                </>}

                {tipo === "tratamiento" && <>
                  <div>
                    <label style={labelStyle}>Medicamento <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={medicamento} onChange={e => setMedicamento(e.target.value)} placeholder="Nombre del medicamento o tratamiento" style={{ ...inputStyle, height: 42 }} />
                  </div>
                  <div className="flex" style={{ gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Dosis</label>
                      <input type="number" value={dosis} onChange={e => setDosis(e.target.value)} placeholder="0.00" step="0.01" style={{ ...inputStyle, height: 42, fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
                    </div>
                    <div style={{ width: 100 }}>
                      <label style={labelStyle}>Unidad</label>
                      <select value={dosisUnidad} onChange={e => setDosisUnidad(e.target.value)} style={{ ...inputStyle, height: 42, appearance: "none" }}>
                        {["mg/L", "ml", "mg/kg", "gotas", "otro"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div style={{ width: 100 }}>
                      <label style={labelStyle}>Días</label>
                      <input type="number" value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="5" min="1" style={{ ...inputStyle, height: 42, fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Prescrito por</label>
                    <input type="text" value={prescritoPor} onChange={e => setPrescritoPor(e.target.value)} placeholder="Nombre del responsable" style={{ ...inputStyle, height: 42 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Notas</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Instrucciones adicionales..." style={{ ...inputStyle, height: 64, padding: "8px 12px", resize: "none" }} />
                  </div>
                </>}

                {tipo === "transferencia_interna" && <>
                  <div>
                    <label style={labelStyle}>Estanque destino <span style={{ color: "#dc2626" }}>*</span></label>
                    <select value={estanqueDestino} onChange={e => setEstanqueDestino(e.target.value)} style={{ ...inputStyle, height: 42, appearance: "none" }}>
                      <option value="">Seleccionar estanque...</option>
                      {estanques.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Motivo</label>
                    <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Razón del traslado" style={{ ...inputStyle, height: 42 }} />
                  </div>
                </>}

                {(tipo === "transferencia_externa" || tipo === "egreso") && <>
                  <div>
                    <label style={labelStyle}>Destino</label>
                    <input type="text" value={destino} onChange={e => setDestino(e.target.value)} placeholder="Institución o lugar de destino" style={{ ...inputStyle, height: 42 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Motivo</label>
                    <select value={motivo} onChange={e => setMotivo(e.target.value)} style={{ ...inputStyle, height: 42, appearance: "none" }}>
                      <option value="">Seleccionar...</option>
                      <option value="donacion">Donación</option>
                      <option value="venta">Venta/intercambio</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Número de guía SEMARNAT <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span></label>
                    <input type="text" value={guiaSemarnat} onChange={e => setGuiaSemarnat(e.target.value)} placeholder="SGPA/DGVS/..." style={{ ...inputStyle, height: 42, fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
                  </div>
                </>}

                {tipo === "ingreso" && <>
                  <div>
                    <label style={labelStyle}>Procedencia</label>
                    <input type="text" value={procedencia} onChange={e => setProcedencia(e.target.value)} placeholder="Institución o lugar de origen" style={{ ...inputStyle, height: 42 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Número de oficio <span style={{ color: "#9a958f", fontWeight: 400 }}>(opcional)</span></label>
                    <input type="text" value={oficio} onChange={e => setOficio(e.target.value)} placeholder="SGPA/DGVS/..." style={{ ...inputStyle, height: 42, fontFamily: "var(--font-dm-mono), DM Mono, monospace" }} />
                  </div>
                  <div style={{ border: "0.5px solid #e5e2dc", borderRadius: 8, padding: "12px 14px" }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: crearAjolote ? 14 : 0 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>¿Crear registro en inventario?</div>
                        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2 }}>Registra este individuo en la colección</div>
                      </div>
                      <button type="button" onClick={() => setCrearAjolote(!crearAjolote)}
                        style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", backgroundColor: crearAjolote ? "#1a6560" : "#e5e2dc", transition: "background-color 150ms", position: "relative", flexShrink: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ffffff", position: "absolute", top: 3, left: crearAjolote ? 19 : 3, transition: "left 150ms" }} />
                      </button>
                    </div>
                    {crearAjolote && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="flex" style={{ gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Código</label>
                            <input type="text" value={nuevoCodigo} onChange={e => setNuevoCodigo(e.target.value)} placeholder="AXL-XXX" style={{ ...inputStyle, height: 38, fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12 }} />
                          </div>
                          <div style={{ width: 110 }}>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Sexo</label>
                            <select value={nuevoSexo} onChange={e => setNuevoSexo(e.target.value)} style={{ ...inputStyle, height: 38, fontSize: 12, appearance: "none" }}>
                              <option value="">—</option>
                              <option value="macho">Macho</option>
                              <option value="hembra">Hembra</option>
                              <option value="indeterminado">Indet.</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 11 }}>Estanque</label>
                          <select value={nuevoEstanque} onChange={e => setNuevoEstanque(e.target.value)} style={{ ...inputStyle, height: 38, fontSize: 12, appearance: "none" }}>
                            <option value="">Sin asignar</option>
                            {estanques.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </>}

                {tipo === "otro" && <>
                  <div>
                    <label style={labelStyle}>Descripción <span style={{ color: "#dc2626" }}>*</span></label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe el evento..." style={{ ...inputStyle, height: 100, padding: "8px 12px", resize: "none" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Notas adicionales</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." style={{ ...inputStyle, height: 64, padding: "8px 12px", resize: "none" }} />
                  </div>
                </>}
              </div>
            )}

            {error && <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginTop: 12 }}>{error}</p>}

            {/* Footer */}
            <div className="flex items-center justify-between" style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 20 }}>
              {step > 1 ? (
                <button type="button" onClick={() => { setStep(s => (s - 1) as 1 | 2 | 3); setError("") }}
                  style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#3c3a36", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  ← Anterior
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
                  Cancelar
                </button>
              )}
              {step < 3 ? (
                <button type="button"
                  onClick={() => {
                    setError("")
                    if (step === 1) { if (!tipo) { setError("Selecciona un tipo de evento"); return }; setStep(2) }
                    else if (step === 2) { if (validateStep2()) setStep(3) }
                  }}
                  style={{ height: 34, padding: "0 18px", borderRadius: 8, border: "none", backgroundColor: ti ? ti.color : "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#ffffff", cursor: "pointer" }}>
                  Continuar →
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving}
                  style={{ height: 34, padding: "0 18px", borderRadius: 8, border: "none", backgroundColor: saving ? "#9a958f" : (ti ? ti.color : "#1a6560"), fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#ffffff", cursor: saving ? "default" : "pointer" }}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : "Guardar evento"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
