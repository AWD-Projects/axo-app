"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Sparkles, Activity, LogIn, AlertCircle, Pill } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { ObservacionModal } from "@/components/salud/observacion-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AjoloteParent { id: string; codigo: string; nombre: string | null }

interface AjoloteDetail {
  id: string
  codigo: string
  nombre: string | null
  sexo: "macho" | "hembra" | "indeterminado" | null
  estado: "vivo" | "fallecido" | "transferido" | "egresado"
  morfotipo: string | null
  fecha_nacimiento: string | null
  fecha_ingreso: string | null
  origen: string | null
  notas: string | null
  refugio_id: string
  madre: AjoloteParent | null
  padre: AjoloteParent | null
  estanques: { id: string; nombre: string } | null
  hijos: { id: string; codigo: string; nombre: string | null; sexo: string | null; estado: string }[]
  eventos_recientes: { id: string; tipo: string; fecha: string; detalles: Record<string, unknown> }[]
}

interface Cruza {
  id: string
  estado: string
  fecha_inicio: string | null
  coeficiente_consanguinidad: number | null
  hembra: { id: string; codigo: string } | null
  macho: { id: string; codigo: string } | null
}

interface Observacion {
  id: string
  descripcion: string
  severidad: "leve" | "moderada" | "grave" | "critica" | null
  fecha_hora: string
  registrado_por: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dateStr: string | null): string {
  if (!dateStr) return "—"
  const birth = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return "< 1 mes"
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} ${rem === 1 ? "mes" : "meses"}`
  if (rem === 0) return `${years} ${years === 1 ? "año" : "años"}`
  return `${years} años ${rem} meses`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr))
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
  if (isToday) return `hoy ${time}`
  if (isYesterday) return `ayer ${time}`
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + ` ${time}`
}

const SEX_DOT: Record<string, string> = { macho: "#1e3a8a", hembra: "#991b1b", indeterminado: "#9a958f" }
const SEX_LABEL: Record<string, string> = { macho: "Macho", hembra: "Hembra", indeterminado: "S/D" }
const MORFOTIPO_LABELS: Record<string, string> = {
  normal: "Normal", leucistico: "Leucístico", albino: "Albino",
  melanico: "Melánico", golden: "Dorado", axanthic: "Axántico",
}
const ESTADO_PILL: Record<string, { label: string; bg: string; text: string }> = {
  vivo: { label: "Vivo", bg: "#f0fdf4", text: "#15803d" },
  fallecido: { label: "Fallecido", bg: "#fef2f2", text: "#991b1b" },
  transferido: { label: "Transferido", bg: "#f3f2ef", text: "#9a958f" },
  egresado: { label: "Egresado", bg: "#f3f2ef", text: "#9a958f" },
}
const ORIGEN_LABELS: Record<string, string> = {
  nacido_en_refugio: "Nacido en refugio",
  ingreso_externo: "Ingreso externo",
  silvestre_rescatado: "Silvestre rescatado",
}
const EVENTO_META: Record<string, { bg: string; color: string; Icon: React.ElementType }> = {
  muerte: { bg: "#fef2f2", color: "#991b1b", Icon: AlertCircle },
  enfermedad: { bg: "#fffbeb", color: "#92400e", Icon: Activity },
  tratamiento: { bg: "#fffbeb", color: "#92400e", Icon: Pill },
  ingreso: { bg: "#f0fdf4", color: "#15803d", Icon: LogIn },
  egreso: { bg: "#f3f2ef", color: "#9a958f", Icon: ChevronRight },
  transferencia_interna: { bg: "#f3f2ef", color: "#9a958f", Icon: ChevronRight },
  transferencia_externa: { bg: "#f3f2ef", color: "#9a958f", Icon: ChevronRight },
  otro: { bg: "#e2f0ee", color: "#1a6560", Icon: Activity },
}
const EVENTO_LABEL: Record<string, string> = {
  muerte: "Muerte registrada",
  enfermedad: "Enfermedad",
  tratamiento: "Tratamiento",
  ingreso: "Ingreso al refugio",
  egreso: "Egreso",
  transferencia_interna: "Transferencia interna",
  transferencia_externa: "Transferencia externa",
  otro: "Evento registrado",
}

function coefColor(c: number): string {
  if (c > 0.25) return "#991b1b"
  if (c > 0.125) return "#92400e"
  return "#15803d"
}

// ── Data grid cell ────────────────────────────────────────────────────────────

function DataCell({ label, value, mono, link, linkHref }: { label: string; value: React.ReactNode; mono?: boolean; link?: boolean; linkHref?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
        {label}
      </div>
      {link && linkHref ? (
        <Link href={linkHref} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#1a6560", textDecoration: "none" }}>
          {value}
        </Link>
      ) : (
        <div style={{ fontFamily: mono ? "var(--font-dm-mono), DM Mono, monospace" : "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>
          {value}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AjoloteDetallePage() {
  const { ajolote_id } = useParams() as { ajolote_id: string }
  const router = useRouter()
  const { activeRefugioId } = useRefugio()

  const [ajolote, setAjolote] = useState<AjoloteDetail | null>(null)
  const [cruzas, setCruzas] = useState<Cruza[]>([])
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [loading, setLoading] = useState(true)
  const [obsModalOpen, setObsModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/ajolotes/${ajolote_id}`)
      if (!res.ok) { router.push("/dashboard/inventario"); return }
      const { data } = await res.json()
      setAjolote(data)

      const [cruzasRes, obsRes] = await Promise.all([
        fetch(`/api/refugios/${activeRefugioId}/cruzas?hembra_id=${ajolote_id}`).then(r => r.json()),
        fetch(`/api/refugios/${activeRefugioId}/observaciones?sujeto_tipo=ajolote&sujeto_id=${ajolote_id}`).then(r => r.json()),
      ])
      // Also fetch as macho
      const cruzasMachoRes = await fetch(`/api/refugios/${activeRefugioId}/cruzas?macho_id=${ajolote_id}`).then(r => r.json())
      const allCruzas = [...(cruzasRes.data ?? []), ...(cruzasMachoRes.data ?? [])]
      setCruzas(allCruzas)
      setObservaciones(obsRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, ajolote_id, router])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
        <div className="flex items-center" style={{ gap: 6, marginBottom: 20 }}>
          <Skeleton style={{ width: 60, height: 12 }} />
          <Skeleton style={{ width: 8, height: 12 }} />
          <Skeleton style={{ width: 40, height: 12 }} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1.85fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
              <Skeleton style={{ width: 80, height: 36, marginBottom: 12 }} />
              <Skeleton style={{ width: 160, height: 16, marginBottom: 8 }} />
              <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "16px 0" }} />
              <div className="grid grid-cols-2" style={{ gap: 16 }}>
                {[0,1,2,3,4,5].map(i => <div key={i}><Skeleton style={{ width: "60%", height: 10, marginBottom: 6 }} /><Skeleton style={{ width: "80%", height: 13 }} /></div>)}
              </div>
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <Skeleton style={{ width: 100, height: 14, marginBottom: 16 }} />
              {[0,1,2].map(i => <div key={i} className="flex" style={{ gap: 12, marginBottom: 16 }}><Skeleton style={{ width: 28, height: 28, borderRadius: "50%" }} /><Skeleton style={{ flex: 1, height: 60, borderRadius: 8 }} /></div>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0,1,2].map(i => <div key={i} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}><Skeleton style={{ width: 100, height: 14, marginBottom: 12 }} />{[0,1].map(j => <Skeleton key={j} style={{ width: "100%", height: 32, marginBottom: 8 }} />)}</div>)}
          </div>
        </div>
      </div>
    )
  }

  if (!ajolote) return null

  const estadoPill = ESTADO_PILL[ajolote.estado] ?? ESTADO_PILL.vivo
  const sexoDot = ajolote.sexo ? SEX_DOT[ajolote.sexo] : "#9a958f"
  const sexoLabel = ajolote.sexo ? SEX_LABEL[ajolote.sexo] : "S/D"
  const morfLabel = ajolote.morfotipo ? (MORFOTIPO_LABELS[ajolote.morfotipo] ?? ajolote.morfotipo) : "—"
  const origenLabel = ajolote.origen ? (ORIGEN_LABELS[ajolote.origen] ?? ajolote.origen) : "—"

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <Link href="/dashboard/inventario" style={{ fontSize: 12, color: "#9a958f", textDecoration: "none" }}>Inventario</Link>
          <span style={{ fontSize: 12, color: "#9a958f" }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{ajolote.codigo}</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer" }}>
            Editar
          </button>
          <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7", cursor: "pointer" }}>
            Registrar evento
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid" style={{ gridTemplateColumns: "1.85fr 1fr", gap: 12, alignItems: "start" }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Identity card */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
            <div className="flex items-start justify-between">
              <div>
                <div style={{ display: "inline-block" }}>
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 20, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 6, padding: "6px 14px" }}>
                    {ajolote.codigo}
                  </span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>
                    {ajolote.nombre ?? "Sin nombre"}
                  </div>
                  <div className="flex items-center" style={{ gap: 6, marginTop: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sexoDot, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{sexoLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end" style={{ gap: 6 }}>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, borderRadius: 999, padding: "4px 12px", backgroundColor: estadoPill.bg, color: estadoPill.text }}>
                  {estadoPill.label}
                </span>
                {morfLabel !== "—" && (
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, borderRadius: 4, padding: "2px 8px", backgroundColor: "#f3f2ef", color: "#3c3a36" }}>
                    {morfLabel}
                  </span>
                )}
              </div>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "16px 0" }} />

            <div className="grid grid-cols-3" style={{ gap: 16 }}>
              <DataCell label="Fecha nacimiento" value={formatDate(ajolote.fecha_nacimiento)} mono />
              <DataCell label="Fecha ingreso" value={formatDate(ajolote.fecha_ingreso)} mono />
              <DataCell label="Origen" value={origenLabel} />
              <DataCell label="Estanque" value={ajolote.estanques?.nombre ?? "—"} link={!!ajolote.estanques} linkHref={ajolote.estanques ? `/dashboard/estanques/${ajolote.estanques.id}` : undefined} />
              <DataCell label="Edad" value={calcAge(ajolote.fecha_nacimiento)} mono />
              <DataCell label="Refugio" value="—" />
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "16px 0" }} />

            {/* Linaje */}
            <div className="flex items-center" style={{ gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                Linaje
              </span>

              <div className="flex items-center" style={{ gap: 12 }}>
                {[
                  { parent: ajolote.madre, role: "Madre" },
                  { parent: ajolote.padre, role: "Padre" },
                ].map(({ parent, role }) => (
                  <div key={role} className="flex flex-col items-center" style={{ gap: 4 }}>
                    {parent ? (
                      <Link href={`/dashboard/inventario/${parent.id}`} style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 8px", textDecoration: "none" }}>
                        {parent.codigo}
                      </Link>
                    ) : (
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", fontStyle: "italic" }}>Desc.</span>
                    )}
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f" }}>{role}</span>
                  </div>
                ))}
              </div>

              <span style={{ color: "#9a958f", fontSize: 16 }}>→</span>

              <div className="flex flex-col items-center" style={{ gap: 4 }}>
                <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 8px" }}>
                  {ajolote.codigo}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f" }}>Este individuo</span>
              </div>

              <Link href={`/dashboard/inventario/${ajolote_id}/arbol`} className="flex items-center gap-1" style={{ marginLeft: "auto", fontSize: 12, color: "#1a6560", textDecoration: "none" }}>
                Ver árbol genealógico <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Historial</span>
              <select style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", border: "0.5px solid #e5e2dc", borderRadius: 6, padding: "4px 10px", background: "#ffffff", cursor: "pointer", outline: "none" }}>
                <option>Todos los eventos</option>
                <option>Solo tratamientos</option>
              </select>
            </div>

            {ajolote.eventos_recientes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "#9a958f" }}>Sin eventos registrados</div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 13, top: 0, bottom: 0, width: 2, backgroundColor: "#e5e2dc" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {ajolote.eventos_recientes.map((ev, i) => {
                    const meta = EVENTO_META[ev.tipo] ?? EVENTO_META.otro
                    const Icon = meta.Icon
                    const label = EVENTO_LABEL[ev.tipo] ?? ev.tipo
                    const detail = ev.detalles ? Object.values(ev.detalles).slice(0, 2).join(" · ") : ""
                    return (
                      <div key={ev.id} className="flex items-start" style={{ gap: 12, marginBottom: i < ajolote.eventos_recientes.length - 1 ? 16 : 0, position: "relative" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          backgroundColor: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 1, position: "relative",
                        }}>
                          <Icon size={13} color={meta.color} />
                        </div>
                        <div style={{ flex: 1, backgroundColor: "#f9f9f7", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>{label}</div>
                          {detail && <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", marginTop: 2 }}>{detail}</div>}
                          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 4 }}>{formatFecha(ev.fecha)}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 10, color: "#9a958f", flexShrink: 0, paddingTop: 8 }}>
                          {relativeTime(ev.fecha)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Descendencia */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Descendencia</span>
                <span style={{ fontSize: 12, color: "#9a958f" }}>{ajolote.hijos.length} hijos</span>
              </div>
            </div>
            {ajolote.hijos.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9a958f", textAlign: "center", padding: "12px 0" }}>Sin descendencia registrada</div>
            ) : (
              <>
                {ajolote.hijos.map((h, i) => {
                  const hEstado = ESTADO_PILL[h.estado] ?? ESTADO_PILL.vivo
                  return (
                    <Link key={h.id} href={`/dashboard/inventario/${h.id}`}
                      className="flex items-center"
                      style={{ gap: 8, padding: "8px 0", borderBottom: i < ajolote.hijos.length - 1 ? "0.5px solid #edeae4" : "none", textDecoration: "none" }}>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "1px 6px" }}>
                        {h.codigo}
                      </span>
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", flex: 1 }}>
                        {h.sexo ? SEX_LABEL[h.sexo] ?? h.sexo : "S/D"}
                      </span>
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, borderRadius: 999, padding: "1px 6px", backgroundColor: hEstado.bg, color: hEstado.text }}>
                        {hEstado.label}
                      </span>
                    </Link>
                  )
                })}
                <Link href={`/dashboard/inventario/${ajolote_id}/arbol`} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none", display: "block", marginTop: 12 }}>
                  Ver árbol genealógico completo →
                </Link>
              </>
            )}
          </div>

          {/* Cruzas */}
          {cruzas.length > 0 && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Cruzas</span>
              </div>
              {cruzas.slice(0, 4).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between"
                  style={{ padding: "9px 0", borderBottom: i < cruzas.length - 1 ? "0.5px solid #edeae4" : "none" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>
                      {c.macho?.codigo} × {c.hembra?.codigo}
                    </div>
                    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2, textTransform: "capitalize" }}>
                      {c.estado} · {c.fecha_inicio ? formatDate(c.fecha_inicio) : "—"}
                    </div>
                  </div>
                  {c.coeficiente_consanguinidad !== null && (
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "2px 6px", backgroundColor: "#f0fdf4", color: coefColor(c.coeficiente_consanguinidad) }}>
                      {c.coeficiente_consanguinidad.toFixed(3)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Observaciones */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>Observaciones</span>
              <button type="button" onClick={() => setObsModalOpen(true)}
                style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                + Agregar
              </button>
            </div>
            {observaciones.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9a958f", textAlign: "center", padding: "12px 0" }}>Sin observaciones</div>
            ) : (
              observaciones.slice(0, 3).map((o, i) => {
                const sevColor = o.severidad === "grave" || o.severidad === "critica" ? "#991b1b" : "#92400e"
                return (
                  <div key={o.id} style={{ padding: "10px 0", borderBottom: i < observaciones.length - 1 ? "0.5px solid #edeae4" : "none" }}>
                    <div className="flex items-start" style={{ gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sevColor, marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d", lineHeight: 1.4 }}>{o.descripcion}</div>
                        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f", marginTop: 4 }}>
                          {relativeTime(o.fecha_hora)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Axo AI */}
          <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center" style={{ gap: 6 }}>
              <Sparkles size={14} color="#1a6560" />
              <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7" }}>Axo AI</span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
              {ajolote.sexo === "macho"
                ? `${ajolote.codigo} puede ser emparejado para optimizar diversidad genética. Verifica los coeficientes antes de planear una cruza.`
                : `${ajolote.codigo} no tiene cruzas activas. Revisa el historial reproductivo para planificar.`}
            </p>
            <Link href="/dashboard/reproduccion" style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#1a6560", textDecoration: "none", display: "block", marginTop: 10 }}>
              Ver cruzas óptimas →
            </Link>
          </div>
        </div>
      </div>

      {activeRefugioId && ajolote && (
        <ObservacionModal
          open={obsModalOpen}
          onClose={() => setObsModalOpen(false)}
          refugioId={activeRefugioId}
          onSuccess={load}
          preselectedAjolote={{ id: ajolote.id, codigo: ajolote.codigo, nombre: ajolote.nombre }}
        />
      )}
    </div>
  )
}
