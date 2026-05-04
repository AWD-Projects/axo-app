"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { EstanqueModal } from "@/components/estanques/estanque-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medicion {
  fecha_hora: string
  temperatura: number | null
  ph: number | null
  amonio: number | null
  nitrito: number | null
  nitrato: number | null
  oxigeno: number | null
  notas: string | null
}

interface Ajolote {
  id: string
  codigo: string
  nombre: string | null
  sexo: string | null
  estado: string
  morfotipo: string | null
}

interface EstanqueDetail {
  id: string
  refugio_id: string
  nombre: string
  capacidad_litros: number | null
  tipo_sistema: string | null
  ubicacion_fisica: string | null
  notas: string | null
  activo: boolean
  mediciones: Medicion[]
  ajolotes: Ajolote[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function overallStatus(m: Medicion | null): "ok" | "warning" | "critical" {
  if (!m) return "ok"
  const keys = ["temperatura", "ph", "amonio", "nitrito", "oxigeno"]
  const statuses = keys.map(k => paramStatus(k, (m as unknown as Record<string, number | null>)[k] as number | null))
  if (statuses.includes("critical")) return "critical"
  if (statuses.includes("warning")) return "warning"
  return "ok"
}

function statusBadge(s: "ok" | "warning" | "critical") {
  if (s === "critical") return { label: "Crítico", bg: "#fef2f2", text: "#991b1b" }
  if (s === "warning") return { label: "Con alerta", bg: "#fffbeb", text: "#92400e" }
  return { label: "En rango", bg: "#f0fdf4", text: "#15803d" }
}

function barColor(s: "ok" | "warning" | "critical") {
  if (s === "critical") return "#dc2626"
  if (s === "warning") return "#d97706"
  return "#1a6560"
}

function paramFill(key: string, val: number | null): number {
  if (val === null) return 0
  switch (key) {
    case "temperatura": return Math.min(Math.max((val - 10) / 15, 0), 1)
    case "ph": return Math.min(Math.max((val - 5.5) / 3.5, 0), 1)
    case "amonio": return Math.min(Math.max(val / 1.0, 0), 1)
    case "nitrito": return Math.min(Math.max(val / 0.5, 0), 1)
    case "oxigeno": return Math.min(Math.max(val / 10, 0), 1)
    default: return 0
  }
}

function formatVal(key: string, val: number | null): string {
  if (val === null) return "—"
  switch (key) {
    case "temperatura": return `${val.toFixed(1)}°C`
    case "ph": return val.toFixed(1)
    case "amonio": return `${val.toFixed(2)} mg/L`
    case "nitrito": return `${val.toFixed(2)} mg/L`
    case "oxigeno": return `${val.toFixed(1)} mg/L`
    default: return String(val)
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "ayer"
  return `hace ${days}d`
}

function formatFecha(dateStr: string): string {
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

const TIPO_LABELS: Record<string, string> = {
  recirculacion: "Sistema recirculación",
  estatico: "Sistema estático",
  mixto: "Sistema mixto",
}

const MORFOTIPO_LABELS: Record<string, string> = {
  leucistico: "Leucístico",
  albino: "Albino",
  melanico: "Melánico",
  golden: "Golden",
  axanthic: "Axántico",
  wild: "Silvestre",
}

const SEXO_LABELS: Record<string, string> = {
  macho: "Macho",
  hembra: "Hembra",
  indeterminado: "Indet.",
}

const PARAMS = [
  { key: "temperatura", label: "Temperatura" },
  { key: "ph", label: "pH" },
  { key: "amonio", label: "Amonio" },
  { key: "nitrito", label: "Nitrito" },
  { key: "oxigeno", label: "Oxígeno" },
]

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, color, warning }: { values: number[]; color: string; warning?: boolean }) {
  if (values.length < 2) {
    return <div style={{ flex: 1, height: 36 }} />
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 100
  const H = 36
  const pad = 3

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - 2 * pad)
    const y = H - pad - ((v - min) / range) * (H - 2 * pad)
    return [x, y] as [number, number]
  })

  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ")
  const areaPath = `M ${points[0][0]},${H} ` +
    points.map(([x, y]) => `L ${x},${y}`).join(" ") +
    ` L ${points[points.length - 1][0]},${H} Z`

  const lastX = points[points.length - 1][0]
  const lastY = points[points.length - 1][1]

  const fillColor = warning ? "#d97706" : color
  const areaFill = warning ? "rgba(217,119,6,0.08)" : "rgba(26,101,96,0.08)"

  return (
    <div style={{ flex: 1, height: 36, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
        <path d={areaPath} fill={areaFill} />
        <polyline points={polyline} fill="none" stroke={fillColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={fillColor} />
      </svg>
    </div>
  )
}

function TrendArrow({ values }: { values: number[] }) {
  if (values.length < 2) return <Minus size={10} color="#9a958f" />
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  const delta = last - prev
  if (Math.abs(delta) < 0.05) return <Minus size={10} color="#9a958f" />
  if (delta > 0) return <ArrowUp size={10} color="#d97706" />
  return <ArrowDown size={10} color="#1a6560" />
}

// ── Parameter Row (large) ─────────────────────────────────────────────────────

function ParamRow({ pkey, label, val }: { pkey: string; label: string; val: number | null }) {
  const status = paramStatus(pkey, val)
  const fill = paramFill(pkey, val)
  const color = barColor(status)
  const valueColor = status === "ok" ? "#0d0d0d" : status === "warning" ? "#92400e" : "#991b1b"

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", width: 90, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden" }}>
        <div style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, width: 64, textAlign: "right", flexShrink: 0, color: valueColor }}>
        {formatVal(pkey, val)}
      </span>
    </div>
  )
}

// ── Period Chip ───────────────────────────────────────────────────────────────

function PeriodChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
      fontSize: 11, fontWeight: active ? 500 : 400,
      borderRadius: 6, padding: "3px 10px",
      border: active ? "none" : "0.5px solid #e5e2dc",
      backgroundColor: active ? "#1a6560" : "#f9f9f7",
      color: active ? "#f9f9f7" : "#3c3a36",
      cursor: "pointer",
    }}>
      {label}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EstanqueDetallePage() {
  const params = useParams()
  const router = useRouter()
  const estanqueId = params.estanque_id as string
  const { activeRefugioId } = useRefugio()

  const [estanque, setEstanque] = useState<EstanqueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d")
  const [editOpen, setEditOpen] = useState(false)
  const [medicionesHistory, setMedicionesHistory] = useState<Medicion[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/estanques/${estanqueId}`)
      if (res.ok) {
        const { data } = await res.json()
        setEstanque(data)
      } else {
        router.push("/dashboard/estanques")
      }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, estanqueId, router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!activeRefugioId || !estanqueId) return
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
    const desde = new Date()
    desde.setDate(desde.getDate() - days)
    setLoadingHistory(true)
    fetch(`/api/refugios/${activeRefugioId}/mediciones?estanque_id=${estanqueId}&desde=${desde.toISOString()}&limit=100`)
      .then(r => r.json())
      .then(({ data }) => setMedicionesHistory(data ?? []))
      .finally(() => setLoadingHistory(false))
  }, [activeRefugioId, estanqueId, period])

  const latestMedicion = estanque?.mediciones?.[0] ?? null
  const status = overallStatus(latestMedicion)
  const badge = statusBadge(status)

  // Build sparkline data per param from history (reversed = chronological)
  function sparkValues(key: string): number[] {
    const chronological = [...medicionesHistory].reverse()
    return chronological
      .map(m => (m as unknown as Record<string, number | null>)[key] as number | null)
      .filter((v): v is number => v !== null)
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
        <div className="flex items-center" style={{ gap: 6, marginBottom: 20 }}>
          <Skeleton style={{ width: 60, height: 12 }} />
          <Skeleton style={{ width: 8, height: 12 }} />
          <Skeleton style={{ width: 100, height: 12 }} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <Skeleton style={{ width: 160, height: 20, marginBottom: 8 }} />
              <Skeleton style={{ width: 220, height: 12 }} />
              <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "14px 0" }} />
              {[0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center" style={{ gap: 8, marginBottom: i < 4 ? 10 : 0 }}>
                  <Skeleton style={{ width: 90, height: 12 }} />
                  <Skeleton style={{ flex: 1, height: 4 }} />
                  <Skeleton style={{ width: 64, height: 12 }} />
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <Skeleton style={{ width: 120, height: 14, marginBottom: 16 }} />
              {[0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center" style={{ gap: 8, marginBottom: i < 4 ? 16 : 0 }}>
                  <Skeleton style={{ width: 80, height: 11 }} />
                  <Skeleton style={{ flex: 1, height: 36 }} />
                  <Skeleton style={{ width: 60, height: 12 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
                <Skeleton style={{ width: 100, height: 14, marginBottom: 12 }} />
                {[0,1,2].map(j => (
                  <div key={j} className="flex items-center" style={{ gap: 8, marginBottom: j < 2 ? 10 : 0 }}>
                    <Skeleton style={{ width: 40, height: 20, borderRadius: 4 }} />
                    <div><Skeleton style={{ width: 80, height: 12 }} /><Skeleton style={{ width: 60, height: 10, marginTop: 4 }} /></div>
                    <Skeleton style={{ width: 60, height: 18, marginLeft: "auto", borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!estanque) return null

  const tipoLabel = estanque.tipo_sistema ? TIPO_LABELS[estanque.tipo_sistema] ?? estanque.tipo_sistema : null
  const subtitleParts = [tipoLabel, estanque.capacidad_litros ? `${estanque.capacidad_litros} litros` : null].filter(Boolean)

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <Link
            href="/dashboard/estanques"
            style={{ fontSize: 12, color: "#9a958f", textDecoration: "none", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
          >
            Estanques
          </Link>
          <span style={{ fontSize: 12, color: "#9a958f" }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
            {estanque.nombre}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            style={{
              height: 34, padding: "0 14px", borderRadius: 8,
              border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer",
            }}
          >
            Editar
          </button>
          <Link
            href={`/dashboard/salud?estanque=${estanqueId}`}
            className="flex items-center gap-1.5"
            style={{
              height: 34, padding: "0 14px", borderRadius: 8, border: "none",
              backgroundColor: "#1a6560", color: "#f9f9f7",
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            Registrar medición
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 12, alignItems: "start" }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Header card */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-start justify-between">
              <div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d" }}>{estanque.nombre}</div>
                {subtitleParts.length > 0 && (
                  <div style={{ fontSize: 12, color: "#9a958f", marginTop: 4 }}>{subtitleParts.join(" · ")}</div>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 500,
                borderRadius: 6, padding: "4px 12px",
                backgroundColor: badge.bg, color: badge.text, flexShrink: 0,
              }}>
                {badge.label}
              </span>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "14px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PARAMS.map(p => (
                <ParamRow
                  key={p.key}
                  pkey={p.key}
                  label={p.label}
                  val={latestMedicion ? (latestMedicion as unknown as Record<string, number | null>)[p.key] as number | null : null}
                />
              ))}
            </div>

            {/* Axo AI strip */}
            {status !== "ok" && (
              <div style={{
                marginTop: 14, backgroundColor: "#e2f0ee", borderRadius: 8, padding: "10px 12px",
                borderLeft: "2px solid #1a6560", display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <Sparkles size={12} color="#1a6560" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                    Axo AI{" "}
                  </span>
                  <span style={{ fontSize: 12, color: "#0f3d3a", lineHeight: 1.4, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                    {status === "critical"
                      ? "Parámetros críticos detectados. Revisa inmediatamente y considera cambio de agua parcial."
                      : "Parámetros fuera de rango óptimo. Monitorea de cerca en las próximas horas."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tendencias card */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Tendencias</span>
              <div className="flex items-center" style={{ gap: 4 }}>
                {(["7d", "30d", "90d"] as const).map(p => (
                  <PeriodChip key={p} label={p} active={period === p} onClick={() => setPeriod(p)} />
                ))}
              </div>
            </div>

            {loadingHistory ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex items-center" style={{ gap: 8 }}>
                    <Skeleton style={{ width: 80, height: 11 }} />
                    <Skeleton style={{ flex: 1, height: 36 }} />
                    <Skeleton style={{ width: 60, height: 12 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {PARAMS.map(p => {
                  const vals = sparkValues(p.key)
                  const lastVal = vals.length > 0 ? vals[vals.length - 1] : (latestMedicion ? (latestMedicion as unknown as Record<string, number | null>)[p.key] as number | null : null)
                  const pStatus = paramStatus(p.key, lastVal)
                  const isWarning = pStatus !== "ok"
                  return (
                    <div key={p.key} className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#9a958f", width: 80, flexShrink: 0, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                        {p.label}
                      </span>
                      <Sparkline values={vals.length >= 2 ? vals : [0, 0]} color="#1a6560" warning={isWarning} />
                      <div className="flex items-center" style={{ gap: 3, width: 72, justifyContent: "flex-end", flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: isWarning ? "#92400e" : "#0d0d0d" }}>
                          {formatVal(p.key, lastVal)}
                        </span>
                        {vals.length >= 2 && <TrendArrow values={vals} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Historial de mediciones */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
            <div className="flex items-center justify-between" style={{ padding: "14px 16px", borderBottom: "0.5px solid #e5e2dc" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Historial de mediciones</span>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", padding: 0 }}
              >
                Exportar CSV
              </button>
            </div>

            {/* Table header */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr",
                padding: "10px 16px",
                backgroundColor: "#f9f9f7",
                borderBottom: "0.5px solid #e5e2dc",
              }}
            >
              {["FECHA", "TEMP", "PH", "NH₃", "NO₂", "O₂"].map(h => (
                <span key={h} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f" }}>
                  {h}
                </span>
              ))}
            </div>

            {estanque.mediciones.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "#9a958f", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                Sin mediciones registradas
              </div>
            ) : (
              estanque.mediciones.map((m, i) => (
                <div
                  key={m.fecha_hora}
                  className="grid"
                  style={{
                    gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr",
                    padding: "11px 16px",
                    borderBottom: i < estanque.mediciones.length - 1 ? "0.5px solid #edeae4" : "none",
                    backgroundColor: "#ffffff",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
                    {formatFecha(m.fecha_hora)}
                  </span>
                  {[
                    { key: "temperatura", val: m.temperatura },
                    { key: "ph", val: m.ph },
                    { key: "amonio", val: m.amonio },
                    { key: "nitrito", val: m.nitrito },
                    { key: "oxigeno", val: m.oxigeno },
                  ].map(({ key, val }) => {
                    const s = paramStatus(key, val)
                    const color = s === "ok" ? "#0d0d0d" : s === "warning" ? "#92400e" : "#991b1b"
                    return (
                      <span key={key} style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color }}>
                        {val !== null ? val.toFixed(1) : "—"}
                      </span>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Ajolotes */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Ajolotes</span>
                <span style={{ fontSize: 12, color: "#9a958f" }}>{estanque.ajolotes.length} individuos</span>
              </div>
              <Link
                href={`/dashboard/inventario?estanque=${estanqueId}`}
                className="flex items-center gap-1"
                style={{ fontSize: 12, color: "#1a6560", textDecoration: "none", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
              >
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>

            {estanque.ajolotes.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9a958f", textAlign: "center", padding: "16px 0", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                Sin ajolotes asignados
              </div>
            ) : (
              <div>
                {estanque.ajolotes.slice(0, 6).map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-center"
                    style={{
                      gap: 8, paddingTop: 8, paddingBottom: 8,
                      borderBottom: i < Math.min(estanque.ajolotes.length, 6) - 1 ? "0.5px solid #edeae4" : "none",
                    }}
                  >
                    <div style={{
                      fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                      fontSize: 11, fontWeight: 500, color: "#1a6560",
                      backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 6px",
                      width: 40, textAlign: "center", flexShrink: 0,
                    }}>
                      {a.codigo}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                        {a.nombre || a.codigo}
                      </div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
                        {[a.sexo ? SEXO_LABELS[a.sexo] ?? a.sexo : null].filter(Boolean).join(" · ") || "Indet."}
                      </div>
                    </div>
                    {a.morfotipo && (
                      <span style={{
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                        fontSize: 10, borderRadius: 4, padding: "1px 6px",
                        backgroundColor: "#f3f2ef", color: "#3c3a36", flexShrink: 0,
                      }}>
                        {MORFOTIPO_LABELS[a.morfotipo] ?? a.morfotipo}
                      </span>
                    )}
                  </div>
                ))}
                {estanque.ajolotes.length > 6 && (
                  <div style={{ paddingTop: 10 }}>
                    <Link
                      href={`/dashboard/inventario?estanque=${estanqueId}`}
                      style={{ fontSize: 12, color: "#1a6560", textDecoration: "none", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
                    >
                      + {estanque.ajolotes.length - 6} más
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Últimas mediciones rápidas */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Mediciones recientes</span>
            </div>

            {estanque.mediciones.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9a958f", textAlign: "center", padding: "16px 0", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
                Sin mediciones
              </div>
            ) : (
              estanque.mediciones.slice(0, 4).map((m, i) => {
                const mStatus = overallStatus(m)
                const dotColor = mStatus === "critical" ? "#dc2626" : mStatus === "warning" ? "#d97706" : "#1a6560"
                return (
                  <div
                    key={m.fecha_hora}
                    className="flex items-start"
                    style={{
                      gap: 10, paddingTop: 9, paddingBottom: 9,
                      borderBottom: i < Math.min(estanque.mediciones.length, 4) - 1 ? "0.5px solid #edeae4" : "none",
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dotColor, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                        {mStatus === "ok" ? "Parámetros en rango" : mStatus === "warning" ? "Parámetros con alerta" : "Parámetros críticos"}
                      </div>
                      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 1 }}>
                        {formatFecha(m.fecha_hora)}
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f", flexShrink: 0, marginTop: 2 }}>
                      {relativeTime(m.fecha_hora)}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Info del estanque */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Configuración</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Sistema", value: tipoLabel },
                { label: "Capacidad", value: estanque.capacidad_litros ? `${estanque.capacidad_litros} L` : null },
                { label: "Ubicación", value: estanque.ubicacion_fisica },
                { label: "Notas", value: estanque.notas },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex items-start" style={{ gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", width: 70, flexShrink: 0, paddingTop: 1 }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", lineHeight: 1.4 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {activeRefugioId && (
        <EstanqueModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          refugioId={activeRefugioId}
          estanque={estanque}
          onSuccess={() => { setEditOpen(false); load() }}
        />
      )}
    </div>
  )
}
