"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Sparkles, Plus } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { PuestaModal } from "@/components/reproduccion/puesta-modal"

// ── Types ──────────────────────────────────────────────────────────────────────

interface AjoloteParent {
  id: string
  codigo: string
  nombre: string | null
  madre: { id: string; codigo: string } | null
  padre: { id: string; codigo: string } | null
}

interface Puesta {
  id: string
  fecha_puesta: string
  cantidad_huevos: number | null
  cantidad_eclosionada: number | null
  notas: string | null
  lote_id: string | null
  lote: {
    id: string; codigo: string; etapa: string
    cantidad_actual: number; cantidad_inicial: number; fecha_inicio: string
  } | null
}

interface Cruza {
  id: string
  estado: "planeada" | "activa" | "exitosa" | "fallida" | "cancelada"
  coeficiente_consanguinidad: number
  fecha_planeada: string | null
  fecha_inicio: string | null
  notas: string | null
  created_at: string
  hembra: AjoloteParent | null
  macho: AjoloteParent | null
  estanques: { id: string; nombre: string } | null
  puestas: Puesta[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function riesgoInfo(coef: number) {
  if (coef > 0.25) return { label: "Alto",    color: "#991b1b", bg: "#fef2f2" }
  if (coef > 0.125) return { label: "Moderado", color: "#92400e", bg: "#fffbeb" }
  return { label: "Bajo", color: "#15803d", bg: "#f0fdf4" }
}

const ESTADO_META: Record<string, { bg: string; color: string; label: string }> = {
  planeada:  { bg: "#f3f2ef", color: "#3c3a36",  label: "Planeada"  },
  activa:    { bg: "#eff6ff", color: "#1e3a8a",  label: "Activa"    },
  exitosa:   { bg: "#f0fdf4", color: "#15803d",  label: "Exitosa"   },
  fallida:   { bg: "#fef2f2", color: "#991b1b",  label: "Fallida"   },
  cancelada: { bg: "#f3f2ef", color: "#9a958f",  label: "Cancelada" },
}

const ETAPA_LABELS: Record<string, string> = {
  larva_temprana:  "Larva temprana",
  larva_avanzada:  "Larva avanzada",
  juvenil:         "Juvenil",
  adulto:          "Adulto",
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", flex: 1 }}>{value}</span>
    </div>
  )
}

// ── Mini genealogy SVG ─────────────────────────────────────────────────────────

function MiniGenealogy({ hembra, macho }: { hembra: AjoloteParent; macho: AjoloteParent }) {
  const W = 540
  const NODE_W = 80; const NODE_H = 40; const GAP_Y = 64

  const HX = 130;  const MX = 410
  const H_MOM_X = 52; const H_DAD_X = 208
  const M_MOM_X = 332; const M_DAD_X = 488

  function NodeRect({ cx, y, code, sub, main = false }: { cx: number; y: number; code: string; sub?: string; main?: boolean }) {
    const x = cx - NODE_W / 2
    return (
      <g>
        <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={6} fill="#ffffff" stroke="#e5e2dc" strokeWidth={0.5} />
        <text x={cx} y={y + (sub ? 16 : 22)} textAnchor="middle" fill={main ? "#1a6560" : "#0d0d0d"}
          style={{ fontFamily: "DM Mono, monospace" }} fontSize={main ? 13 : 10} fontWeight={500}>{code}</text>
        {sub && <text x={cx} y={y + 30} textAnchor="middle" fill="#9a958f" style={{ fontFamily: "DM Sans, sans-serif" }} fontSize={9}>{sub}</text>}
      </g>
    )
  }

  function bezierPath(x1: number, x2: number) {
    const y1 = NODE_H; const y2 = GAP_Y
    const cy = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${GAP_Y + NODE_H}`} style={{ overflow: "visible" }}>
      {/* Grandparent nodes */}
      <NodeRect cx={H_MOM_X} y={0} code={hembra.madre?.codigo ?? "?"} sub="♀" />
      <NodeRect cx={H_DAD_X} y={0} code={hembra.padre?.codigo ?? "?"} sub="♂" />
      <NodeRect cx={M_MOM_X} y={0} code={macho.madre?.codigo ?? "?"} sub="♀" />
      <NodeRect cx={M_DAD_X} y={0} code={macho.padre?.codigo ?? "?"} sub="♂" />

      {/* Bezier connectors */}
      <path d={bezierPath(H_MOM_X, HX)} fill="none" stroke="#e5e2dc" strokeWidth={1} />
      <path d={bezierPath(H_DAD_X, HX)} fill="none" stroke="#e5e2dc" strokeWidth={1} />
      <path d={bezierPath(M_MOM_X, MX)} fill="none" stroke="#e5e2dc" strokeWidth={1} />
      <path d={bezierPath(M_DAD_X, MX)} fill="none" stroke="#e5e2dc" strokeWidth={1} />

      {/* Parent nodes */}
      <NodeRect cx={HX} y={GAP_Y} code={hembra.codigo} sub="♀ Hembra" main />
      <NodeRect cx={MX} y={GAP_Y} code={macho.codigo} sub="♂ Macho" main />

      {/* Cross connector */}
      <line x1={HX + NODE_W / 2} y1={GAP_Y + NODE_H / 2} x2={MX - NODE_W / 2} y2={GAP_Y + NODE_H / 2} stroke="#e5e2dc" strokeWidth={1} strokeDasharray="4,3" />
      <text x={W / 2} y={GAP_Y + NODE_H / 2 + 5} textAnchor="middle" fill="#9a958f" style={{ fontFamily: "DM Mono, monospace" }} fontSize={14}>×</text>
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CruzaDetailPage() {
  const router = useRouter()
  const { cruza_id } = useParams<{ cruza_id: string }>()
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [cruza, setCruza] = useState<Cruza | null>(null)
  const [loading, setLoading] = useState(true)
  const [puestaModalOpen, setPuestaModalOpen] = useState(false)
  const [loteCantidad, setLoteCantidad] = useState("")
  const [savingLote, setSavingLote] = useState(false)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/cruzas/${cruza_id}`)
      if (!res.ok) { router.push("/dashboard/reproduccion"); return }
      const { data } = await res.json()
      setCruza(data)
    } finally { setLoading(false) }
  }, [activeRefugioId, cruza_id, router])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  if (loading || !cruza) {
    return (
      <div>
        <Skeleton style={{ width: 260, height: 16, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton style={{ height: 220, borderRadius: 10 }} />
            <Skeleton style={{ height: 180, borderRadius: 10 }} />
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

  const riesgo = riesgoInfo(cruza.coeficiente_consanguinidad)
  const estado = ESTADO_META[cruza.estado] ?? ESTADO_META["cancelada"]
  const pairLabel = `${cruza.macho?.codigo ?? "?"} × ${cruza.hembra?.codigo ?? "?"}`

  const activeLote = cruza.puestas
    .map(p => p.lote)
    .filter(Boolean)
    .sort((a, b) => new Date(b!.fecha_inicio).getTime() - new Date(a!.fecha_inicio).getTime())[0] ?? null

  const survPct = (() => {
    const h = cruza.puestas.reduce((s, p) => s + (p.cantidad_huevos ?? 0), 0)
    const e = cruza.puestas.reduce((s, p) => s + (p.cantidad_eclosionada ?? 0), 0)
    return h > 0 ? (e / h) * 100 : null
  })()

  async function saveLoteCantidad() {
    if (!activeLote || !activeRefugioId || !loteCantidad.trim()) return
    setSavingLote(true)
    try {
      await fetch(`/api/refugios/${activeRefugioId}/lotes/${activeLote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad_actual: parseInt(loteCantidad) }),
      })
      await load()
      setLoteCantidad("")
    } finally { setSavingLote(false) }
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" onClick={() => router.push("/dashboard/reproduccion")}
            style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}>
            Reproducción
          </button>
          <ChevronRight size={13} color="#9a958f" />
          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d", fontWeight: 500 }}>{pairLabel}</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <select defaultValue={cruza.estado}
            onChange={async e => {
              if (!activeRefugioId) return
              await fetch(`/api/refugios/${activeRefugioId}/cruzas/${cruza_id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: e.target.value })
              })
              await load()
            }}
            style={{ height: 34, padding: "0 12px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", outline: "none", appearance: "none", cursor: "pointer" }}>
            {Object.entries(ESTADO_META).map(([val, m]) => <option key={val} value={val}>{m.label}</option>)}
          </select>
          <button type="button" onClick={() => setPuestaModalOpen(true)}
            className="flex items-center gap-1.5"
            style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
            <Plus size={14} />Registrar puesta
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 12, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Cruza header card */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>{pairLabel}</div>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: estado.color, backgroundColor: estado.bg, borderRadius: 999, padding: "3px 8px" }}>{estado.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 32, fontWeight: 500, color: riesgo.color, lineHeight: 1 }}>{cruza.coeficiente_consanguinidad.toFixed(2)}</div>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 4 }}>coeficiente</div>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: riesgo.color, backgroundColor: riesgo.bg, borderRadius: 999, padding: "2px 8px", display: "inline-block", marginTop: 4 }}>Riesgo {riesgo.label.toLowerCase()}</span>
              </div>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "0 0 16px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <DataRow label="HEMBRA" value={cruza.hembra?.codigo ?? "—"} />
              <DataRow label="MACHO"  value={cruza.macho?.codigo ?? "—"} />
              <DataRow label="ESTANQUE" value={cruza.estanques?.nombre ?? "—"} />
              <DataRow label="INICIO" value={formatFecha(cruza.fecha_inicio ?? cruza.fecha_planeada)} />
              <DataRow label="PUESTAS" value={String(cruza.puestas.length)} />
              {activeLote && <DataRow label="LARVAS VIVAS" value={String(activeLote.cantidad_actual)} />}
            </div>

            {cruza.notas && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #e5e2dc" }}>
                <DataRow label="NOTAS" value={cruza.notas} />
              </div>
            )}
          </div>

          {/* Mini genealogy */}
          {cruza.hembra && cruza.macho && (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Árbol genealógico de los reproductores</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link href={`/dashboard/inventario/${cruza.hembra.id}/arbol`}
                    style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none" }}>
                    Ver completo →
                  </Link>
                </div>
              </div>

              <MiniGenealogy hembra={cruza.hembra} macho={cruza.macho} />

              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "#15803d" }}>✓</span>
                </div>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#15803d" }}>
                  {cruza.coeficiente_consanguinidad === 0
                    ? "No se detectaron ancestros comunes en las últimas 8 generaciones."
                    : `Coeficiente de consanguinidad: ${cruza.coeficiente_consanguinidad.toFixed(4)}`}
                </span>
              </div>
            </div>
          )}

          {/* Puestas */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
              <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Puestas registradas</h3>
              <button type="button" onClick={() => setPuestaModalOpen(true)}
                style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                ＋ Registrar puesta
              </button>
            </div>

            {cruza.puestas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, color: "#0d0d0d", margin: "0 0 6px 0" }}>Sin puestas registradas aún</p>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: "0 0 16px 0" }}>Registra la primera puesta cuando ocurra</p>
                <button type="button" onClick={() => setPuestaModalOpen(true)}
                  style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", cursor: "pointer" }}>
                  ＋ Registrar puesta
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cruza.puestas.map((p, idx) => {
                  const sv = p.cantidad_huevos && p.cantidad_eclosionada ? (p.cantidad_eclosionada / p.cantidad_huevos) * 100 : null
                  return (
                    <div key={p.id} style={{ backgroundColor: "#f9f9f7", borderRadius: 8, padding: 14, border: "0.5px solid #e5e2dc" }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>Puesta #{idx + 1}</span>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#9a958f" }}>{formatFecha(p.fecha_puesta)}</span>
                      </div>

                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        {p.cantidad_huevos !== null && (
                          <div>
                            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>{p.cantidad_huevos.toLocaleString()}</div>
                            <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>huevos</div>
                          </div>
                        )}
                        {p.cantidad_eclosionada !== null && (
                          <div>
                            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>{p.cantidad_eclosionada.toLocaleString()}</div>
                            <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>larvas vivas</div>
                          </div>
                        )}
                        {sv !== null && (
                          <div>
                            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#15803d" }}>{sv.toFixed(1)}%</div>
                            <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>supervivencia</div>
                          </div>
                        )}
                      </div>

                      {sv !== null && (
                        <div style={{ marginTop: 10, height: 4, backgroundColor: "#e5e2dc", borderRadius: 2 }}>
                          <div style={{ width: `${Math.min(sv, 100)}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
                        </div>
                      )}

                      {p.lote && (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 999, padding: "2px 8px" }}>
                            {ETAPA_LABELS[p.lote.etapa] ?? p.lote.etapa}
                          </span>
                          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", cursor: "pointer" }}>
                            Ver lote larval →
                          </span>
                        </div>
                      )}

                      {p.notas && (
                        <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 8, marginBottom: 0 }}>{p.notas}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d", margin: "0 0 16px 0" }}>Línea de tiempo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Cruza planeada", date: cruza.fecha_planeada ?? cruza.created_at, active: true },
                ...(cruza.fecha_inicio ? [{ label: "Cruza activa", date: cruza.fecha_inicio, active: cruza.estado !== "planeada" }] : []),
                ...cruza.puestas.map((p, i) => ({ label: `Puesta #${i + 1} registrada`, date: p.fecha_puesta, active: true })),
                ...cruza.puestas.flatMap(p => p.lote ? [{ label: `Lote ${p.lote.codigo} creado`, date: p.lote.fecha_inicio, active: true }] : []),
              ].map((ev, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 12, position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ev.active ? "#1a6560" : "#e5e2dc", border: "2px solid", borderColor: ev.active ? "#1a6560" : "#e5e2dc", marginTop: 4, flexShrink: 0 }} />
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, backgroundColor: "#e5e2dc", minHeight: 20 }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{ev.label}</div>
                    <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f", marginTop: 2 }}>{formatFecha(ev.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Lote larval activo */}
          {activeLote ? (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <div style={{ borderBottom: "0.5px solid #e5e2dc", paddingBottom: 12, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#1a6560", margin: "0 0 4px 0" }}>
                  Lote larval · {activeLote.codigo}
                </h3>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 999, padding: "2px 8px" }}>
                  {ETAPA_LABELS[activeLote.etapa] ?? activeLote.etapa}
                </span>
              </div>

              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 36, fontWeight: 500, color: "#0d0d0d", lineHeight: 1 }}>
                  {activeLote.cantidad_actual.toLocaleString()}
                </div>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", marginTop: 4 }}>larvas actuales</div>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2 }}>
                  de {activeLote.cantidad_inicial.toLocaleString()} iniciales
                </div>
              </div>

              <div style={{ height: 4, backgroundColor: "#e5e2dc", borderRadius: 2, marginBottom: 16 }}>
                <div style={{ width: `${Math.min((activeLote.cantidad_actual / activeLote.cantidad_inicial) * 100, 100)}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
              </div>

              <div style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 12, marginBottom: 12 }}>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#0d0d0d", margin: "0 0 8px 0" }}>Actualizar cantidad</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={loteCantidad} onChange={e => setLoteCantidad(e.target.value)}
                    placeholder={String(activeLote.cantidad_actual)}
                    min={0}
                    style={{ flex: 1, height: 34, borderRadius: 8, border: "0.5px solid #e5e2dc", padding: "0 10px", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d", outline: "none" }} />
                  <button type="button" onClick={saveLoteCantidad} disabled={savingLote || !loteCantidad}
                    style={{ height: 34, padding: "0 12px", borderRadius: 8, border: "none", backgroundColor: loteCantidad ? "#1a6560" : "#e5e2dc", color: loteCantidad ? "#f9f9f7" : "#9a958f", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: loteCantidad ? "pointer" : "default" }}>
                    {savingLote ? "..." : "Guardar"}
                  </button>
                </div>
              </div>

              {activeLote.etapa === "juvenil" && (
                <button type="button"
                  style={{ width: "100%", height: 36, borderRadius: 8, border: "none", backgroundColor: "#e2f0ee", color: "#1a6560", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  Promover a individuos →
                </button>
              )}
            </div>
          ) : (
            <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
              <h3 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d", margin: "0 0 8px 0" }}>Lote larval</h3>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0, lineHeight: 1.5 }}>
                El lote larval se creará automáticamente al registrar la eclosión de una puesta.
              </p>
            </div>
          )}

          {/* Axo AI card */}
          <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 16 }}>
            <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
              <Sparkles size={14} color="#1a6560" />
              <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#f9f9f7" }}>Axo AI · Análisis de esta cruza</span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", lineHeight: 1.5, margin: "0 0 12px 0" }}>
              {pairLabel} tiene un coeficiente de {cruza.coeficiente_consanguinidad.toFixed(2)}.
              {survPct !== null ? ` La tasa de supervivencia larval (${survPct.toFixed(1)}%) está dentro del rango esperado para esta especie.` : " Registra puestas para obtener análisis de supervivencia."}
            </p>
            <Link href="/dashboard/reproduccion/optimas"
              style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
              Ver cruzas óptimas →
            </Link>
          </div>
        </div>
      </div>

      {activeRefugioId && (
        <PuestaModal
          open={puestaModalOpen}
          onClose={() => setPuestaModalOpen(false)}
          refugioId={activeRefugioId}
          cruzaId={cruza.id}
          cruzaLabel={pairLabel}
          onSuccess={load}
        />
      )}
    </div>
  )
}
