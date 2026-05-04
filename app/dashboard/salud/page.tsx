"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Search, ChevronDown } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { ObservacionModal } from "@/components/salud/observacion-modal"
import { MedicionModal } from "@/components/salud/medicion-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medicion {
  fecha_hora: string
  temperatura: number | null
  ph: number | null
  amonio: number | null
  nitrito: number | null
  oxigeno: number | null
}

interface Estanque {
  id: string
  nombre: string
  ajolotes_vivos: number
  ultima_medicion: Medicion | null
}

interface Observacion {
  id: string
  sujeto_tipo: "ajolote" | "estanque" | "lote"
  ajolote_id: string | null
  estanque_id: string | null
  severidad: "leve" | "moderada" | "grave" | "critica" | null
  descripcion: string
  fecha_hora: string
  registrado_por: string
}

type Tab = "parametros" | "observaciones"

// ── Water quality thresholds ──────────────────────────────────────────────────

const RANGOS = {
  temperatura: { min: 16,  max: 18   },
  ph:          { min: 7.0, max: 7.8  },
  amonio:      { min: 0,   max: 0.25 },
  nitrito:     { min: 0,   max: 0.2  },
  oxigeno:     { min: 6.0, max: 10.0 },
}

function paramStatus(key: string, val: number | null): "ok" | "warning" | "critical" {
  if (val === null) return "ok"
  switch (key) {
    case "temperatura": if (val < 12 || val > 25) return "critical"; if (val < 14 || val > 22) return "warning"; return "ok"
    case "ph":          if (val < 6.5 || val > 8.5) return "critical"; if (val < 7.0 || val > 8.0) return "warning"; return "ok"
    case "amonio":      if (val > 1.0) return "critical"; if (val > 0.25) return "warning"; return "ok"
    case "nitrito":     if (val > 0.5) return "critical"; if (val > 0.2) return "warning"; return "ok"
    case "oxigeno":     if (val < 4.0) return "critical"; if (val < 6.0) return "warning"; return "ok"
    default: return "ok"
  }
}

function estanqueOverall(m: Medicion | null): "ok" | "warning" | "critical" {
  if (!m) return "ok"
  const keys = ["temperatura", "ph", "amonio", "nitrito", "oxigeno"]
  const st = keys.map(k => paramStatus(k, (m as unknown as Record<string, number | null>)[k]))
  if (st.includes("critical")) return "critical"
  if (st.includes("warning")) return "warning"
  return "ok"
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  ok:       { label: "En rango",  bg: "#f0fdf4", text: "#15803d" },
  warning:  { label: "Atención",  bg: "#fffbeb", text: "#92400e" },
  critical: { label: "Crítico",   bg: "#fef2f2", text: "#991b1b" },
}

const VALOR_COLOR: Record<string, string> = { ok: "#0d0d0d", warning: "#92400e", critical: "#991b1b" }

function formatVal(key: string, val: number | null): string {
  if (val === null) return "—"
  switch (key) {
    case "temperatura": return `${val.toFixed(1)}°C`
    case "ph": return val.toFixed(1)
    case "amonio": return `${val.toFixed(1)} ppm`
    case "nitrito": return `${val.toFixed(1)} ppm`
    case "oxigeno": return `${val.toFixed(1)} mg/L`
    default: return String(val)
  }
}

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

function formatFechaCorta(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
  if (isToday) return `Hoy ${time}`
  if (isYesterday) return `Ayer ${time}`
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + ` ${time}`
}

const SEV_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  leve:     { label: "Leve",     color: "#9a958f", bg: "#f3f2ef", text: "#3c3a36" },
  moderada: { label: "Moderada", color: "#d97706", bg: "#fffbeb", text: "#92400e" },
  grave:    { label: "Grave",    color: "#dc2626", bg: "#fef2f2", text: "#991b1b" },
  critica:  { label: "Crítica",  color: "#991b1b", bg: "#fef2f2", text: "#991b1b" },
}

const SUJETO_BADGE: Record<string, { bg: string; text: string }> = {
  ajolote: { bg: "#e2f0ee", text: "#1a6560" },
  lote:    { bg: "#eff6ff", text: "#1e3a8a" },
  estanque:{ bg: "#f3f2ef", text: "#3c3a36" },
}

// ── Range bar ─────────────────────────────────────────────────────────────────

function RangeBar({ label, min, max, unit }: { pkey?: string; label: string; min: number; max: number; unit: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", width: 100, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, position: "relative", height: 6, borderRadius: 3, overflow: "hidden", margin: "0 16px" }}>
        {/* Gradient bar: red-green-red */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #fca5a5 0%, #86efac 30%, #86efac 70%, #fca5a5 100%)", borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f", flexShrink: 0, textAlign: "right", width: 100 }}>
        {min} – {max} {unit}
      </span>
    </div>
  )
}

// ── Sub-tab ───────────────────────────────────────────────────────────────────

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
      fontSize: 12, fontWeight: active ? 500 : 400, borderRadius: 6, padding: "5px 14px",
      border: active ? "none" : "0.5px solid #e5e2dc",
      backgroundColor: active ? "#1a6560" : "#ffffff",
      color: active ? "#f9f9f7" : "#3c3a36",
      cursor: "pointer", transition: "all 150ms",
    }}>
      {label}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SaludPage() {
  const { activeRefugioId } = useRefugio()
  const [tab, setTab] = useState<Tab>("parametros")
  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [loading, setLoading] = useState(true)
  const [obsLoading, setObsLoading] = useState(false)
  const [obsModalOpen, setObsModalOpen] = useState(false)
  const [medicionModalOpen, setMedicionModalOpen] = useState(false)
  const [preselectedEstanque, setPreselectedEstanque] = useState<string | null>(null)
  const [obsSearch, setObsSearch] = useState("")
  const [obsSeveridad, setObsSeveridad] = useState("")

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/estanques`)
      if (res.ok) { const { data } = await res.json(); setEstanques((data ?? []).filter((e: Estanque & { activo: boolean }) => e.activo !== false)) }
    } finally { setLoading(false) }
  }, [activeRefugioId])

  const loadObs = useCallback(async () => {
    if (!activeRefugioId) return
    setObsLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/observaciones`)
      if (res.ok) { const { data } = await res.json(); setObservaciones(data ?? []) }
    } finally { setObsLoading(false) }
  }, [activeRefugioId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === "observaciones") loadObs() }, [tab, loadObs])

  const stats = useMemo(() => {
    const hoy = new Date().toDateString()
    const conMedicionHoy = estanques.filter(e => e.ultima_medicion && new Date(e.ultima_medicion.fecha_hora).toDateString() === hoy).length
    let totalParams = 0, enRango = 0, alertas = 0
    const KEYS = ["temperatura", "ph", "amonio", "nitrito", "oxigeno"]
    estanques.forEach(e => {
      if (!e.ultima_medicion) return
      KEYS.forEach(k => {
        const val = (e.ultima_medicion as unknown as Record<string, number | null>)[k]
        if (val !== null) {
          totalParams++
          const s = paramStatus(k, val)
          if (s === "ok") enRango++
          else alertas++
        }
      })
    })
    const ultima = estanques.reduce((latest, e) => {
      if (!e.ultima_medicion) return latest
      const t = new Date(e.ultima_medicion.fecha_hora).getTime()
      return t > latest.t ? { t, medicion: e.ultima_medicion, estanque: e } : latest
    }, { t: 0, medicion: null as Medicion | null, estanque: null as Estanque | null })
    return { conMedicionHoy, total: estanques.length, totalParams, enRango, alertas, ultima }
  }, [estanques])

  const filteredObs = useMemo(() => {
    let list = observaciones
    if (obsSearch) list = list.filter(o => o.descripcion.toLowerCase().includes(obsSearch.toLowerCase()))
    if (obsSeveridad) list = list.filter(o => o.severidad === obsSeveridad)
    return list
  }, [observaciones, obsSearch, obsSeveridad])

  const PARAMS_TABLE = [
    { key: "temperatura", label: "TEMP" },
    { key: "ph", label: "PH" },
    { key: "amonio", label: "AMONIO" },
    { key: "nitrito", label: "NITRITO" },
    { key: "oxigeno", label: "OXÍGENO" },
  ]

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Salud</h1>
        <div className="flex items-center" style={{ gap: 8 }}>
          <SubTab label="Parámetros" active={tab === "parametros"} onClick={() => setTab("parametros")} />
          <SubTab label="Observaciones" active={tab === "observaciones"} onClick={() => setTab("observaciones")} />
          {tab === "parametros" ? (
            <button type="button" onClick={() => { setPreselectedEstanque(null); setMedicionModalOpen(true) }}
              className="flex items-center gap-1.5"
              style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
              <Plus size={14} />Registrar medición
            </button>
          ) : (
            <button type="button" onClick={() => setObsModalOpen(true)}
              className="flex items-center gap-1.5"
              style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
              <Plus size={14} />Nueva observación
            </button>
          )}
        </div>
      </div>

      {/* ── PARÁMETROS TAB ── */}
      {tab === "parametros" && (
        <>
          {/* Status cards */}
          <div className="grid grid-cols-4" style={{ gap: 12, marginBottom: 16 }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
                  <Skeleton style={{ width: 80, height: 10 }} />
                  <Skeleton style={{ width: 100, height: 28, marginTop: 12 }} />
                  <Skeleton style={{ width: "100%", height: 3, marginTop: 12 }} />
                </div>
              ))
            ) : (
              <>
                {/* Card 1 */}
                <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em" }}>Estanques hoy</span>
                  <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 28, fontWeight: 500, color: "#0d0d0d" }}>{stats.conMedicionHoy}/{stats.total}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>con medición hoy</span>
                  </div>
                  <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden", marginTop: 12 }}>
                    <div style={{ width: `${stats.total > 0 ? (stats.conMedicionHoy / stats.total) * 100 : 0}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
                  </div>
                </div>
                {/* Card 2 */}
                <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em" }}>En rango</span>
                  <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 28, fontWeight: 500, color: "#15803d" }}>{stats.enRango}/{stats.totalParams}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>parámetros ok</span>
                  </div>
                  <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden", marginTop: 12 }}>
                    <div style={{ width: `${stats.totalParams > 0 ? (stats.enRango / stats.totalParams) * 100 : 0}%`, height: "100%", backgroundColor: "#15803d", borderRadius: 2 }} />
                  </div>
                </div>
                {/* Card 3 */}
                <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em" }}>Alertas activas</span>
                  <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 28, fontWeight: 500, color: stats.alertas > 0 ? "#991b1b" : "#0d0d0d" }}>{stats.alertas}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>parámetros fuera de rango</span>
                  </div>
                  <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden", marginTop: 12 }}>
                    <div style={{ width: `${stats.totalParams > 0 ? (stats.alertas / stats.totalParams) * 100 : 0}%`, height: "100%", backgroundColor: "#991b1b", borderRadius: 2 }} />
                  </div>
                </div>
                {/* Card 4 */}
                <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em" }}>Última medición</span>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 20, fontWeight: 500, color: "#0d0d0d" }}>
                      {stats.ultima.medicion ? relTime(stats.ultima.medicion.fecha_hora) : "—"}
                    </span>
                    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 4 }}>
                      {stats.ultima.estanque && stats.ultima.medicion
                        ? `${stats.ultima.estanque.nombre} · ${formatFechaCorta(stats.ultima.medicion.fecha_hora)}`
                        : "Sin mediciones"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status table */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ padding: "14px 16px", borderBottom: "0.5px solid #e5e2dc" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Estado del agua por estanque</span>
              {stats.ultima.medicion && (
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
                  Última actualización {relTime(stats.ultima.medicion.fecha_hora).toLowerCase()}
                </span>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 100px 100px 110px 130px 90px", minWidth: 870, padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
              {["ESTANQUE", "TEMP", "PH", "AMONIO", "NITRITO", "OXÍGENO", "ESTADO", "MEDICIÓN", "ACCIÓN"].map((h, i) => (
                <span key={h} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textAlign: i === 0 ? "left" : "center" }}>{h}</span>
              ))}
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 100px 100px 110px 130px 90px", minWidth: 870, padding: "14px 16px", borderBottom: "0.5px solid #edeae4" }}>
                  <Skeleton style={{ width: 120, height: 13 }} />
                  {Array.from({ length: 7 }).map((_, j) => <Skeleton key={j} style={{ width: 50, height: 13 }} />)}
                  <Skeleton style={{ width: 60, height: 13 }} />
                </div>
              ))
            ) : estanques.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "#9a958f" }}>Sin estanques registrados</div>
            ) : (
              estanques.map((e, i) => {
                const m = e.ultima_medicion
                const overall = estanqueOverall(m)
                const badge = STATUS_BADGE[overall]
                const hoy = m ? new Date(m.fecha_hora).toDateString() === new Date().toDateString() : false
                const isLast = i === estanques.length - 1

                return (
                  <div key={e.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 100px 100px 110px 130px 90px", minWidth: 870, padding: "14px 16px", borderBottom: isLast ? "none" : "0.5px solid #edeae4", backgroundColor: "#ffffff", transition: "background-color 100ms", cursor: "pointer" }}
                    onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "#ffffff")}>

                    {/* Estanque name */}
                    <div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: overall === "ok" ? "#15803d" : overall === "warning" ? "#d97706" : "#dc2626", flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>{e.nombre}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2, marginLeft: 16 }}>
                        {e.ajolotes_vivos} individuos
                      </div>
                    </div>

                    {/* Parameters */}
                    {PARAMS_TABLE.map(({ key }) => {
                      const val = m ? (m as unknown as Record<string, number | null>)[key] : null
                      const st = paramStatus(key, val)
                      const color = VALOR_COLOR[st]
                      return (
                        <div key={key} className="flex items-center justify-center" style={{ gap: 4 }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color }}>
                            {val !== null ? formatVal(key, val).split(" ")[0] : "—"}
                          </span>
                        </div>
                      )
                    })}

                    {/* Status */}
                    <div className="flex items-center justify-center">
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, borderRadius: 999, padding: "2px 8px", backgroundColor: m ? badge.bg : "#f3f2ef", color: m ? badge.text : "#9a958f" }}>
                        {m ? badge.label : "Sin datos"}
                      </span>
                    </div>

                    {/* Medición time */}
                    <div className="flex items-center justify-center">
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: hoy ? "#9a958f" : "#92400e" }}>
                        {m ? formatFechaCorta(m.fecha_hora) : "—"}
                      </span>
                    </div>

                    {/* Acción */}
                    <div className="flex items-center justify-center">
                      <button type="button"
                        onClick={() => { setPreselectedEstanque(e.id); setMedicionModalOpen(true) }}
                        style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: m ? 400 : 500 }}>
                        + Medición
                      </button>
                    </div>
                  </div>
                )
              })
            )}
            </div>{/* end overflowX wrapper */}
          </div>

          {/* Reference ranges */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>Rangos óptimos para Ambystoma mexicanum</div>
              <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 3 }}>Fuente: datos validados para cautiverio en CDMX</div>
            </div>
            <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
              {[
                { pkey: "temperatura", label: "Temperatura", min: RANGOS.temperatura.min, max: RANGOS.temperatura.max, unit: "°C" },
                { pkey: "ph",          label: "pH",          min: RANGOS.ph.min,          max: RANGOS.ph.max,          unit: "" },
                { pkey: "amonio",      label: "Amonio",      min: RANGOS.amonio.min,      max: RANGOS.amonio.max,      unit: "ppm" },
                { pkey: "nitrito",     label: "Nitrito",     min: RANGOS.nitrito.min,     max: RANGOS.nitrito.max,     unit: "ppm" },
                { pkey: "oxigeno",     label: "Oxígeno",     min: RANGOS.oxigeno.min,     max: RANGOS.oxigeno.max,     unit: "mg/L" },
              ].map(p => <RangeBar key={p.pkey} {...p} />)}
            </div>
          </div>
        </>
      )}

      {/* ── OBSERVACIONES TAB ── */}
      {tab === "observaciones" && (
        <>
          {/* Filter bar */}
          <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
            <div className="flex items-center" style={{ width: 240, height: 36, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 10px", gap: 6 }}>
              <Search size={14} color="#9a958f" style={{ flexShrink: 0 }} />
              <input type="text" value={obsSearch} onChange={e => setObsSearch(e.target.value)} placeholder="Buscar observación..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d" }} />
            </div>
            <div style={{ position: "relative" }}>
              <select value={obsSeveridad} onChange={e => setObsSeveridad(e.target.value)}
                style={{ height: 36, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 32px 0 12px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", cursor: "pointer", appearance: "none", outline: "none" }}>
                <option value="">Severidad: Todas</option>
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
                <option value="critica">Crítica</option>
              </select>
              <ChevronDown size={13} color="#9a958f" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Observations list */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
            {obsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "0.5px solid #edeae4", display: "flex", gap: 12 }}>
                  <Skeleton style={{ width: 4, height: 60, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: 120, height: 13, marginBottom: 8 }} />
                    <Skeleton style={{ width: "90%", height: 13, marginBottom: 6 }} />
                    <Skeleton style={{ width: 180, height: 11 }} />
                  </div>
                </div>
              ))
            ) : filteredObs.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "#9a958f" }}>
                  {obsSearch || obsSeveridad ? "Sin resultados." : "Sin observaciones registradas."}
                </div>
              </div>
            ) : (
              filteredObs.map((o, i) => {
                const sev = o.severidad ? SEV_META[o.severidad] : SEV_META.leve
                const sujBadge = SUJETO_BADGE[o.sujeto_tipo] ?? SUJETO_BADGE.estanque
                return (
                  <div key={o.id} className="flex items-stretch"
                    style={{ borderBottom: i < filteredObs.length - 1 ? "0.5px solid #edeae4" : "none", backgroundColor: "#ffffff", transition: "background-color 100ms" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                    {/* Severity bar */}
                    <div style={{ width: 4, backgroundColor: sev.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "14px 16px" }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "2px 6px", backgroundColor: sujBadge.bg, color: sujBadge.text }}>
                            {o.sujeto_tipo}
                          </span>
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, borderRadius: 999, padding: "2px 8px", backgroundColor: sev.bg, color: sev.text }}>
                            {sev.label}
                          </span>
                        </div>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>
                          {relTime(o.fecha_hora)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
                        {o.descripcion}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeRefugioId && (
        <ObservacionModal open={obsModalOpen} onClose={() => setObsModalOpen(false)} refugioId={activeRefugioId} onSuccess={loadObs} />
      )}
      {activeRefugioId && (
        <MedicionModal open={medicionModalOpen} onClose={() => setMedicionModalOpen(false)} refugioId={activeRefugioId} onSuccess={load} preselectedEstanqueId={preselectedEstanque} />
      )}
    </div>
  )
}
