"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Droplets, FlaskConical, Thermometer, Wind, XCircle,
  GitBranch, FileText, Clock, Sparkles, Bell, ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = "critical" | "error" | "warning" | "info"

interface Alerta {
  id: string
  tipo: string
  severidad: Severity
  titulo: string
  mensaje: string
  generada_at: string
  leida_at: string | null
  resuelta_at: string | null
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
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div style={{ backgroundColor: "#ffffff", borderLeft: "3px solid #e5e2dc", borderTop: "0.5px solid #e5e2dc", borderRight: "0.5px solid #e5e2dc", borderBottom: "0.5px solid #e5e2dc", borderRadius: "0 10px 10px 0", padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f3f2ef", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: "60%", backgroundColor: "#f3f2ef", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 13, width: "85%", backgroundColor: "#f3f2ef", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 12, width: "100%", backgroundColor: "#f3f2ef", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const { activeRefugioId } = useRefugio()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"sin_leer" | "todas" | "resueltas">("sin_leer")
  const [severityFilter, setSeverityFilter] = useState("todas")
  const [typeFilter, setTypeFilter] = useState("todas")
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/alertas?limit=100`)
      if (res.ok) {
        const { data } = await res.json()
        setAlertas(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    if (!activeRefugioId) return
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida_at: new Date().toISOString() } : a))
    window.dispatchEvent(new CustomEvent("alertas-updated"))
    await fetch(`/api/refugios/${activeRefugioId}/alertas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "leer" }),
    })
  }

  async function markAllRead() {
    if (!activeRefugioId || markingAll) return
    setMarkingAll(true)
    const now = new Date().toISOString()
    setAlertas(prev => prev.map(a => ({ ...a, leida_at: a.leida_at ?? now })))
    window.dispatchEvent(new CustomEvent("alertas-updated"))
    try {
      await fetch(`/api/refugios/${activeRefugioId}/alertas/leer-todas`, { method: "POST" })
    } finally {
      setMarkingAll(false)
    }
  }

  const unread = alertas.filter(a => !a.leida_at)
  const resolved = alertas.filter(a => a.resuelta_at)

  const criticalUnread = unread.filter(a => a.severidad === "critical" || a.severidad === "error").length
  const warningUnread  = unread.filter(a => a.severidad === "warning").length
  const infoUnread     = unread.filter(a => a.severidad === "info").length
  const resolvedMonth  = resolved.filter(a => isThisMonth(a.resuelta_at!)).length

  const filtered = alertas.filter(a => {
    if (activeTab === "sin_leer" && a.leida_at) return false
    if (activeTab === "resueltas" && !a.resuelta_at) return false
    if (severityFilter !== "todas" && a.severidad !== severityFilter) return false
    if (typeFilter !== "todas" && a.tipo !== typeFilter) return false
    return true
  })

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      <style>{`
        @keyframes pulse-opacity { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        .alert-card { transition: background-color 150ms; }
        .alert-card:hover { background-color: #f4f3f0 !important; }
      `}</style>

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Alertas</h1>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll || unread.length === 0}
          style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontSize: 12, color: "#3c3a36", cursor: unread.length === 0 ? "default" : "pointer", opacity: unread.length === 0 ? 0.5 : 1 }}
          onMouseEnter={e => { if (unread.length > 0) e.currentTarget.style.backgroundColor = "#f9f9f7" }}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
        >
          {markingAll ? "Marcando..." : "Marcar todas como leídas"}
        </button>
      </div>

      {/* Summary row */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#991b1b", flexShrink: 0, animation: "pulse-opacity 1.5s ease-in-out infinite" }} />
          <div>
            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: criticalUnread > 0 ? "#991b1b" : "#9a958f", lineHeight: 1 }}>{criticalUnread}</div>
            <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>crítica{criticalUnread !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ width: "0.5px", height: 36, backgroundColor: "#e5e2dc", flexShrink: 0 }} />
        <div style={{ flex: 1, paddingLeft: 20 }}>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: warningUnread > 0 ? "#92400e" : "#9a958f", lineHeight: 1 }}>{warningUnread}</div>
          <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>advertencia{warningUnread !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ width: "0.5px", height: 36, backgroundColor: "#e5e2dc", flexShrink: 0 }} />
        <div style={{ flex: 1, paddingLeft: 20 }}>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: "#9a958f", lineHeight: 1 }}>{infoUnread}</div>
          <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>informativa{infoUnread !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ width: "0.5px", height: 36, backgroundColor: "#e5e2dc", flexShrink: 0 }} />
        <div style={{ flex: 1, paddingLeft: 20 }}>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: "#15803d", lineHeight: 1 }}>{resolvedMonth}</div>
          <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>resueltas este mes</div>
        </div>
      </div>

      {/* Tabs + filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex" }}>
          {(["sin_leer", "todas", "resueltas"] as const).map(tab => {
            const labels = { sin_leer: "Sin leer", todas: "Todas", resueltas: "Resueltas" }
            const active = activeTab === tab
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", borderBottom: active ? "2px solid #0d0d0d" : "2px solid transparent", padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: active ? 500 : 400, color: active ? "#0d0d0d" : "#9a958f", display: "flex", alignItems: "center", gap: 6 }}>
                {labels[tab]}
                {tab === "sin_leer" && unread.length > 0 && (
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, fontWeight: 500, backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: 4, padding: "1px 5px" }}>
                    {unread.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontSize: 12, color: "#3c3a36", outline: "none", cursor: "pointer", appearance: "none" }}>
            <option value="todas">Tipo: Todas</option>
            <option value="agua_nitrito_elevado">Nitrito</option>
            <option value="agua_amonio_elevado">Amonio</option>
            <option value="agua_ph_fuera_rango">pH</option>
            <option value="agua_temperatura_fuera">Temperatura</option>
            <option value="agua_oxigeno_bajo">Oxígeno</option>
            <option value="reporte_uma_proximo">Reporte UMA</option>
            <option value="endogamia_riesgo">Endogamia</option>
            <option value="sin_registro_dias">Sin registro</option>
            <option value="post_mortem_generado">Análisis AI</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontSize: 12, color: "#3c3a36", outline: "none", cursor: "pointer", appearance: "none" }}>
            <option value="todas">Severidad: Todas</option>
            <option value="critical">Crítico</option>
            <option value="warning">Advertencia</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <AlertSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 32px" }}>
          <Bell size={32} color="#e5e2dc" />
          <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginTop: 16 }}>
            {activeTab === "resueltas" ? "Sin alertas resueltas" : "Todo al día"}
          </div>
          <div style={{ fontSize: 13, color: "#9a958f", marginTop: 6, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            {activeTab === "resueltas"
              ? "Las alertas resueltas aparecerán aquí."
              : "No hay alertas sin leer. El sistema monitorea parámetros cada 6 horas automáticamente."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(alert => {
            const sev = SEV[alert.severidad] ?? SEV.info
            const Icon = ICON_MAP[alert.tipo] ?? Bell
            const isRead = !!alert.leida_at

            return (
              <Link key={alert.id} href={`/dashboard/alertas/${alert.id}`} style={{ textDecoration: "none" }}>
                <div className="alert-card" style={{
                  position: "relative",
                  backgroundColor: isRead ? "#f9f9f7" : "#ffffff",
                  borderLeft: `3px solid ${sev.border}`,
                  borderTop: "0.5px solid #e5e2dc",
                  borderRight: "0.5px solid #e5e2dc",
                  borderBottom: "0.5px solid #e5e2dc",
                  borderRadius: "0 10px 10px 0",
                  padding: "14px 16px",
                  cursor: "pointer",
                }}>
                  {!isRead && (
                    <div style={{ position: "absolute", top: 14, right: 14, width: 6, height: 6, borderRadius: "50%", backgroundColor: sev.dot }} />
                  )}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingRight: 12 }}>
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={sev.text} />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, borderRadius: 9999, padding: "2px 8px", backgroundColor: sev.bg, color: sev.text }}>
                            {sev.label}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                            {TYPE_LABELS[alert.tipo] ?? alert.tipo}
                          </span>
                        </div>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f", flexShrink: 0, marginLeft: 12 }}>
                          {timeAgo(alert.generada_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d", marginTop: 4 }}>{alert.titulo}</div>
                      <div style={{ fontSize: 12, color: "#3c3a36", lineHeight: 1.4, marginTop: 3 }}>{alert.mensaje}</div>
                      {(alert.estanque || alert.ajolote) && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                          {alert.estanque && (
                            <span style={{ fontSize: 10, fontWeight: 500, backgroundColor: "#f3f2ef", color: "#3c3a36", borderRadius: 4, padding: "1px 6px" }}>
                              {alert.estanque.nombre}
                            </span>
                          )}
                          {alert.ajolote && (
                            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, fontWeight: 500, backgroundColor: "#e2f0ee", color: "#1a6560", borderRadius: 4, padding: "1px 6px" }}>
                              {alert.ajolote.codigo}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: "#1a6560" }}>Ver detalle</span>
                        <span style={{ color: "#e5e2dc" }}>·</span>
                        {!isRead && (
                          <>
                            <button type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); markRead(alert.id) }}
                              style={{ fontSize: 12, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              Marcar como leída
                            </button>
                            <span style={{ color: "#e5e2dc" }}>·</span>
                          </>
                        )}
                        <span style={{ fontSize: 12, color: "#9a958f" }}>
                          {alert.resuelta_at ? "Resuelta" : "Resolver"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#e5e2dc" style={{ flexShrink: 0, marginTop: 6 }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
