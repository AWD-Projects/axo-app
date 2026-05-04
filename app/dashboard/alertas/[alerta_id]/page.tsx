"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Droplets, FlaskConical, Thermometer, Wind, XCircle,
  GitBranch, FileText, Clock, Sparkles, Bell, CheckCircle,
  ChevronRight, type LucideIcon,
} from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = "critical" | "error" | "warning" | "info"

interface DatosContexto {
  valor_actual?: number
  unidad?: string
  umbral_min?: number
  umbral_max?: number
  otros_parametros?: Array<{ nombre: string; valor: number; unidad: string; estado: "ok" | "warn" | "critical" }>
}

interface Alerta {
  id: string
  tipo: string
  severidad: Severity
  titulo: string
  mensaje: string
  datos_contexto: DatosContexto | null
  generada_at: string
  leida_at: string | null
  resuelta_at: string | null
  resuelta_por: string | null
  estanque: { id: string; nombre: string } | null
  ajolote: { id: string; codigo: string; nombre: string | null } | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SEV: Record<string, { border: string; bg: string; text: string; dot: string; label: string }> = {
  critical: { border: "#991b1b", bg: "#fef2f2", text: "#991b1b", dot: "#991b1b", label: "Crítico" },
  error:    { border: "#dc2626", bg: "#fff0f0", text: "#dc2626", dot: "#dc2626", label: "Error" },
  warning:  { border: "#92400e", bg: "#fffbeb", text: "#92400e", dot: "#d97706", label: "Advertencia" },
  info:     { border: "#1a6560", bg: "#e2f0ee", text: "#1a6560", dot: "#1a6560", label: "Info" },
}

const ICON_MAP: Record<string, LucideIcon> = {
  agua_amonio_elevado:    Droplets,
  agua_nitrito_elevado:   Droplets,
  agua_ph_fuera_rango:    FlaskConical,
  agua_temperatura_fuera: Thermometer,
  agua_oxigeno_bajo:      Wind,
  mortalidad_anomala:     XCircle,
  endogamia_riesgo:       GitBranch,
  reporte_uma_proximo:    FileText,
  sin_registro_dias:      Clock,
  post_mortem_generado:   Sparkles,
  otro:                   Bell,
}

const TYPE_LABELS: Record<string, string> = {
  agua_amonio_elevado:    "Amonio elevado",
  agua_nitrito_elevado:   "Nitrito crítico",
  agua_ph_fuera_rango:    "pH fuera de rango",
  agua_temperatura_fuera: "Temperatura fuera de rango",
  agua_oxigeno_bajo:      "Oxígeno bajo",
  mortalidad_anomala:     "Mortalidad anómala",
  endogamia_riesgo:       "Riesgo de endogamia",
  reporte_uma_proximo:    "Reporte UMA próximo",
  sin_registro_dias:      "Sin registro",
  post_mortem_generado:   "Análisis Axo AI",
  otro:                   "Alerta",
}

// Immediate action suggestions per alert type
const ACCIONES: Record<string, string[]> = {
  agua_nitrito_elevado: [
    "1. Cambio parcial de agua (30–40%) inmediato",
    "2. Verificar filtración biológica",
    "3. Reducir carga de alimentación",
    "4. Monitorear cada 2 horas hasta estabilizar",
  ],
  agua_amonio_elevado: [
    "1. Cambio parcial de agua (25–30%)",
    "2. Revisar densidad poblacional del estanque",
    "3. Reducir ración de alimento temporalmente",
    "4. Verificar funcionamiento del filtro",
  ],
  agua_ph_fuera_rango: [
    "1. Realizar cambio parcial de agua (20–30%)",
    "2. Revisar sustrato y decoración del estanque",
    "3. Medir alcalinidad (KH) del agua",
  ],
  agua_temperatura_fuera: [
    "1. Revisar sistema de enfriamiento/calentamiento",
    "2. Verificar temperatura ambiente del área",
    "3. Monitorear cada hora hasta estabilizar",
  ],
  agua_oxigeno_bajo: [
    "1. Aumentar aireación inmediatamente",
    "2. Reducir carga orgánica (alimentación)",
    "3. Verificar estado del equipo de aireación",
  ],
  sin_registro_dias: [
    "1. Registrar medición de parámetros del agua",
    "2. Verificar que el equipo de medición esté disponible",
    "3. Establecer recordatorio para mediciones periódicas",
  ],
  reporte_uma_proximo: [
    "1. Acceder al módulo de Reportes",
    "2. Generar el reporte trimestral en PDF",
    "3. Revisar y firmar el documento",
    "4. Enviarlo a SEMARNAT antes de la fecha límite",
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? "hace 1 min" : `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? "hace 1h" : `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "hace 1 día"
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

// ── Param pill ─────────────────────────────────────────────────────────────────

function ParamPill({ label, value, status }: { label: string; value: string; status: "ok" | "warn" | "critical" }) {
  const colors = {
    ok:       { bg: "#f0fdf4", text: "#15803d" },
    warn:     { bg: "#fffbeb", text: "#92400e" },
    critical: { bg: "#fef2f2", text: "#991b1b" },
  }
  const { bg, text } = colors[status]
  return (
    <div style={{ backgroundColor: bg, borderRadius: 4, padding: "3px 8px", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, fontWeight: 500, color: text }}>{value}</span>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 9, color: text, opacity: 0.8 }}>{label}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AlertaDetallePage({ params }: { params: { alerta_id: string } }) {
  const { activeRefugioId } = useRefugio()
  const [alerta, setAlerta] = useState<Alerta | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [relatedAlertas, setRelatedAlertas] = useState<Alerta[]>([])

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const [alertRes, allRes] = await Promise.all([
        fetch(`/api/refugios/${activeRefugioId}/alertas/${params.alerta_id}`),
        fetch(`/api/refugios/${activeRefugioId}/alertas?limit=20`),
      ])
      if (alertRes.ok) {
        const { data } = await alertRes.json()
        setAlerta(data)
        // Mark as read automatically on open
        if (data && !data.leida_at) {
          fetch(`/api/refugios/${activeRefugioId}/alertas/${params.alerta_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "leer" }),
          })
          setAlerta(prev => prev ? { ...prev, leida_at: new Date().toISOString() } : prev)
        }
      }
      if (allRes.ok) {
        const { data } = await allRes.json()
        setRelatedAlertas(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, params.alerta_id])

  useEffect(() => { load() }, [load])

  async function handleResolve() {
    if (!activeRefugioId || !alerta || resolving) return
    setResolving(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "resolver" }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setAlerta(prev => prev ? { ...prev, resuelta_at: data.resuelta_at, leida_at: data.leida_at ?? prev.leida_at } : prev)
      }
    } finally {
      setResolving(false)
    }
  }

  if (loading || !alerta) {
    return (
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ height: 14, width: 60, backgroundColor: "#f3f2ef", borderRadius: 4 }} />
          <span style={{ color: "#e5e2dc" }}>/</span>
          <div style={{ height: 14, width: 180, backgroundColor: "#f3f2ef", borderRadius: 4 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[120, 200, 100].map(h => (
              <div key={h} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, height: h }} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[140, 100, 120].map(h => (
              <div key={h} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, height: h }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const sev = SEV[alerta.severidad] ?? SEV.info
  const Icon = ICON_MAP[alerta.tipo] ?? Bell
  const acciones = ACCIONES[alerta.tipo]
  const ctx = alerta.datos_contexto
  const isCritical = alerta.severidad === "critical" || alerta.severidad === "error"

  // Related: same estanque, different alert
  const related = relatedAlertas.filter(a =>
    a.id !== alerta.id && a.estanque?.id && a.estanque.id === alerta.estanque?.id
  ).slice(0, 3)

  // Risk meter pct for parameter value
  const riskPct = ctx?.valor_actual != null && ctx?.umbral_max != null
    ? Math.min((ctx.valor_actual / (ctx.umbral_max * 2.5)) * 100, 98)
    : null

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      <style>{`@keyframes pulse-opacity { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/dashboard/alertas" style={{ fontSize: 13, color: "#9a958f", textDecoration: "none" }}>
            Alertas
          </Link>
          <span style={{ color: "#e5e2dc" }}>/</span>
          <span style={{ fontSize: 13, color: "#0d0d0d", fontWeight: 500 }}>
            {TYPE_LABELS[alerta.tipo] ?? alerta.tipo}
            {alerta.estanque ? ` · ${alerta.estanque.nombre}` : alerta.ajolote ? ` · ${alerta.ajolote.codigo}` : ""}
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, backgroundColor: sev.bg, color: sev.text, borderRadius: 9999, padding: "2px 8px" }}>
            {sev.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!alerta.resuelta_at && (
            <button type="button" onClick={handleResolve} disabled={resolving}
              style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: isCritical ? "#991b1b" : "#1a6560", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: resolving ? "default" : "pointer", opacity: resolving ? 0.7 : 1 }}>
              {resolving ? "Resolviendo..." : "Resolver"}
            </button>
          )}
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 12, alignItems: "start" }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Alert header card */}
          <div style={{
            backgroundColor: "#ffffff",
            borderLeft: `4px solid ${sev.border}`,
            borderTop: "0.5px solid #e5e2dc",
            borderRight: "0.5px solid #e5e2dc",
            borderBottom: "0.5px solid #e5e2dc",
            borderRadius: "0 10px 10px 0",
            padding: 20,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} color={sev.text} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: sev.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>{sev.label}</span>
                  {(isCritical) && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sev.dot, animation: "pulse-opacity 1.5s ease-in-out infinite" }} />
                  )}
                  <span style={{ fontSize: 10, color: "#9a958f" }}>· {TYPE_LABELS[alerta.tipo] ?? alerta.tipo}</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: "4px 0 0 0", lineHeight: 1.3 }}>
                  {alerta.titulo}
                </h1>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>
                    Generada {timeAgo(alerta.generada_at)}
                  </span>
                  <span style={{ color: "#e5e2dc" }}>·</span>
                  <span style={{ fontSize: 11, color: "#9a958f" }}>
                    {alerta.resuelta_at ? "Resuelta" : alerta.leida_at ? "Leída" : "Sin leer"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "16px 0" }} />

            <p style={{ fontSize: 14, color: "#3c3a36", lineHeight: 1.7, margin: 0 }}>
              {alerta.mensaje}
            </p>

            {/* Immediate action box — only for actionable alert types */}
            {acciones && !alerta.resuelta_at && (
              <div style={{ backgroundColor: sev.bg, border: `0.5px solid ${sev.border}33`, borderRadius: 8, padding: "14px 16px", marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: sev.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {isCritical ? "Acción inmediata requerida" : "Acciones recomendadas"}
                </div>
                {acciones.map(item => (
                  <div key={item} style={{ fontSize: 13, color: sev.text, lineHeight: 1.7 }}>{item}</div>
                ))}
              </div>
            )}
          </div>

          {/* Datos de contexto — shown when datos_contexto has a valor_actual */}
          {ctx?.valor_actual != null && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                Datos que dispararon esta alerta
              </div>

              {/* Featured value */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 40, fontWeight: 500, color: sev.text, lineHeight: 1 }}>
                  {ctx.valor_actual} {ctx.unidad ?? ""}
                </div>
                <div style={{ fontSize: 13, color: "#9a958f", marginTop: 4 }}>
                  {TYPE_LABELS[alerta.tipo]}{alerta.estanque ? ` · ${alerta.estanque.nombre}` : ""}
                </div>
                {ctx.umbral_max != null && (
                  <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>
                    Umbral seguro: {ctx.umbral_min != null ? `${ctx.umbral_min} – ` : "0 – "}{ctx.umbral_max} {ctx.unidad ?? ""}
                  </div>
                )}
              </div>

              {/* Risk meter */}
              {riskPct != null && (
                <>
                  <div style={{ marginTop: 14, position: "relative" }}>
                    <div style={{ height: 7, borderRadius: 4, background: "linear-gradient(to right, #15803d 0%, #92400e 40%, #991b1b 100%)" }} />
                    <div style={{ position: "absolute", top: -5, left: `calc(${riskPct}% - 4px)`, width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "7px solid #0d0d0d" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>0</span>
                    {ctx.umbral_max != null && (
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f" }}>
                        {ctx.umbral_max} (umbral)
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: sev.text, fontWeight: 500 }}>
                      {ctx.valor_actual} {ctx.unidad ?? ""}
                    </span>
                  </div>
                </>
              )}

              {/* Other params */}
              {ctx.otros_parametros && ctx.otros_parametros.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: "#9a958f", marginBottom: 8 }}>
                    Otros parámetros al momento de la alerta
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ctx.otros_parametros.map(p => (
                      <ParamPill key={p.nombre} label={p.nombre} value={`${p.valor} ${p.unidad}`} status={p.estado} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            {alerta.resuelta_at ? (
              <div style={{ backgroundColor: "#f0fdf4", borderLeft: "3px solid #15803d", borderRadius: "0 8px 8px 0", padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckCircle size={16} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#15803d" }}>Resuelta</div>
                  <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>
                    {timeAgo(alerta.resuelta_at)}
                  </div>
                  {resolutionNotes && (
                    <div style={{ fontSize: 12, color: "#3c3a36", marginTop: 6, lineHeight: 1.5 }}>{resolutionNotes}</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                  Resolver alerta
                </div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                  Notas de resolución
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="¿Qué acción tomaste para resolver esta alerta?"
                  rows={3}
                  style={{ width: "100%", height: 80, borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "10px 12px", fontSize: 13, color: "#0d0d0d", outline: "none", resize: "none", boxSizing: "border-box" }}
                />
                <button type="button" onClick={handleResolve} disabled={resolving}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: "none", backgroundColor: "#1a6560", fontSize: 13, fontWeight: 500, color: "#f9f9f7", cursor: resolving ? "default" : "pointer", marginTop: 12, opacity: resolving ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!resolving) e.currentTarget.style.backgroundColor = "#144f4b" }}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}>
                  Marcar como resuelta
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Estanque afectado */}
          {alerta.estanque && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>{alerta.estanque.nombre}</span>
                <span style={{ fontSize: 10, fontWeight: 500, backgroundColor: sev.bg, color: sev.text, borderRadius: 4, padding: "2px 8px" }}>{sev.label}</span>
              </div>
              <p style={{ fontSize: 12, color: "#9a958f", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                Esta alerta fue generada en respuesta a parámetros registrados en {alerta.estanque.nombre}.
              </p>
              <Link href={`/dashboard/estanques`}
                style={{ fontSize: 12, color: "#1a6560", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                Ver estanques <ChevronRight size={12} />
              </Link>
            </div>
          )}

          {/* Individuo relacionado */}
          {alerta.ajolote && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                Individuo relacionado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "3px 8px" }}>
                  {alerta.ajolote.codigo}
                </span>
                {alerta.ajolote.nombre && (
                  <span style={{ fontSize: 12, color: "#3c3a36" }}>{alerta.ajolote.nombre}</span>
                )}
              </div>
              <Link href={`/dashboard/inventario/${alerta.ajolote.id}`}
                style={{ display: "block", fontSize: 12, color: "#1a6560", textDecoration: "none", marginTop: 10 }}>
                Ver ficha del individuo →
              </Link>
            </div>
          )}

          {/* Alertas relacionadas */}
          {related.length > 0 && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Alertas relacionadas</div>
                {alerta.estanque && (
                  <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>Mismo estanque</div>
                )}
              </div>
              {related.map((r, i) => {
                const rs = SEV[r.severidad] ?? SEV.info
                return (
                  <Link key={r.id} href={`/dashboard/alertas/${r.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      borderLeft: `3px solid ${rs.border}`,
                      backgroundColor: "#f9f9f7",
                      borderRadius: "0 6px 6px 0",
                      padding: "10px 12px",
                      marginBottom: i < related.length - 1 ? 8 : 0,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#0d0d0d", fontWeight: 500 }}>
                          {TYPE_LABELS[r.tipo] ?? r.tipo}{r.estanque ? ` · ${r.estanque.nombre}` : ""}
                        </span>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f", flexShrink: 0, marginLeft: 8 }}>
                          {timeAgo(r.generada_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Axo AI suggestion */}
          <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Sparkles size={14} color="#1a6560" />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#f9f9f7" }}>Axo AI · Recomendación</span>
            </div>
            <p style={{ fontSize: 12, color: "#9a958f", lineHeight: 1.5, margin: 0 }}>
              {alerta.estanque
                ? `Pregúntale a Axo AI sobre el historial de ${alerta.estanque.nombre} o las mejores prácticas para resolver este tipo de alerta.`
                : "Pregúntale a Axo AI sobre esta alerta para obtener contexto adicional y recomendaciones personalizadas."}
            </p>
            <Link href="/dashboard/ai"
              style={{ display: "block", fontSize: 12, color: "#1a6560", textDecoration: "none", marginTop: 10 }}>
              Preguntarle a Axo AI →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
