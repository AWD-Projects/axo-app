"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Search, ChevronDown, MoreHorizontal, Layers } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { AjoloteModal } from "@/components/inventario/ajolote-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ajolote {
  id: string
  codigo: string
  nombre: string | null
  sexo: "macho" | "hembra" | "indeterminado" | null
  estado: "vivo" | "fallecido" | "transferido" | "egresado"
  morfotipo: string | null
  fecha_nacimiento: string | null
  fecha_ingreso: string | null
  origen: string | null
  madre: { id: string; codigo: string } | null
  padre: { id: string; codigo: string } | null
  estanques: { id: string; nombre: string } | null
}

interface LoteLarval {
  id: string
  codigo: string
  etapa: "huevo" | "larva_temprana" | "larva_avanzada" | "juvenil"
  cantidad_inicial: number
  cantidad_actual: number
  fecha_inicio: string
  estanques: { id: string; nombre: string } | null
  cruzas: { id: string; estado: string } | null
}

type Tab = "ajolotes" | "lotes"

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dateStr: string | null): string {
  if (!dateStr) return "—"
  const birth = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return "<1m"
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}m`
  if (rem === 0) return `${years}a`
  return `${years}a ${rem}m`
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr))
}

const MORFOTIPO_LABELS: Record<string, string> = {
  normal: "Normal", leucistico: "Leucístico", albino: "Albino",
  melanico: "Melánico", golden: "Dorado", axanthic: "Axántico",
}

const ETAPA_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  huevo: { label: "Huevo", bg: "#eff6ff", text: "#1e3a8a" },
  larva_temprana: { label: "Larva T.", bg: "#fffbeb", text: "#92400e" },
  larva_avanzada: { label: "Larva A.", bg: "#e2f0ee", text: "#1a6560" },
  juvenil: { label: "Juvenil", bg: "#f0fdf4", text: "#15803d" },
}

const ESTADO_PILL: Record<string, { label: string; bg: string; text: string }> = {
  vivo: { label: "Vivo", bg: "#f0fdf4", text: "#15803d" },
  fallecido: { label: "Fallecido", bg: "#fef2f2", text: "#991b1b" },
  transferido: { label: "Transferido", bg: "#f3f2ef", text: "#9a958f" },
  egresado: { label: "Egresado", bg: "#f3f2ef", text: "#9a958f" },
}

const SEX_DOT: Record<string, string> = {
  macho: "#1e3a8a", hembra: "#991b1b", indeterminado: "#9a958f",
}

const SEX_LABEL: Record<string, string> = {
  macho: "Macho", hembra: "Hembra", indeterminado: "S/D",
}

const PAGE_SIZE = 10

// ── Sub-tab button ────────────────────────────────────────────────────────────

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
      fontSize: 12, fontWeight: active ? 500 : 400,
      borderRadius: 6, padding: "5px 14px",
      border: active ? "none" : "0.5px solid #e5e2dc",
      backgroundColor: active ? "#1a6560" : "#ffffff",
      color: active ? "#f9f9f7" : "#3c3a36",
      cursor: "pointer", transition: "all 150ms",
    }}>
      {label}
    </button>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]
  value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        height: 36, borderRadius: 8, backgroundColor: "#ffffff",
        border: "0.5px solid #e5e2dc", padding: "0 32px 0 12px",
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        fontSize: 12, color: "#3c3a36", cursor: "pointer",
        appearance: "none", outline: "none",
      }}>
        <option value="">{label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} color="#9a958f" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>
        {value}
      </span>
      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
        {label}
      </span>
    </div>
  )
}

function StatDivider() {
  return <div style={{ width: 1, height: 16, backgroundColor: "#e5e2dc", flexShrink: 0 }} />
}

// ── Row expanded panel ────────────────────────────────────────────────────────

function ExpandedRow({ ajolote }: { ajolote: Ajolote }) {
  const router = useRouter()
  return (
    <div style={{ padding: "12px 16px 12px 48px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
      <div className="grid grid-cols-3" style={{ gap: 24 }}>
        {/* Linaje */}
        <div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Linaje
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { role: "Madre:", parent: ajolote.madre },
              { role: "Padre:", parent: ajolote.padre },
            ].map(({ role, parent }) => (
              <div key={role} className="flex items-center" style={{ gap: 6 }}>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>{role}</span>
                {parent ? (
                  <button type="button" onClick={() => router.push(`/dashboard/inventario/${parent.id}`)}
                    style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {parent.codigo}
                  </button>
                ) : (
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>Desconocido</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Datos
          </div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#3c3a36" }}>
            {ajolote.fecha_nacimiento && `Nacimiento: ${formatDate(ajolote.fecha_nacimiento)}`}
            {ajolote.fecha_nacimiento && <br />}
            {ajolote.origen && `Origen: ${ajolote.origen.replace(/_/g, " ")}`}
          </div>
        </div>

        {/* Acciones */}
        <div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Acciones rápidas
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            {[
              { label: "Ver detalle", href: `/dashboard/inventario/${ajolote.id}` },
              { label: "Ver árbol genealógico", href: `/dashboard/inventario/${ajolote.id}/arbol` },
            ].map(({ label, href }) => (
              <button key={label} type="button" onClick={() => router.push(href)}
                style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                {label} →
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lote card ─────────────────────────────────────────────────────────────────

function LoteCard({ lote }: { lote: LoteLarval }) {
  const [hovered, setHovered] = useState(false)
  const etapa = ETAPA_LABELS[lote.etapa] ?? { label: lote.etapa, bg: "#f3f2ef", text: "#3c3a36" }
  const pct = lote.cantidad_inicial > 0 ? (lote.cantidad_actual / lote.cantidad_inicial) * 100 : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        border: `0.5px solid ${hovered ? "#1a6560" : "#e5e2dc"}`,
        borderRadius: 10, padding: 16, cursor: "pointer",
        transition: "border-color 150ms",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#1a6560" }}>
          {lote.codigo}
        </span>
        <span style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 10, fontWeight: 500, borderRadius: 999,
          padding: "3px 8px", backgroundColor: etapa.bg, color: etapa.text,
        }}>
          {etapa.label}
        </span>
      </div>

      <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "10px 0" }} />

      {/* Count */}
      <div className="flex items-end justify-between" style={{ marginTop: 10 }}>
        <div>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 32, fontWeight: 500, color: "#0d0d0d", lineHeight: 1 }}>
            {lote.cantidad_actual.toLocaleString("es-MX")}
          </div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 4 }}>
            larvas actuales
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
            de {lote.cantidad_inicial.toLocaleString("es-MX")} iniciales
          </div>
          <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 14, fontWeight: 500, color: "#15803d", marginTop: 2 }}>
            {pct.toFixed(1)}%
          </div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#9a958f" }}>
            supervivencia
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: "0.5px solid #e5e2dc", marginTop: 12, paddingTop: 10 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 4 }}>
            <Layers size={12} color="#9a958f" />
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
              {lote.estanques?.nombre ?? "Sin estanque"}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>
            Desde {formatDate(lote.fecha_inicio)}
          </span>
        </div>
        {lote.etapa === "juvenil" && (
          <button type="button" className="w-full text-center" style={{
            marginTop: 10, padding: "5px 12px", borderRadius: 6,
            backgroundColor: "#e2f0ee", border: "none", cursor: "pointer",
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 12, fontWeight: 500, color: "#1a6560", width: "100%",
          }}>
            Promover a individuos →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventarioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeRefugioId, activeRefugio } = useRefugio()

  const [tab, setTab] = useState<Tab>("ajolotes")
  const [ajolotes, setAjolotes] = useState<Ajolote[]>([])
  const [lotes, setLotes] = useState<LoteLarval[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState("")
  const [filterSexo, setFilterSexo] = useState("")
  const [filterEstanque, setFilterEstanque] = useState(searchParams.get("estanque") ?? "")

  // Build unique estanques list from ajolotes
  const estanquesFilter = useMemo(() => {
    const map = new Map<string, string>()
    ajolotes.forEach(a => { if (a.estanques) map.set(a.estanques.id, a.estanques.nombre) })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [ajolotes])

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const [ajRes, lotesRes] = await Promise.all([
        fetch(`/api/refugios/${activeRefugioId}/ajolotes`),
        fetch(`/api/refugios/${activeRefugioId}/lotes`),
      ])
      if (ajRes.ok) { const { data } = await ajRes.json(); setAjolotes(data ?? []) }
      if (lotesRes.ok) { const { data } = await lotesRes.json(); setLotes(data ?? []) }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = ajolotes
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.codigo.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q))
    }
    if (filterEstado) list = list.filter(a => a.estado === filterEstado)
    if (filterSexo) list = list.filter(a => a.sexo === filterSexo)
    if (filterEstanque) list = list.filter(a => a.estanques?.id === filterEstanque)
    return list
  }, [ajolotes, search, filterEstado, filterSexo, filterEstanque])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilters = !!(search || filterEstado || filterSexo || filterEstanque)

  const stats = useMemo(() => ({
    vivos: ajolotes.filter(a => a.estado === "vivo").length,
    machos: ajolotes.filter(a => a.estado === "vivo" && a.sexo === "macho").length,
    hembras: ajolotes.filter(a => a.estado === "vivo" && a.sexo === "hembra").length,
    sd: ajolotes.filter(a => a.estado === "vivo" && (!a.sexo || a.sexo === "indeterminado")).length,
  }), [ajolotes])

  const loteStats = useMemo(() => ({
    activos: lotes.length,
    total: lotes.reduce((s, l) => s + l.cantidad_actual, 0),
    huevos: lotes.filter(l => l.etapa === "huevo").reduce((s, l) => s + l.cantidad_actual, 0),
    larvas: lotes.filter(l => l.etapa === "larva_temprana" || l.etapa === "larva_avanzada").reduce((s, l) => s + l.cantidad_actual, 0),
    juveniles: lotes.filter(l => l.etapa === "juvenil").reduce((s, l) => s + l.cantidad_actual, 0),
  }), [lotes])

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Inventario</h1>
        <div className="flex items-center" style={{ gap: 8 }}>
          <SubTab label="Ajolotes" active={tab === "ajolotes"} onClick={() => setTab("ajolotes")} />
          <SubTab label="Lotes larvales" active={tab === "lotes"} onClick={() => setTab("lotes")} />
          {tab === "ajolotes" && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5"
              style={{
                height: 34, padding: "0 14px", borderRadius: 8, border: "none",
                backgroundColor: "#1a6560", color: "#f9f9f7",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              }}
            >
              <Plus size={14} />
              Registrar ajolote
            </button>
          )}
        </div>
      </div>

      {/* ── AJOLOTES TAB ── */}
      {tab === "ajolotes" && (
        <>
          {/* Stats bar */}
          <div className="flex items-center" style={{ gap: 16, marginBottom: 16 }}>
            {loading ? (
              <>
                <Skeleton style={{ width: 80, height: 14 }} />
                <Skeleton style={{ width: 60, height: 14 }} />
                <Skeleton style={{ width: 60, height: 14 }} />
                <Skeleton style={{ width: 80, height: 14 }} />
              </>
            ) : (
              <>
                <StatItem value={stats.vivos} label="Individuos vivos" />
                <StatDivider />
                <StatItem value={stats.machos} label="Machos" />
                <StatDivider />
                <StatItem value={stats.hembras} label="Hembras" />
                <StatDivider />
                <StatItem value={stats.sd} label="Sin determinar" />
              </>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 14 }}>
            <div className="flex items-center" style={{ width: 220, height: 36, borderRadius: 8, backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", padding: "0 10px", gap: 6 }}>
              <Search size={14} color="#9a958f" style={{ flexShrink: 0 }} />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar por código o nombre..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d" }} />
            </div>
            <FilterDropdown label="Estado: Todos" value={filterEstado} onChange={v => { setFilterEstado(v); setPage(1) }}
              options={[{ value: "vivo", label: "Vivo" }, { value: "fallecido", label: "Fallecido" }, { value: "transferido", label: "Transferido" }, { value: "egresado", label: "Egresado" }]} />
            <FilterDropdown label="Sexo: Todos" value={filterSexo} onChange={v => { setFilterSexo(v); setPage(1) }}
              options={[{ value: "macho", label: "Macho" }, { value: "hembra", label: "Hembra" }, { value: "indeterminado", label: "Sin determinar" }]} />
            <FilterDropdown label="Estanque: Todos" value={filterEstanque} onChange={v => { setFilterEstanque(v); setPage(1) }}
              options={estanquesFilter} />
            {hasFilters && (
              <button type="button" onClick={() => { setSearch(""); setFilterEstado(""); setFilterSexo(""); setFilterEstanque(""); setPage(1) }}
                style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Limpiar
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div className="flex items-center" style={{ padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc", gap: 0 }}>
              {[
                { label: "CÓDIGO", w: 80 },
                { label: "NOMBRE", flex: 1 },
                { label: "SEXO", w: 90 },
                { label: "ESTANQUE", w: 130 },
                { label: "MORFOTIPO", w: 100 },
                { label: "EDAD", w: 80 },
                { label: "ESTADO", w: 100 },
                { label: "", w: 36 },
              ].map(({ label, w, flex }) => (
                <span key={label} style={{
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 10, fontWeight: 500, color: "#9a958f",
                  width: w, flex: flex ?? undefined, flexShrink: 0,
                }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center" style={{ padding: "12px 16px", borderBottom: "0.5px solid #edeae4", gap: 0 }}>
                  <Skeleton style={{ width: 60, height: 20, borderRadius: 4 }} />
                  <Skeleton style={{ flex: 1, height: 13, marginLeft: 20 }} />
                  <Skeleton style={{ width: 60, height: 13, marginLeft: 30 }} />
                  <Skeleton style={{ width: 90, height: 13, marginLeft: 40 }} />
                  <Skeleton style={{ width: 70, height: 18, borderRadius: 4, marginLeft: 30 }} />
                  <Skeleton style={{ width: 50, height: 13, marginLeft: 30 }} />
                  <Skeleton style={{ width: 60, height: 20, borderRadius: 999, marginLeft: 30 }} />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9a958f" }}>
                {hasFilters ? "Sin resultados para esta búsqueda." : "No hay ajolotes registrados."}
              </div>
            ) : (
              paginated.map((a, i) => {
                const isExpanded = expandedId === a.id
                const estado = ESTADO_PILL[a.estado] ?? ESTADO_PILL.vivo
                const sexoDot = a.sexo ? SEX_DOT[a.sexo] : "#9a958f"
                const sexoLabel = a.sexo ? SEX_LABEL[a.sexo] : "S/D"
                const morfLabel = a.morfotipo ? (MORFOTIPO_LABELS[a.morfotipo] ?? a.morfotipo) : "—"
                const age = calcAge(a.fecha_nacimiento)
                const isLast = i === paginated.length - 1

                return (
                  <div key={a.id}>
                    <div
                      onClick={() => toggleExpand(a.id)}
                      className="flex items-center"
                      style={{
                        padding: "12px 16px",
                        borderBottom: isExpanded || !isLast ? "0.5px solid #edeae4" : "none",
                        cursor: "pointer", gap: 0, transition: "background-color 100ms",
                        backgroundColor: isExpanded ? "#f9f9f7" : "#ffffff",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = "#f9f9f7" }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = "#ffffff" }}
                    >
                      {/* Código */}
                      <div style={{ width: 80, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#1a6560", backgroundColor: "#e2f0ee", borderRadius: 4, padding: "2px 6px" }}>
                          {a.codigo}
                        </span>
                      </div>
                      {/* Nombre */}
                      <span style={{ flex: 1, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#0d0d0d" }}>
                        {a.nombre ?? "—"}
                      </span>
                      {/* Sexo */}
                      <div className="flex items-center" style={{ gap: 5, width: 90, flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sexoDot, flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>{sexoLabel}</span>
                      </div>
                      {/* Estanque */}
                      <span style={{ width: 130, flexShrink: 0, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>
                        {a.estanques?.nombre ?? "—"}
                      </span>
                      {/* Morfotipo */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, backgroundColor: "#f3f2ef", color: "#3c3a36", borderRadius: 4, padding: "1px 6px" }}>
                          {morfLabel}
                        </span>
                      </div>
                      {/* Edad */}
                      <span style={{ width: 80, flexShrink: 0, fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#9a958f" }}>
                        {age}
                      </span>
                      {/* Estado */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, borderRadius: 999, padding: "2px 8px", backgroundColor: estado.bg, color: estado.text }}>
                          {estado.label}
                        </span>
                      </div>
                      {/* Actions */}
                      <button type="button" onClick={e => { e.stopPropagation(); router.push(`/dashboard/inventario/${a.id}`) }}
                        style={{ width: 36, flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
                        <MoreHorizontal size={16} color="#9a958f" />
                      </button>
                    </div>
                    {isExpanded && <ExpandedRow ajolote={a} />}
                  </div>
                )
              })
            )}

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between" style={{ padding: "12px 16px" }}>
                <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f" }}>
                  Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} individuos
                </span>
                <div className="flex items-center" style={{ gap: 4 }}>
                  <PageBtn label="← Anterior" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const n = i + 1
                    return (
                      <PageBtn key={n} label={String(n)} active={page === n} onClick={() => setPage(n)} />
                    )
                  })}
                  <PageBtn label="Siguiente →" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── LOTES TAB ── */}
      {tab === "lotes" && (
        <>
          {/* Stats bar */}
          <div className="flex items-center" style={{ gap: 16, marginBottom: 16 }}>
            {loading ? (
              <Skeleton style={{ width: 240, height: 14 }} />
            ) : (
              <>
                <StatItem value={loteStats.activos} label="Lotes activos" />
                <StatDivider />
                <StatItem value={loteStats.total.toLocaleString("es-MX")} label="Larvas totales" />
                <StatDivider />
                <StatItem value={loteStats.huevos.toLocaleString("es-MX")} label="Huevo" />
                <StatDivider />
                <StatItem value={loteStats.larvas.toLocaleString("es-MX")} label="Larva" />
                <StatDivider />
                <StatItem value={loteStats.juveniles.toLocaleString("es-MX")} label="Juvenil" />
              </>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 12 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16 }}>
                  <Skeleton style={{ width: 100, height: 13 }} />
                  <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "10px 0" }} />
                  <Skeleton style={{ width: 60, height: 32, marginBottom: 8 }} />
                  <Skeleton style={{ width: "100%", height: 4 }} />
                </div>
              ))}
            </div>
          ) : lotes.length === 0 ? (
            <div className="flex flex-col items-center" style={{ padding: "80px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f3f2ef", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Layers size={28} color="#e5e2dc" />
              </div>
              <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 15, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
                Sin lotes larvales activos
              </div>
              <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", textAlign: "center", maxWidth: 320, lineHeight: 1.5, marginBottom: 16 }}>
                Los lotes se crean automáticamente al registrar una puesta en el módulo de Reproducción.
              </div>
              <a href="/dashboard/reproduccion" style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#1a6560", textDecoration: "none" }}>
                Ir a Reproducción →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 12 }}>
              {lotes.map(l => <LoteCard key={l.id} lote={l} />)}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {activeRefugioId && (
        <AjoloteModal open={modalOpen} onClose={() => setModalOpen(false)} refugioId={activeRefugioId} refugioNombre={activeRefugio?.nombre ?? ""} onSuccess={load} />
      )}
    </div>
  )
}

// ── Pagination button ─────────────────────────────────────────────────────────

function PageBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        fontSize: 12, fontWeight: active ? 500 : 400,
        color: active ? "#1a6560" : disabled ? "#e5e2dc" : "#3c3a36",
        background: "none", border: "none",
        cursor: disabled ? "default" : "pointer", padding: "0 4px",
      }}>
      {label}
    </button>
  )
}
