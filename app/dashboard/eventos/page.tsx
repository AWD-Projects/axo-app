"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, MoreHorizontal, X, Thermometer, Activity, ArrowRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { EventoModal } from "@/components/eventos/evento-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Evento {
  id: string
  tipo: string
  sujeto_tipo: string
  ajolote_id: string | null
  estanque_id: string | null
  fecha: string
  detalles: Record<string, unknown>
  registrado_por_nombre: string | null
  ajolote_codigo: string | null
  estanque_nombre: string | null
}

type FiltroTipo = "todos" | "muerte" | "enfermedad" | "tratamiento" | "transferencia" | "ingreso" | "egreso"
type FiltroPeriodo = "7d" | "30d" | "90d"

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  muerte:               { label: "Muerte",        bg: "#fef2f2", color: "#991b1b", Icon: X },
  enfermedad:           { label: "Enfermedad",    bg: "#fff0f0", color: "#dc2626", Icon: Thermometer },
  tratamiento:          { label: "Tratamiento",   bg: "#fffbeb", color: "#92400e", Icon: Activity },
  transferencia_interna:{ label: "Transf. interna",bg: "#eff6ff",color: "#1e3a8a", Icon: ArrowRight },
  transferencia_externa:{ label: "Transf. externa",bg: "#f0f0ff",color: "#4338ca", Icon: ArrowRight },
  ingreso:              { label: "Ingreso",       bg: "#f0fdf4", color: "#15803d", Icon: ArrowDownCircle },
  egreso:               { label: "Egreso",        bg: "#f9f0ff", color: "#7c3aed", Icon: ArrowUpCircle },
  otro:                 { label: "Otro",          bg: "#f3f2ef", color: "#3c3a36", Icon: MoreHorizontal },
}

function tipoMeta(tipo: string) {
  return TIPO_META[tipo] ?? TIPO_META["otro"]
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hoy ${new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
  if (hrs < 48) return "ayer"
  const days = Math.floor(hrs / 24)
  if (days < 30) return `hace ${days} días`
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
}

const TIPO_CHIPS: { val: FiltroTipo; label: string; dot: string }[] = [
  { val: "todos",        label: "Todos",         dot: "" },
  { val: "muerte",       label: "Muerte",        dot: "#991b1b" },
  { val: "enfermedad",   label: "Enfermedad",    dot: "#dc2626" },
  { val: "tratamiento",  label: "Tratamiento",   dot: "#92400e" },
  { val: "transferencia",label: "Transferencia", dot: "#1e3a8a" },
  { val: "ingreso",      label: "Ingreso",       dot: "#15803d" },
  { val: "egreso",       label: "Egreso",        dot: "#7c3aed" },
]

const PAGE_SIZE = 10

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventosPage() {
  const router = useRouter()
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos")
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("30d")
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90
      const desde = new Date(); desde.setDate(desde.getDate() - dias)
      const res = await fetch(`/api/refugios/${activeRefugioId}/eventos?desde=${desde.toISOString()}&limit=200`)
      const { data } = await res.json()
      setEventos(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, periodo])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  useEffect(() => { setPage(1) }, [search, filtroTipo, periodo])

  const filtered = useMemo(() => {
    return eventos.filter(e => {
      if (filtroTipo !== "todos") {
        if (filtroTipo === "transferencia") {
          if (!e.tipo.startsWith("transferencia")) return false
        } else if (e.tipo !== filtroTipo) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const codigo = (e.ajolote_codigo ?? "").toLowerCase()
        const estanque = (e.estanque_nombre ?? "").toLowerCase()
        const tipo = e.tipo.toLowerCase()
        const desc = JSON.stringify(e.detalles).toLowerCase()
        if (!codigo.includes(q) && !estanque.includes(q) && !tipo.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [eventos, filtroTipo, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Stats
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const muertesMes = eventos.filter(e => e.tipo === "muerte" && new Date(e.fecha) >= inicioMes).length
  const tratamientos = eventos.filter(e => e.tipo === "tratamiento").length
  const ingresos = eventos.filter(e => e.tipo === "ingreso").length
  const egresos = eventos.filter(e => e.tipo === "egreso").length

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Eventos</h1>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5"
          style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
          <Plus size={14} />Registrar evento
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center" }}>
        {[
          { val: muertesMes, label: "Muertes este mes", color: "#991b1b" },
          { val: tratamientos, label: "Tratamientos", color: "#0d0d0d" },
          { val: ingresos, label: "Ingresos", color: "#0d0d0d" },
          { val: egresos, label: "Egresos", color: "#0d0d0d" },
          { val: eventos.length, label: "Total del período", color: "#0d0d0d" },
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
            placeholder="Buscar evento..."
            style={{ width: "100%", height: 34, borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "0 12px 0 30px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d", outline: "none" }} />
        </div>

        <div className="flex items-center" style={{ gap: 6, overflowX: "auto" }}>
          {TIPO_CHIPS.map(c => (
            <button key={c.val} type="button" onClick={() => setFiltroTipo(c.val)}
              className="flex items-center"
              style={{ gap: 5, height: 30, padding: "0 12px", borderRadius: 6, border: filtroTipo === c.val ? "none" : "0.5px solid #e5e2dc", backgroundColor: filtroTipo === c.val ? "#1a6560" : "#ffffff", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: filtroTipo === c.val ? "#f9f9f7" : "#3c3a36", transition: "all 150ms" }}>
              {c.dot && filtroTipo !== c.val && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.dot, flexShrink: 0 }} />}
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value as FiltroPeriodo)}
            style={{ height: 34, borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", padding: "0 10px", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d", outline: "none", appearance: "none", cursor: "pointer" }}>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 2fr 140px 120px 32px", minWidth: 700, padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
            {["TIPO", "SUJETO", "DESCRIPCIÓN", "REGISTRADO POR", "FECHA", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 2fr 140px 120px 32px", minWidth: 700, padding: "14px 16px", borderBottom: "0.5px solid #edeae4" }}>
                <Skeleton style={{ width: 100, height: 13 }} />
                <Skeleton style={{ width: 60, height: 13 }} />
                <Skeleton style={{ width: 180, height: 13 }} />
                <Skeleton style={{ width: 80, height: 13 }} />
                <Skeleton style={{ width: 70, height: 13 }} />
                <div />
              </div>
            ))
          ) : pageItems.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f" }}>
              {search || filtroTipo !== "todos" ? "Sin resultados para este filtro" : "No hay eventos en este período"}
            </div>
          ) : (
            pageItems.map((e, i) => {
              const meta = tipoMeta(e.tipo)
              const isLast = i === pageItems.length - 1
              const desc = (e.detalles?.descripcion ?? e.detalles?.causa_probable ?? e.detalles?.medicamento ?? e.detalles?.motivo ?? "") as string
              const sujeto = e.ajolote_codigo ?? e.estanque_nombre ?? "—"
              const esAjolote = !!e.ajolote_codigo

              return (
                <div key={e.id}
                  onClick={() => router.push(`/dashboard/eventos/${e.id}`)}
                  style={{ display: "grid", gridTemplateColumns: "160px 1fr 2fr 140px 120px 32px", minWidth: 700, padding: "14px 16px", borderBottom: isLast ? "none" : "0.5px solid #edeae4", backgroundColor: "#ffffff", cursor: "pointer", transition: "background-color 100ms" }}
                  onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#f9f9f7")}
                  onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "#ffffff")}>

                  {/* Tipo */}
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <meta.Icon size={13} color={meta.color} />
                    </div>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: meta.color }}>{meta.label}</span>
                  </div>

                  {/* Sujeto */}
                  <div className="flex items-center">
                    {esAjolote ? (
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 6px" }}>{sujeto}</span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{sujeto}</span>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="flex items-center" style={{ overflow: "hidden" }}>
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {desc ? String(desc).charAt(0).toUpperCase() + String(desc).slice(1) : "—"}
                    </span>
                  </div>

                  {/* Registrado por */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>{e.registrado_por_nombre ?? "—"}</span>
                  </div>

                  {/* Fecha */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>{relTime(e.fecha)}</span>
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

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "0.5px solid #e5e2dc" }}>
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} eventos
            </span>
            <div className="flex items-center" style={{ gap: 4 }}>
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "0.5px solid #e5e2dc", backgroundColor: page === 1 ? "#f9f9f7" : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: page === 1 ? "#c8c4be" : "#3c3a36", cursor: page === 1 ? "default" : "pointer" }}>
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                return (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    style={{ height: 28, minWidth: 28, padding: "0 8px", borderRadius: 6, border: page === p ? "none" : "0.5px solid #e5e2dc", backgroundColor: page === p ? "#1a6560" : "#ffffff", fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: page === p ? "#ffffff" : "#3c3a36", cursor: "pointer" }}>
                    {p}
                  </button>
                )
              })}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "0.5px solid #e5e2dc", backgroundColor: page === totalPages ? "#f9f9f7" : "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: page === totalPages ? "#c8c4be" : "#3c3a36", cursor: page === totalPages ? "default" : "pointer" }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {activeRefugioId && (
        <EventoModal open={modalOpen} onClose={() => setModalOpen(false)} refugioId={activeRefugioId} onSuccess={load} />
      )}
    </div>
  )
}
