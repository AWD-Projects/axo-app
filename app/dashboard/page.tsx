"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Droplets, Fish, Bell, FileText, Plus, Activity, Layers,
  ArrowRight, AlertTriangle, GitBranch, Clock, ChevronRight,
} from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Alerta {
  id: string
  tipo: string
  severidad: "info" | "warning" | "error" | "critical"
  titulo: string
  mensaje: string
  generada_at: string
}

interface Evento {
  id: string
  tipo: string
  fecha: string
  sujeto_tipo: string
  ajolote?: { codigo: string } | null
  estanque?: { nombre: string } | null
}

interface Cruza {
  id: string
  fecha_inicio: string | null
  fecha_planeada: string | null
  estado: string
  hembra?: { codigo: string } | null
  macho?: { codigo: string } | null
}

interface UltimaMedicion {
  fecha_hora: string
  temperatura: number | null
  ph: number | null
  amonio: number | null
  oxigeno: number | null
  nitrito: number | null
  estanques?: { nombre: string } | null
}

interface DashboardData {
  ajolotes_vivos: number
  estanques_activos: number
  alertas_no_leidas: number
  alertas: Alerta[]
  ultima_medicion: UltimaMedicion | null
  actividad_reciente: Evento[]
  cruzas_activas: Cruza[]
  inventario: { adultos: number; juveniles: number; jovenes: number; larvas: number; total: number }
  dias_proximo_reporte: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

function todayLabel() {
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Ahora"
  if (mins < 60) return `Hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Ayer"
  return `Hace ${days}d`
}

function eventoDesc(tipo: string, ajoloteCodigo?: string | null, estanqueNombre?: string | null): string {
  switch (tipo) {
    case "muerte":               return ajoloteCodigo ? `Deceso: ${ajoloteCodigo}` : "Deceso registrado"
    case "enfermedad":           return ajoloteCodigo ? `Enfermedad en ${ajoloteCodigo}` : "Enfermedad registrada"
    case "tratamiento":          return ajoloteCodigo ? `Tratamiento: ${ajoloteCodigo}` : "Tratamiento registrado"
    case "ingreso":              return ajoloteCodigo ? `Ingreso: ${ajoloteCodigo}` : "Nuevo ingreso"
    case "egreso":               return ajoloteCodigo ? `Egreso: ${ajoloteCodigo}` : "Egreso registrado"
    case "transferencia_interna":return estanqueNombre ? `Transferencia a ${estanqueNombre}` : "Transferencia interna"
    case "transferencia_externa":return "Transferencia externa"
    case "promocion_larval":     return "Promoción larval"
    default:                     return "Evento registrado"
  }
}

function eventoIconColor(tipo: string): { icon: React.ElementType; color: string } {
  switch (tipo) {
    case "muerte":               return { icon: AlertTriangle, color: "#dc2626" }
    case "enfermedad":           return { icon: Activity,      color: "#d97706" }
    case "tratamiento":          return { icon: Activity,      color: "#0284c7" }
    case "ingreso":              return { icon: Fish,          color: "#1a6560" }
    case "egreso":               return { icon: ArrowRight,    color: "#6b6560" }
    case "transferencia_interna":return { icon: ArrowRight,    color: "#6b6560" }
    case "transferencia_externa":return { icon: ArrowRight,    color: "#6b6560" }
    case "promocion_larval":     return { icon: GitBranch,     color: "#7c3aed" }
    default:                     return { icon: FileText,      color: "#9a958f" }
  }
}

function waterStatus(param: string, value: number | null): "ok" | "warn" | "error" {
  if (value === null) return "ok"
  switch (param) {
    case "temperatura": return value >= 14 && value <= 20 ? "ok" : value >= 10 && value <= 23 ? "warn" : "error"
    case "ph":          return value >= 6.8 && value <= 7.8 ? "ok" : value >= 6.5 && value <= 8.5 ? "warn" : "error"
    case "amonio":      return value < 0.25 ? "ok" : value < 1.0 ? "warn" : "error"
    case "oxigeno":     return value >= 6 ? "ok" : value >= 4 ? "warn" : "error"
    default:            return "ok"
  }
}

function statusDot(s: "ok" | "warn" | "error") {
  if (s === "ok")   return "bg-emerald-400"
  if (s === "warn") return "bg-amber-400"
  return "bg-red-500"
}

function severidadLabel(s: Alerta["severidad"]): { label: string; bg: string; text: string } {
  if (s === "critical" || s === "error") return { label: "Alta",  bg: "#fef2f2", text: "#991b1b" }
  if (s === "warning")                   return { label: "Media", bg: "#fffbeb", text: "#92400e" }
  return                                        { label: "Baja",  bg: "#f0fdf4", text: "#166534" }
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl ${className}`} style={{ backgroundColor: "#fff", border: "1px solid #e8e5df" }}>
      {children}
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #e8e5df" }}>
      <p className="text-sm font-semibold" style={{ color: "#0d0d0d" }}>{title}</p>
      {action && (
        <Link href={action.href} className="flex items-center gap-1 text-xs font-medium" style={{ color: "#1a6560" }}>
          {action.label} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  )
}

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: string
  href?: string
  loading?: boolean
}

function KpiCard({ icon: Icon, label, value, sub, accent = "#1a6560", href, loading }: KpiCardProps) {
  const inner = (
    <div
      className="flex flex-col gap-3 rounded-xl p-4 cursor-default select-none"
      style={{ backgroundColor: "#fff", border: "1px solid #e8e5df" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#6b6560" }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + "18" }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div>
        {loading ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton style={{ width: 56, height: 28 }} />
            <Skeleton style={{ width: 80, height: 10 }} />
          </div>
        ) : (
          <>
            <p
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#0d0d0d", fontFamily: "var(--font-dm-mono), DM Mono, monospace" }}
            >
              {value}
            </p>
            {sub && <p className="text-xs mt-0.5" style={{ color: "#9a958f" }}>{sub}</p>}
          </>
        )}
      </div>
    </div>
  )
  return href ? <Link href={href} className="block hover:scale-[1.01] transition-transform">{inner}</Link> : inner
}

function ActionChip({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors hover:bg-[#e8e5df]"
      style={{ backgroundColor: "#fff", border: "1px solid #e8e5df", color: "#0d0d0d" }}
    >
      <Icon size={15} style={{ color: "#1a6560" }} />
      {label}
    </Link>
  )
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function WaterCard({ medicion, loading }: { medicion: UltimaMedicion | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader title="Estado del agua" action={{ label: "Ver todo", href: "/dashboard/salud" }} />
        <div className="p-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-lg px-3 py-2.5 flex flex-col gap-2" style={{ backgroundColor: "#f9f9f7" }}>
              <Skeleton style={{ width: "60%", height: 10 }} />
              <Skeleton style={{ width: "80%", height: 16 }} />
            </div>
          ))}
        </div>
        <div className="px-4 pb-3"><Skeleton style={{ width: 160, height: 10 }} /></div>
      </Card>
    )
  }

  if (!medicion) {
    return (
      <Card>
        <CardHeader title="Estado del agua" action={{ label: "Ver todo", href: "/dashboard/salud" }} />
        <div className="px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "#9a958f" }}>Sin mediciones registradas</p>
          <Link href="/dashboard/salud/nueva" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1a6560" }}>
            <Plus size={13} /> Registrar primera medición
          </Link>
        </div>
      </Card>
    )
  }

  const PARAMS = [
    { label: "Temperatura", key: "temperatura", value: medicion.temperatura, unit: "°C" },
    { label: "pH",          key: "ph",          value: medicion.ph,          unit: ""    },
    { label: "Amoníaco",    key: "amonio",       value: medicion.amonio,      unit: " ppm" },
    { label: "Oxígeno",     key: "oxigeno",      value: medicion.oxigeno,     unit: " mg/L" },
  ]

  return (
    <Card>
      <CardHeader title="Estado del agua" action={{ label: "Ver todo", href: "/dashboard/salud" }} />
      <div className="p-4 grid grid-cols-2 gap-3">
        {PARAMS.map((p) => {
          const st = waterStatus(p.key, p.value)
          return (
            <div key={p.label} className="flex flex-col gap-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f9f9f7" }}>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(st)}`} />
                <span className="text-xs" style={{ color: "#6b6560" }}>{p.label}</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#0d0d0d" }}>
                {p.value !== null ? `${p.value}${p.unit}` : "—"}
              </p>
            </div>
          )
        })}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs flex items-center gap-1.5" style={{ color: "#9a958f" }}>
          <Clock size={12} />
          {relativeTime(medicion.fecha_hora)}
          {medicion.estanques?.nombre ? ` · ${medicion.estanques.nombre}` : ""}
        </p>
      </div>
    </Card>
  )
}

function ActivityCard({ eventos, loading }: { eventos: Evento[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader title="Actividad reciente" action={{ label: "Ver todo", href: "/dashboard/eventos" }} />
      {loading ? (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {[0, 1, 2, 3].map(i => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              <Skeleton style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                <Skeleton style={{ width: "70%", height: 12 }} />
                <Skeleton style={{ width: "30%", height: 10 }} />
              </div>
            </li>
          ))}
        </ul>
      ) : eventos.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "#9a958f" }}>Sin actividad reciente</p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {eventos.map((ev) => {
            const { icon: Icon, color } = eventoIconColor(ev.tipo)
            return (
              <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0" style={{ backgroundColor: color + "18" }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#0d0d0d" }}>
                    {eventoDesc(ev.tipo, ev.ajolote?.codigo, ev.estanque?.nombre)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9a958f" }}>{relativeTime(ev.fecha)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function AlertsCard({ alertas, loading }: { alertas: Alerta[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader title="Alertas activas" action={{ label: "Ver todo", href: "/dashboard/alertas" }} />
      {loading ? (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {[0, 1, 2].map(i => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton style={{ width: "65%", height: 12 }} />
                <Skeleton style={{ width: "25%", height: 10 }} />
              </div>
              <Skeleton style={{ width: 40, height: 20, borderRadius: 999 }} />
            </li>
          ))}
        </ul>
      ) : alertas.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "#9a958f" }}>Sin alertas activas</p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {alertas.map((a) => {
            const st = severidadLabel(a.severidad)
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: st.bg }}>
                  <AlertTriangle size={14} style={{ color: st.text }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-1" style={{ color: "#0d0d0d" }}>{a.titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9a958f" }}>{relativeTime(a.generada_at)}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: st.bg, color: st.text }}>
                  {st.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function ReproduccionCard({ cruzas, loading }: { cruzas: Cruza[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader title="Reproducción activa" action={{ label: "Ver todo", href: "/dashboard/reproduccion" }} />
      {loading ? (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {[0, 1].map(i => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton style={{ width: "55%", height: 12 }} />
                <Skeleton style={{ width: "20%", height: 10 }} />
              </div>
              <Skeleton style={{ width: 52, height: 20, borderRadius: 999 }} />
            </li>
          ))}
        </ul>
      ) : cruzas.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "#9a958f" }}>Sin cruzas activas</p>
          <Link href="/dashboard/reproduccion/nueva" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1a6560" }}>
            <Plus size={13} /> Planear cruza
          </Link>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "#f0ede8" }}>
          {cruzas.map((c) => {
            const inicio = c.fecha_inicio ?? c.fecha_planeada
            const dias = inicio ? Math.floor((Date.now() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24)) : null
            const etiqueta = c.estado === "activa" ? "Activa" : "Planeada"
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#7c3aed18" }}>
                  <GitBranch size={14} style={{ color: "#7c3aed" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#0d0d0d" }}>
                    {c.hembra?.codigo ?? "—"} × {c.macho?.codigo ?? "—"}
                  </p>
                  {dias !== null && (
                    <p className="text-xs mt-0.5" style={{ color: "#9a958f" }}>Día {dias}</p>
                  )}
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f3f0ff", color: "#7c3aed" }}>
                  {etiqueta}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { activeRefugioId, user, loading: ctxLoading } = useRefugio()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeRefugioId) return
    setLoading(true)
    fetch(`/api/refugios/${activeRefugioId}/dashboard`)
      .then(r => r.json())
      .then(json => { setData(json.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeRefugioId])

  const anyLoading = ctxLoading || loading

  return (
    <div className="flex flex-col gap-4 min-h-full">
      {/* Topbar */}
      <div className="pt-2 pb-1">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0d0d0d" }}>
          {greeting()}{user?.nombre ? `, ${user.nombre}.` : "."}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: "#9a958f" }}>{todayLabel()}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Fish}     label="Ajolotes vivos" value={data?.ajolotes_vivos ?? 0}   sub={data ? undefined : undefined}     loading={anyLoading} href="/dashboard/inventario" />
        <KpiCard icon={Layers}   label="Estanques"      value={data?.estanques_activos ?? 0} sub={data?.estanques_activos === 0 ? "Crear estanque" : "Activos"} loading={anyLoading} href="/dashboard/estanques" />
        <KpiCard icon={Bell}     label="Alertas"        value={data?.alertas_no_leidas ?? 0} sub="No leídas" loading={anyLoading} accent={(data?.alertas_no_leidas ?? 0) > 0 ? "#dc2626" : "#9a958f"} href="/dashboard/alertas" />
        <KpiCard
          icon={FileText}
          label="Reporte UMA"
          value={data?.dias_proximo_reporte !== null && data?.dias_proximo_reporte !== undefined ? `${data.dias_proximo_reporte}d` : "—"}
          sub={data?.dias_proximo_reporte !== null ? "Próximo vencimiento" : "No configurado"}
          loading={anyLoading}
          accent="#0284c7"
          href="/dashboard/reportes"
        />
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <ActionChip icon={Droplets}  label="Registrar medición" href="/dashboard/salud/nueva" />
        <ActionChip icon={Fish}      label="Nuevo ajolote"      href="/dashboard/inventario/nuevo" />
        <ActionChip icon={GitBranch} label="Planear cruza"      href="/dashboard/reproduccion/nueva" />
        <ActionChip icon={Activity}  label="Registrar evento"   href="/dashboard/eventos/nuevo" />
        <ActionChip icon={FileText}  label="Generar reporte"    href="/dashboard/reportes/nuevo" />
      </div>

      {/* Main grid: 55% / 45% */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 flex-1">
        <div className="flex flex-col gap-4">
          <WaterCard medicion={data?.ultima_medicion ?? null} loading={anyLoading} />
          <ActivityCard eventos={data?.actividad_reciente ?? []} loading={anyLoading} />
        </div>
        <div className="flex flex-col gap-4">
          <AlertsCard alertas={data?.alertas ?? []} loading={anyLoading} />
          <ReproduccionCard cruzas={data?.cruzas_activas ?? []} loading={anyLoading} />
        </div>
      </div>
    </div>
  )
}
