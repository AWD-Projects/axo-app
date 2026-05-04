"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, MoreHorizontal, Sparkles } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { PlanearCruzaModal } from "@/components/reproduccion/planear-cruza-modal"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Puesta {
  id: string
  fecha_puesta: string
  cantidad_huevos: number | null
  cantidad_eclosionada: number | null
  lote_id: string | null
}

interface Cruza {
  id: string
  hembra_id: string
  macho_id: string
  estado: "planeada" | "activa" | "exitosa" | "fallida" | "cancelada"
  coeficiente_consanguinidad: number
  fecha_planeada: string | null
  fecha_inicio: string | null
  notas: string | null
  created_at: string
  hembra: { id: string; codigo: string; nombre: string | null } | null
  macho: { id: string; codigo: string; nombre: string | null } | null
  estanques: { id: string; nombre: string } | null
  puestas: Puesta[]
}

type FiltroEstado = "todas" | "planeada" | "activa" | "exitosa" | "fallida"
type Tab = "cruzas" | "puestas"

// ── Helpers ────────────────────────────────────────────────────────────────────

function riesgoInfo(coef: number) {
  if (coef > 0.25) return { label: "Alto", color: "#991b1b", bg: "#fef2f2" }
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

function formatFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })
}

function calcSupervivencia(puestas: Puesta[]): number | null {
  const huevos = puestas.reduce((s, p) => s + (p.cantidad_huevos ?? 0), 0)
  const eclos  = puestas.reduce((s, p) => s + (p.cantidad_eclosionada ?? 0), 0)
  if (huevos === 0) return null
  return (eclos / huevos) * 100
}

const STATUS_CHIPS: { val: FiltroEstado; label: string }[] = [
  { val: "todas",    label: "Todas"    },
  { val: "planeada", label: "Planeada" },
  { val: "activa",   label: "Activa"   },
  { val: "exitosa",  label: "Exitosa"  },
  { val: "fallida",  label: "Fallida"  },
]

const PAGE_SIZE = 10

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReproduccionPage() {
  const router = useRouter()
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [tab, setTab] = useState<Tab>("cruzas")
  const [cruzas, setCruzas] = useState<Cruza[]>([])
  const [loading, setLoading] = useState(true)
  const [planearOpen, setPlanearOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas")
  const [page, setPage] = useState(1)
  const [topOptimas, setTopOptimas] = useState<{ pair: string; coef: number; riesgo: string }[]>([])

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const [cruzasRes, optimasRes] = await Promise.all([
        fetch(`/api/refugios/${activeRefugioId}/cruzas`),
        fetch(`/api/refugios/${activeRefugioId}/cruzas/optimas`),
      ])
      const { data: cruzasData } = await cruzasRes.json()
      const { data: optimasData } = await optimasRes.json()
      setCruzas(cruzasData ?? [])
      const top3 = (optimasData?.combinaciones ?? []).slice(0, 3).map((c: { pair: string; coeficiente: number; riesgo: string }) => ({
        pair: c.pair,
        coef: c.coeficiente,
        riesgo: c.riesgo,
      }))
      setTopOptimas(top3)
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  useEffect(() => { setPage(1) }, [search, filtroEstado, tab])

  const filtered = useMemo(() => cruzas.filter(c => {
    if (filtroEstado !== "todas" && c.estado !== filtroEstado) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const h = (c.hembra?.codigo ?? "").toLowerCase()
      const m = (c.macho?.codigo ?? "").toLowerCase()
      if (!h.includes(q) && !m.includes(q)) return false
    }
    return true
  }), [cruzas, filtroEstado, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Stats
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const activas   = cruzas.filter(c => c.estado === "activa").length
  const esteMes   = cruzas.filter(c => new Date(c.created_at) >= inicioMes).length
  const allPuestas = cruzas.flatMap(c => c.puestas ?? [])
  const larvas     = allPuestas.reduce((s, p) => s + (p.cantidad_eclosionada ?? 0), 0)
  const totalH     = allPuestas.reduce((s, p) => s + (p.cantidad_huevos ?? 0), 0)
  const totalE     = allPuestas.reduce((s, p) => s + (p.cantidad_eclosionada ?? 0), 0)
  const supervAvg  = totalH > 0 ? Math.round((totalE / totalH) * 100) : 0
  const coefProm   = cruzas.length > 0
    ? (cruzas.reduce((s, c) => s + (c.coeficiente_consanguinidad ?? 0), 0) / cruzas.length).toFixed(2)
    : "0.00"

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
            Reproducción
          </h1>
          {/* Sub-tabs */}
          <div style={{ display: "flex", backgroundColor: "#f3f2ef", borderRadius: 7, padding: 3, gap: 2 }}>
            {(["cruzas", "puestas"] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ height: 28, padding: "0 14px", borderRadius: 5, border: "none", backgroundColor: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#0d0d0d" : "#9a958f", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: tab === t ? 500 : 400, cursor: "pointer", transition: "all 150ms", boxShadow: tab === t ? "0 0 0 0.5px #e5e2dc" : "none" }}>
                {t === "cruzas" ? "Cruzas" : "Puestas"}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setPlanearOpen(true)}
          className="flex items-center gap-1.5"
          style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
          <Plus size={14} />Planear cruza
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center" }}>
        {[
          { val: activas,          label: "Cruzas activas",  color: "#1e3a8a"  },
          { val: esteMes,          label: "Cruzas este mes", color: "#0d0d0d"  },
          { val: larvas,           label: "Larvas actuales", color: "#0d0d0d"  },
          { val: `${supervAvg}%`,  label: "Supervivencia",   color: "#15803d"  },
          { val: coefProm,         label: "Coef. promedio",  color: "#15803d"  },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center" style={{ flex: 1, gap: 2, padding: "0 16px", borderLeft: i > 0 ? "0.5px solid #e5e2dc" : "none" }}>
            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 18, fontWeight: 500, color: s.color }}>{s.val}</span>
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f", textAlign: "center" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", width: 220, flexShrink: 0 }}>
          <Search size={13} color="#9a958f" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cruza..."
            style={{ width: "100%", height: 34, borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "0 12px 0 30px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d", outline: "none" }} />
        </div>
        <div className="flex items-center" style={{ gap: 6, overflowX: "auto" }}>
          {STATUS_CHIPS.map(c => (
            <button key={c.val} type="button" onClick={() => setFiltroEstado(c.val)}
              style={{ height: 30, padding: "0 12px", borderRadius: 6, border: filtroEstado === c.val ? "none" : "0.5px solid #e5e2dc", backgroundColor: filtroEstado === c.val ? "#1a6560" : "#ffffff", cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: filtroEstado === c.val ? "#f9f9f7" : "#3c3a36", transition: "all 150ms", whiteSpace: "nowrap", flexShrink: 0 }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 120px 110px 120px 100px 90px 120px 32px", minWidth: 880, padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
            {["CRUZA", "COEFICIENTE", "ESTADO", "ESTANQUE", "INICIO", "PUESTAS", "SUPERVIVENCIA", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 120px 110px 120px 100px 90px 120px 32px", minWidth: 880, padding: "14px 16px", borderBottom: "0.5px solid #edeae4" }}>
                <Skeleton style={{ width: 100, height: 13 }} />
                <Skeleton style={{ width: 60, height: 13 }} />
                <Skeleton style={{ width: 60, height: 20, borderRadius: 999 }} />
                <Skeleton style={{ width: 60, height: 13 }} />
                <Skeleton style={{ width: 60, height: 13 }} />
                <Skeleton style={{ width: 40, height: 13 }} />
                <Skeleton style={{ width: 70, height: 13 }} />
                <div />
              </div>
            ))
          ) : pageItems.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, color: "#0d0d0d", margin: "0 0 6px 0" }}>
                {search || filtroEstado !== "todas" ? "Sin resultados para este filtro" : "No hay cruzas registradas"}
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0 }}>
                {!search && filtroEstado === "todas" && "Planea la primera cruza para comenzar"}
              </p>
            </div>
          ) : (
            pageItems.map((c, i) => {
              const isLast = i === pageItems.length - 1
              const riesgo = riesgoInfo(c.coeficiente_consanguinidad)
              const estado = ESTADO_META[c.estado] ?? ESTADO_META["cancelada"]
              const superv = calcSupervivencia(c.puestas ?? [])
              const isAlto = c.coeficiente_consanguinidad > 0.25

              return (
                <div key={c.id}
                  onClick={() => router.push(`/dashboard/reproduccion/${c.id}`)}
                  style={{ display: "grid", gridTemplateColumns: "160px 120px 110px 120px 100px 90px 120px 32px", minWidth: 880, padding: "14px 16px", borderBottom: isLast ? "none" : "0.5px solid #edeae4", backgroundColor: "#ffffff", cursor: "pointer", transition: "background-color 100ms", borderLeft: isAlto ? "2px solid #f59e0b" : "2px solid transparent" }}
                  onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#f9f9f7")}
                  onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "#ffffff")}>

                  {/* CRUZA */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500 }}>
                      <span style={{ color: "#1a6560" }}>{c.macho?.codigo ?? "?"}</span>
                      <span style={{ color: "#9a958f", margin: "0 4px" }}>×</span>
                      <span style={{ color: "#1a6560" }}>{c.hembra?.codigo ?? "?"}</span>
                    </span>
                  </div>

                  {/* COEFICIENTE */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: riesgo.color }}>{c.coeficiente_consanguinidad.toFixed(2)}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: riesgo.color, backgroundColor: riesgo.bg, borderRadius: 4, padding: "1px 5px", alignSelf: "flex-start" }}>{riesgo.label}</span>
                  </div>

                  {/* ESTADO */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: estado.color, backgroundColor: estado.bg, borderRadius: 999, padding: "3px 8px" }}>{estado.label}</span>
                  </div>

                  {/* ESTANQUE */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{c.estanques?.nombre ?? "—"}</span>
                  </div>

                  {/* INICIO */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>{formatFecha(c.fecha_inicio ?? c.fecha_planeada)}</span>
                  </div>

                  {/* PUESTAS */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#0d0d0d" }}>
                      {(c.puestas ?? []).length > 0 ? `${c.puestas.length} puesta${c.puestas.length !== 1 ? "s" : ""}` : "—"}
                    </span>
                  </div>

                  {/* SUPERVIVENCIA */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                    {superv !== null ? (
                      <>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#15803d" }}>{superv.toFixed(1)}%</span>
                        <div style={{ width: 60, height: 3, backgroundColor: "#e5e2dc", borderRadius: 2 }}>
                          <div style={{ width: `${Math.min(superv, 100)}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
                        </div>
                      </>
                    ) : (
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#9a958f" }}>—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center">
                    <MoreHorizontal size={16} color="#9a958f" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination footer */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "0.5px solid #e5e2dc" }}>
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} cruzas
            </span>
            <div className="flex items-center" style={{ gap: 4 }}>
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "0.5px solid #e5e2dc", backgroundColor: page === 1 ? "#f9f9f7" : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: page === 1 ? "#c8c4be" : "#3c3a36", cursor: page === 1 ? "default" : "pointer" }}>←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, k) => {
                const p = totalPages <= 5 ? k + 1 : page <= 3 ? k + 1 : page >= totalPages - 2 ? totalPages - 4 + k : page - 2 + k
                return (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    style={{ height: 28, minWidth: 28, padding: "0 8px", borderRadius: 6, border: page === p ? "none" : "0.5px solid #e5e2dc", backgroundColor: page === p ? "#1a6560" : "#ffffff", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: page === p ? "#ffffff" : "#3c3a36", cursor: "pointer" }}>{p}</button>
                )
              })}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "0.5px solid #e5e2dc", backgroundColor: page === totalPages ? "#f9f9f7" : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: page === totalPages ? "#c8c4be" : "#3c3a36", cursor: page === totalPages ? "default" : "pointer" }}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Axo AI card */}
      <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 16, marginTop: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="flex items-center" style={{ gap: 6 }}>
            <Sparkles size={14} color="#1a6560" />
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#f9f9f7" }}>Cruzas óptimas · Axo AI</span>
          </div>
          <Link href="/dashboard/reproduccion/optimas"
            style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
            Ver análisis completo →
          </Link>
        </div>
        {loading ? (
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0 }}>
            Calculando combinaciones…
          </p>
        ) : topOptimas.length === 0 ? (
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: 0, lineHeight: 1.5 }}>
            Registra machos y hembras en Inventario para que Axo AI genere recomendaciones de cruzas.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topOptimas.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#f9f9f7" }}>{r.pair}</span>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#4ade80" }}>{r.coef.toFixed(4)}</span>
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f" }}>
                    {r.riesgo === "bajo" ? "Riesgo bajo" : r.riesgo === "moderado" ? "Riesgo moderado" : "Riesgo alto"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeRefugioId && (
        <PlanearCruzaModal
          open={planearOpen}
          onClose={() => setPlanearOpen(false)}
          refugioId={activeRefugioId}
          onSuccess={load}
        />
      )}
    </div>
  )
}
