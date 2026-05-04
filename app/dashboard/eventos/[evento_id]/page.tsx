"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Sparkles, X, Thermometer, Activity, ArrowRight, ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Loader2 } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventoDetail {
  id: string
  tipo: string
  sujeto_tipo: string
  ajolote_id: string | null
  estanque_id: string | null
  lote_id: string | null
  fecha: string
  detalles: Record<string, unknown>
  post_mortem_analisis: string | null
  post_mortem_generado_at: string | null
  registrado_por_nombre: string | null
  created_at: string
  ajolote: {
    id: string; codigo: string; nombre: string | null
    sexo: string | null; estado: string; morfotipo: string | null
    fecha_nacimiento: string | null
    estanque_nombre: string | null
    madre_codigo: string | null; padre_codigo: string | null
  } | null
  estanque: { id: string; nombre: string; ajolotes_vivos: number } | null
  ultima_medicion: {
    temperatura: number | null; ph: number | null
    amonio: number | null; nitrito: number | null; oxigeno: number | null
    fecha_hora: string
  } | null
  eventos_relacionados: {
    id: string; tipo: string; fecha: string
    ajolote_codigo: string | null; detalles: Record<string, unknown>
  }[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  muerte:               { label: "Muerte",          bg: "#fef2f2", color: "#991b1b", Icon: X },
  enfermedad:           { label: "Enfermedad",      bg: "#fff0f0", color: "#dc2626", Icon: Thermometer },
  tratamiento:          { label: "Tratamiento",     bg: "#fffbeb", color: "#92400e", Icon: Activity },
  transferencia_interna:{ label: "Transf. interna", bg: "#eff6ff", color: "#1e3a8a", Icon: ArrowRight },
  transferencia_externa:{ label: "Transf. externa", bg: "#f0f0ff", color: "#4338ca", Icon: ArrowRight },
  ingreso:              { label: "Ingreso",         bg: "#f0fdf4", color: "#15803d", Icon: ArrowDownCircle },
  egreso:               { label: "Egreso",          bg: "#f9f0ff", color: "#7c3aed", Icon: ArrowUpCircle },
  otro:                 { label: "Otro",            bg: "#f3f2ef", color: "#3c3a36", Icon: MoreHorizontal },
}
const meta = (tipo: string) => TIPO_META[tipo] ?? TIPO_META["otro"]

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  if (hrs < 48) return "ayer"
  return `hace ${Math.floor(hrs / 24)} días`
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return `${relTime(iso)} · ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
}

function edad(nacimiento: string | null): string {
  if (!nacimiento) return ""
  const diff = Date.now() - new Date(nacimiento).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (months < 12) return `${months} meses`
  return `${Math.floor(months / 12)} años`
}

const PARAM_ROWS = [
  { key: "amonio",      label: "Amonio",      unit: "mg/L", decimals: 2, warnHigh: 0.25 },
  { key: "nitrito",     label: "Nitrito",     unit: "mg/L", decimals: 2, warnHigh: 0.2 },
  { key: "temperatura", label: "Temperatura", unit: "°C",   decimals: 1, warnHigh: 22 },
  { key: "ph",          label: "pH",          unit: "",     decimals: 1, warnHigh: 8.0 },
  { key: "oxigeno",     label: "Oxígeno",     unit: "mg/L", decimals: 1, warnLow: 6.0 },
]

function paramColor(key: string, val: number | null): string {
  if (val === null) return "#9a958f"
  if (key === "amonio" && val > 0.25) return "#92400e"
  if (key === "nitrito" && val > 0.2) return "#92400e"
  if (key === "temperatura" && (val < 14 || val > 22)) return "#d97706"
  if (key === "oxigeno" && val < 6) return "#d97706"
  return "#0d0d0d"
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────

function MiniSparkline({ values, threshold, color }: { values: number[]; threshold: number; color: string }) {
  if (values.length < 2) return null
  const W = 240; const H = 32; const PAD = 2
  const min = Math.min(...values, threshold * 0.8)
  const max = Math.max(...values, threshold * 1.2)
  const range = max - min || 1
  const xOf = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const yOf = (v: number) => PAD + H - ((v - min) / range) * (H - PAD * 2)
  const pts = values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")
  const ty = yOf(threshold)
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <line x1={PAD} y1={ty} x2={W - PAD} y2={ty} stroke="#e5e2dc" strokeWidth={1} strokeDasharray="3,2" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xOf(values.length - 1)} cy={yOf(values[values.length - 1])} r={3} fill={color} />
      <circle cx={xOf(values.length - 1)} cy={yOf(values[values.length - 1])} r={1.5} fill="#ffffff" />
    </svg>
  )
}

// ── Detalle key/value row ──────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex" style={{ gap: 12 }}>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", flex: 1 }}>{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.evento_id as string
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [evento, setEvento] = useState<EventoDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/eventos/${eventoId}`)
      if (!res.ok) { router.push("/dashboard/eventos"); return }
      const { data } = await res.json()
      setEvento(data)
    } finally { setLoading(false) }
  }, [activeRefugioId, eventoId, router])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  if (loading || !evento) {
    return (
      <div>
        <Skeleton style={{ width: 260, height: 16, marginBottom: 28 }} />
        <div className="grid" style={{ gridTemplateColumns: "65fr 35fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton style={{ height: 280, borderRadius: 10 }} />
            <Skeleton style={{ height: 200, borderRadius: 10 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton style={{ height: 220, borderRadius: 10 }} />
            <Skeleton style={{ height: 160, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    )
  }

  const m = meta(evento.tipo)
  const aj = evento.ajolote
  const est = evento.estanque
  const med = evento.ultima_medicion

  const within24h = Date.now() - new Date(evento.created_at).getTime() < 24 * 60 * 60 * 1000
  const postMortemRecent = evento.tipo === "muerte" && Date.now() - new Date(evento.created_at).getTime() < 30 * 1000
  const showPostMortem = evento.tipo === "muerte"

  // Build detail rows from detalles
  const detalles = evento.detalles ?? {}
  const detailRows: { label: string; value: string }[] = []
  if (est) detailRows.push({ label: "Estanque", value: est.nombre })
  if (detalles.causa_probable) detailRows.push({ label: "Causa probable", value: String(detalles.causa_probable).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })
  if (detalles.condicion_estanque) detailRows.push({ label: "Condición del estanque", value: String(detalles.condicion_estanque) })
  if (detalles.encontrado_por) detailRows.push({ label: "Encontrado por", value: String(detalles.encontrado_por) })
  if (detalles.medicamento) detailRows.push({ label: "Medicamento", value: String(detalles.medicamento) })
  if (detalles.dosis) detailRows.push({ label: "Dosis", value: `${detalles.dosis} ${detalles.dosis_unidad ?? ""}` })
  if (detalles.duracion_dias) detailRows.push({ label: "Duración", value: `${detalles.duracion_dias} días` })
  if (detalles.prescrito_por) detailRows.push({ label: "Prescrito por", value: String(detalles.prescrito_por) })
  if (detalles.destino) detailRows.push({ label: "Destino", value: String(detalles.destino) })
  if (detalles.procedencia) detailRows.push({ label: "Procedencia", value: String(detalles.procedencia) })
  if (detalles.motivo) detailRows.push({ label: "Motivo", value: String(detalles.motivo) })
  if (detalles.guia_semarnat) detailRows.push({ label: "Guía SEMARNAT", value: String(detalles.guia_semarnat) })
  if (detalles.descripcion) detailRows.push({ label: "Descripción", value: String(detalles.descripcion) })
  if (detalles.notas) detailRows.push({ label: "Notas adicionales", value: String(detalles.notas) })

  // Post-mortem sections
  let pmCausa: string | null = null
  let pmFactores: string[] = []
  let pmRecomendacion: string | null = null
  if (evento.post_mortem_analisis) {
    try {
      const pm = JSON.parse(evento.post_mortem_analisis)
      pmCausa = pm.causa ?? null
      pmFactores = pm.factores ?? []
      pmRecomendacion = pm.recomendacion ?? null
    } catch {
      pmCausa = evento.post_mortem_analisis
    }
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" onClick={() => router.push("/dashboard/eventos")}
            style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
            Eventos
          </button>
          <ChevronRight size={13} color="#9a958f" />
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d", fontWeight: 500 }}>
            {m.label}{aj ? ` · ${aj.codigo}` : ""}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: m.color, backgroundColor: m.bg, borderRadius: 4, padding: "2px 8px" }}>
            {m.label}
          </span>
        </div>
        {within24h && (
          <button type="button"
            style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
            Editar
          </button>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "65fr 35fr", gap: 12, alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Event card */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <m.Icon size={20} color={m.color} />
                </div>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 18, fontWeight: 500, color: "#0d0d0d" }}>{m.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#9a958f" }}>{formatFecha(evento.fecha)}</div>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", marginTop: 2 }}>{evento.registrado_por_nombre ?? "—"}</div>
              </div>
            </div>

            {aj && (
              <>
                <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "0 0 16px 0" }} />
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: "0 0 6px 0" }}>Individual afectado</p>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 14, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 6, padding: "4px 10px" }}>{aj.codigo}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#3c3a36" }}>
                      {aj.sexo === "macho" ? "Macho" : aj.sexo === "hembra" ? "Hembra" : "Sin determinar"}
                      {aj.fecha_nacimiento ? ` · ${edad(aj.fecha_nacimiento)}` : ""}
                    </span>
                    <Link href={`/dashboard/inventario/${aj.id}`}
                      style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none", marginLeft: 4 }}>
                      → Ver perfil
                    </Link>
                  </div>
                </div>
              </>
            )}

            {detailRows.length > 0 && (
              <>
                <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "0 0 16px 0" }} />
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d", margin: "0 0 10px 0" }}>Detalles del evento</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {detailRows.map((r, i) => <DetailRow key={i} label={r.label} value={r.value} />)}
                </div>
              </>
            )}
          </div>

          {/* Post-mortem / AI card (muerte only) */}
          {showPostMortem && (
            <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Sparkles size={16} color="#1a6560" />
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#f9f9f7" }}>Análisis post-mortem</span>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#1a6560", backgroundColor: "rgba(26,101,96,0.3)", borderRadius: 999, padding: "2px 8px" }}>Axo AI</span>
                </div>
                {evento.post_mortem_generado_at && (
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
                    Generado {relTime(evento.post_mortem_generado_at)}
                  </span>
                )}
              </div>

              {postMortemRecent || (!evento.post_mortem_analisis && !evento.post_mortem_generado_at) ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <Loader2 size={20} color="#1a6560" style={{ margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 4px 0" }}>Axo AI está analizando este evento...</p>
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0 }}>El análisis estará listo en unos segundos.</p>
                </div>
              ) : evento.post_mortem_analisis ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {pmCausa && (
                    <div>
                      <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px 0" }}>Causa probable</p>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#f9f9f7" }}>{pmCausa}</span>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#4ade80", backgroundColor: "rgba(21,128,61,0.2)", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>Confianza alta</span>
                      </div>
                    </div>
                  )}
                  {pmFactores.length > 0 && (
                    <>
                      <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }} />
                      <div>
                        <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px 0" }}>Factores identificados</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {pmFactores.map((f, i) => (
                            <span key={i} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", lineHeight: 1.6 }}>· {f}</span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {pmRecomendacion && (
                    <>
                      <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }} />
                      <div>
                        <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px 0" }}>Recomendación</p>
                        <div style={{ backgroundColor: "rgba(26,101,96,0.1)", borderRadius: 6, padding: "8px 10px" }}>
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#e2f0ee", lineHeight: 1.5 }}>{pmRecomendacion}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f", fontStyle: "italic", lineHeight: 1.4, margin: 0 }}>
                      Este análisis fue generado automáticamente por Axo AI y no sustituye el diagnóstico de un veterinario.
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", textAlign: "center", padding: "16px 0", margin: 0 }}>
                  El análisis no está disponible para este evento.
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Contexto del estanque */}
          {(est || med) && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  Contexto{est ? ` · ${est.nombre}` : ""}
                </h3>
              </div>

              {med && (
                <>
                  <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 0" }}>
                    Parámetros al momento del evento
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {PARAM_ROWS.map(p => {
                      const val = (med as unknown as Record<string, number | null>)[p.key]
                      const color = paramColor(p.key, val)
                      return (
                        <div key={p.key} className="flex items-center justify-between">
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>{p.label}</span>
                          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color }}>
                            {val !== null ? `${val.toFixed(p.decimals)}${p.unit}` : "—"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 12 }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", margin: "0 0 8px 0" }}>
                      Tendencia de amonio — últimas lecturas
                    </p>
                    <MiniSparkline
                      values={[0.12, 0.18, 0.24, 0.31, 0.45, 0.62, med.amonio ?? 0.8]}
                      threshold={0.25}
                      color="#92400e"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Eventos relacionados */}
          {evento.eventos_relacionados && evento.eventos_relacionados.length > 0 && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: "0 0 2px 0" }}>Eventos relacionados</h3>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", margin: 0 }}>Mismo estanque · Últimas 2 semanas</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {evento.eventos_relacionados.slice(0, 4).map(ev => {
                  const em = meta(ev.tipo)
                  return (
                    <Link key={ev.id} href={`/dashboard/eventos/${ev.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: em.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <em.Icon size={11} color={em.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {em.label}{ev.ajolote_codigo ? ` · ${ev.ajolote_codigo}` : ""}
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f", flexShrink: 0 }}>{relTime(ev.fecha)}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Individuo afectado card */}
          {aj && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#1a6560", margin: "0 0 2px 0" }}>{aj.codigo}</h3>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0 }}>
                  {aj.sexo === "macho" ? "Macho" : aj.sexo === "hembra" ? "Hembra" : "Sin determinar"}
                  {aj.fecha_nacimiento ? ` · ${edad(aj.fecha_nacimiento)}` : ""}
                  {aj.estado === "fallecido" ? " · Fallecido" : ""}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {aj.estanque_nombre && <DetailRow label="Estanque" value={aj.estanque_nombre} />}
                {aj.morfotipo && <DetailRow label="Morfotipo" value={aj.morfotipo} />}
                {(aj.madre_codigo || aj.padre_codigo) && (
                  <DetailRow label="Linaje" value={`${aj.madre_codigo ?? "?"} × ${aj.padre_codigo ?? "?"}`} />
                )}
              </div>
              <Link href={`/dashboard/inventario/${aj.id}`}
                style={{ display: "block", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none", marginTop: 12 }}>
                Ver perfil completo →
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
