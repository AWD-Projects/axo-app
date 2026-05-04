"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicionPoint {
  fecha_hora: string
  temperatura: number | null
  ph: number | null
  amonio: number | null
  nitrito: number | null
  oxigeno: number | null
}

interface EstanqueInfo { id: string; nombre: string }

type Periodo = "7d" | "30d" | "90d"

// ── Thresholds ────────────────────────────────────────────────────────────────

const RANGOS: Record<string, { min: number; max: number; unit: string; decimals: number }> = {
  temperatura: { min: 16,  max: 18,   unit: "°C",   decimals: 1 },
  ph:          { min: 7.0, max: 7.8,  unit: "",      decimals: 1 },
  amonio:      { min: 0,   max: 0.25, unit: "mg/L",  decimals: 2 },
  nitrito:     { min: 0,   max: 0.2,  unit: "mg/L",  decimals: 2 },
  oxigeno:     { min: 6.0, max: 10.0, unit: "mg/L",  decimals: 1 },
}

const PARAMS = [
  { key: "temperatura", label: "Temperatura" },
  { key: "ph",          label: "pH" },
  { key: "amonio",      label: "Amonio" },
  { key: "nitrito",     label: "Nitrito" },
  { key: "oxigeno",     label: "Oxígeno" },
]

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

const STATUS_COLORS = { ok: "#1a6560", warning: "#d97706", critical: "#dc2626" }
const STATUS_LABELS = { ok: "En rango", warning: "Advertencia", critical: "Fuera de rango" }

// ── SVG Chart ─────────────────────────────────────────────────────────────────

function ParamChart({
  data,
  paramKey,
  width = 560,
  height = 160,
}: {
  data: MedicionPoint[]
  paramKey: string
  width?: number
  height?: number
}) {
  const rango = RANGOS[paramKey]
  const PAD = { top: 12, right: 16, bottom: 28, left: 42 }
  const W = width - PAD.left - PAD.right
  const H = height - PAD.top - PAD.bottom

  const points = data
    .map((d, i) => ({ i, v: d[paramKey as keyof MedicionPoint] as number | null, t: d.fecha_hora }))
    .filter(p => p.v !== null) as { i: number; v: number; t: string }[]

  if (points.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>Sin datos para este período</span>
      </div>
    )
  }

  const allVals = points.map(p => p.v)
  const dataMin = Math.min(...allVals)
  const dataMax = Math.max(...allVals)
  const vMin = Math.min(dataMin * 0.9, rango.min * 0.9)
  const vMax = Math.max(dataMax * 1.1, rango.max * 1.1)
  const vRange = vMax - vMin || 1

  function xOf(idx: number) { return PAD.left + (idx / (data.length - 1 || 1)) * W }
  function yOf(v: number) { return PAD.top + H - ((v - vMin) / vRange) * H }

  // Range band y positions
  const yRangeMin = yOf(rango.min)
  const yRangeMax = yOf(rango.max)

  // Polyline
  const linePoints = points.map(p => `${xOf(p.i)},${yOf(p.v)}`).join(" ")

  // Area path
  const areaPath = points.length > 1
    ? `M${xOf(points[0].i)},${yOf(points[0].v)} ` +
      points.slice(1).map(p => `L${xOf(p.i)},${yOf(p.v)}`).join(" ") +
      ` L${xOf(points[points.length - 1].i)},${PAD.top + H} L${xOf(points[0].i)},${PAD.top + H} Z`
    : ""

  // Y-axis ticks
  const tickCount = 4
  const yTicks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(vMin + (vRange / tickCount) * i)
  }

  // X-axis labels (first + last + middle)
  const xLabelIndices = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i)

  function fmtDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  const last = points[points.length - 1]
  const lastStatus = paramStatus(paramKey, last.v)
  const lineColor = STATUS_COLORS[lastStatus]

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`area-${paramKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Range band */}
      {yRangeMin > yRangeMax && (
        <rect
          x={PAD.left} y={yRangeMax}
          width={W} height={yRangeMin - yRangeMax}
          fill="#1a6560" opacity={0.05}
        />
      )}

      {/* Range lines */}
      <line x1={PAD.left} y1={yRangeMin} x2={PAD.left + W} y2={yRangeMin}
        stroke="#1a6560" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />
      <line x1={PAD.left} y1={yRangeMax} x2={PAD.left + W} y2={yRangeMax}
        stroke="#1a6560" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />

      {/* Y grid lines */}
      {yTicks.map((v, i) => (
        <line key={i}
          x1={PAD.left} y1={yOf(v)} x2={PAD.left + W} y2={yOf(v)}
          stroke="#e5e2dc" strokeWidth={0.5} />
      ))}

      {/* Area */}
      {areaPath && <path d={areaPath} fill={`url(#area-${paramKey})`} />}

      {/* Line */}
      <polyline points={linePoints} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Last point dot */}
      <circle cx={xOf(last.i)} cy={yOf(last.v)} r={4} fill={lineColor} />
      <circle cx={xOf(last.i)} cy={yOf(last.v)} r={2} fill="#ffffff" />

      {/* Y axis ticks */}
      {yTicks.map((v, i) => (
        <text key={i} x={PAD.left - 6} y={yOf(v) + 4}
          textAnchor="end"
          style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 9, fill: "#9a958f" }}>
          {v.toFixed(rango.decimals)}
        </text>
      ))}

      {/* X axis labels */}
      {xLabelIndices.map(idx => (
        <text key={idx} x={xOf(idx)} y={PAD.top + H + 18}
          textAnchor="middle"
          style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 9, fill: "#9a958f" }}>
          {fmtDate(data[idx].fecha_hora)}
        </text>
      ))}
    </svg>
  )
}

// ── Trend stat ────────────────────────────────────────────────────────────────

function TrendStat({ data, paramKey }: { data: MedicionPoint[]; paramKey: string }) {
  const rango = RANGOS[paramKey]
  const vals = data.map(d => d[paramKey as keyof MedicionPoint] as number | null).filter(v => v !== null) as number[]
  if (vals.length === 0) return <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>Sin datos</span>

  const last = vals[vals.length - 1]
  const prev = vals.length > 1 ? vals[vals.length - 2] : null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const status = paramStatus(paramKey, last)
  const color = STATUS_COLORS[status]

  let TrendIcon = Minus
  let trendColor = "#9a958f"
  if (prev !== null) {
    const diff = last - prev
    const threshold = (rango.max - rango.min) * 0.05
    if (diff > threshold) { TrendIcon = TrendingUp; trendColor = paramKey === "amonio" || paramKey === "nitrito" ? "#dc2626" : "#d97706" }
    else if (diff < -threshold) { TrendIcon = TrendingDown; trendColor = paramKey === "amonio" || paramKey === "nitrito" ? "#1a6560" : "#9a958f" }
  }

  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <div>
        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 20, fontWeight: 500, color }}>
          {last.toFixed(rango.decimals)}
        </span>
        {rango.unit && <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginLeft: 3 }}>{rango.unit}</span>}
      </div>
      <div>
        <TrendIcon size={14} color={trendColor} />
      </div>
      <div>
        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
          Prom. {avg.toFixed(rango.decimals)}{rango.unit}
        </span>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <span style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500,
          color, backgroundColor: color + "18", borderRadius: 4, padding: "2px 6px",
        }}>
          {STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TendenciasPage() {
  const router = useRouter()
  const params = useParams()
  const estanqueId = params.estanque_id as string
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [periodo, setPeriodo] = useState<Periodo>("30d")
  const [estanque, setEstanque] = useState<EstanqueInfo | null>(null)
  const [mediciones, setMediciones] = useState<MedicionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [activeParam, setActiveParam] = useState("temperatura")

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)

      const [estRes, medRes] = await Promise.all([
        fetch(`/api/refugios/${activeRefugioId}/estanques/${estanqueId}`),
        fetch(`/api/refugios/${activeRefugioId}/mediciones?estanque_id=${estanqueId}&desde=${desde.toISOString()}&limit=200`),
      ])

      const [estData, medData] = await Promise.all([estRes.json(), medRes.json()])
      if (estData.data) setEstanque(estData.data)
      setMediciones((medData.data ?? []).reverse())
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, estanqueId, periodo])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  const activeData = mediciones

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <button type="button" onClick={() => router.push("/dashboard/salud")}
            style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
            Salud
          </button>
          <ChevronRight size={13} color="#9a958f" />
          {estanque && (
            <>
              <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f" }}>
                {estanque.nombre}
              </span>
              <ChevronRight size={13} color="#9a958f" />
            </>
          )}
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", fontWeight: 500 }}>
            Tendencias
          </span>
        </div>

        {/* Period selector */}
        <div className="flex" style={{ gap: 4, backgroundColor: "#f3f2ef", borderRadius: 8, padding: 3 }}>
          {(["7d", "30d", "90d"] as Periodo[]).map(p => (
            <button key={p} type="button" onClick={() => setPeriodo(p)}
              style={{
                height: 28, padding: "0 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500,
                backgroundColor: periodo === p ? "#ffffff" : "transparent",
                color: periodo === p ? "#0d0d0d" : "#9a958f",
                boxShadow: periodo === p ? "0 1px 3px rgba(13,13,13,0.08)" : "none",
                transition: "all 150ms",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Param tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        {PARAMS.map(p => {
          const vals = mediciones.map(d => d[p.key as keyof MedicionPoint] as number | null).filter(v => v !== null) as number[]
          const last = vals[vals.length - 1] ?? null
          const status = paramStatus(p.key, last)
          const hasAlert = status !== "ok"
          return (
            <button key={p.key} type="button" onClick={() => setActiveParam(p.key)}
              style={{
                height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                border: activeParam === p.key ? "1px solid #1a6560" : "0.5px solid #e5e2dc",
                backgroundColor: activeParam === p.key ? "#e2f0ee" : "#ffffff",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500,
                color: activeParam === p.key ? "#1a6560" : "#0d0d0d",
                transition: "all 150ms",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              {hasAlert && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: STATUS_COLORS[status], flexShrink: 0 }} />
              )}
              {p.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1].map(i => (
            <div key={i} style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", padding: 24, height: 240 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Main chart */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", padding: 24 }}>
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: "0 0 8px 0" }}>
                  {PARAMS.find(p => p.key === activeParam)?.label}
                  {RANGOS[activeParam].unit && (
                    <span style={{ color: "#9a958f", fontWeight: 400, marginLeft: 4 }}>({RANGOS[activeParam].unit})</span>
                  )}
                </h3>
                <TrendStat data={activeData} paramKey={activeParam} />
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", margin: 0 }}>
                  {activeData.length} mediciones
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", margin: 0 }}>
                  Rango óptimo: {RANGOS[activeParam].min}–{RANGOS[activeParam].max}{RANGOS[activeParam].unit}
                </p>
              </div>
            </div>
            <ParamChart data={activeData} paramKey={activeParam} />
          </div>

          {/* All params overview grid */}
          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            {PARAMS.filter(p => p.key !== activeParam).map(p => {
              const vals = mediciones.map(d => d[p.key as keyof MedicionPoint] as number | null).filter(v => v !== null) as number[]
              const last = vals[vals.length - 1] ?? null
              const status = paramStatus(p.key, last)
              const color = STATUS_COLORS[status]
              return (
                <button key={p.key} type="button" onClick={() => setActiveParam(p.key)}
                  style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", padding: 16, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#c8c4be")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e2dc")}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>
                      {p.label}
                    </span>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
                  </div>
                  <ParamChart data={mediciones} paramKey={p.key} height={80} />
                  {last !== null && (
                    <p style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 14, fontWeight: 500, color, margin: "8px 0 0 0" }}>
                      {last.toFixed(RANGOS[p.key].decimals)}{RANGOS[p.key].unit}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Data table */}
          {mediciones.length > 0 && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "0.5px solid #e5e2dc", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid #e5e2dc" }}>
                <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Historial de mediciones
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 90px 60px 70px 70px 80px", minWidth: 510 }}>
                  {/* Header */}
                  {["Fecha", "Temp.", "pH", "Amonio", "Nitrito", "Oxígeno"].map(h => (
                    <div key={h} style={{ padding: "10px 16px", borderBottom: "0.5px solid #e5e2dc", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {h}
                    </div>
                  ))}
                  {/* Rows (last 20) */}
                  {[...mediciones].reverse().slice(0, 20).map((m, i) => {
                    const d = new Date(m.fecha_hora)
                    const isLast = i === mediciones.slice(0, 20).length - 1
                    const rowBorder = isLast ? "none" : "0.5px solid #e5e2dc"
                    function Cell({ k, v }: { k: string; v: number | null }) {
                      const s = paramStatus(k, v)
                      return (
                        <div style={{ padding: "10px 16px", borderBottom: rowBorder }}>
                          {v !== null ? (
                            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: STATUS_COLORS[s] }}>
                              {v.toFixed(RANGOS[k].decimals)}
                            </span>
                          ) : (
                            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#e5e2dc" }}>—</span>
                          )}
                        </div>
                      )
                    }
                    return [
                      <div key={`${i}-date`} style={{ padding: "10px 16px", borderBottom: rowBorder }}>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>
                          {d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </span>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginLeft: 6 }}>
                          {d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>,
                      <Cell key={`${i}-temp`} k="temperatura" v={m.temperatura} />,
                      <Cell key={`${i}-ph`} k="ph" v={m.ph} />,
                      <Cell key={`${i}-amonio`} k="amonio" v={m.amonio} />,
                      <Cell key={`${i}-nitrito`} k="nitrito" v={m.nitrito} />,
                      <Cell key={`${i}-oxigeno`} k="oxigeno" v={m.oxigeno} />,
                    ]
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
