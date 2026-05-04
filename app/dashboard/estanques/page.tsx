"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Grid2X2, List, Layers, MoreHorizontal, Fish } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { EstanqueModal } from "@/components/estanques/estanque-modal"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medicion {
  fecha_hora: string
  temperatura: number | null
  ph: number | null
  amonio: number | null
  nitrito: number | null
  oxigeno: number | null
}

interface Estanque {
  id: string
  refugio_id: string
  nombre: string
  capacidad_litros: number | null
  tipo_sistema: string | null
  ubicacion_fisica: string | null
  notas: string | null
  activo: boolean
  ajolotes_vivos: number
  ultima_medicion: Medicion | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function estanqueOverallStatus(m: Medicion | null): "ok" | "warning" | "critical" {
  if (!m) return "ok"
  const statuses = ["temperatura", "ph", "amonio", "nitrito", "oxigeno"].map(k =>
    paramStatus(k, (m as unknown as Record<string, number | null>)[k] as number | null)
  )
  if (statuses.includes("critical")) return "critical"
  if (statuses.includes("warning")) return "warning"
  return "ok"
}

function statusBadge(s: "ok" | "warning" | "critical") {
  if (s === "critical") return { label: "Crítico", bg: "#fef2f2", text: "#991b1b" }
  if (s === "warning") return { label: "Con alerta", bg: "#fffbeb", text: "#92400e" }
  return { label: "En rango", bg: "#f0fdf4", text: "#15803d" }
}

function statusDotColor(s: "ok" | "warning" | "critical") {
  if (s === "critical") return "#dc2626"
  if (s === "warning") return "#d97706"
  return "#1a6560"
}

function barColor(s: "ok" | "warning" | "critical") {
  if (s === "critical") return "#dc2626"
  if (s === "warning") return "#d97706"
  return "#1a6560"
}

function paramFill(key: string, val: number | null): number {
  if (val === null) return 0
  switch (key) {
    case "temperatura": return Math.min(Math.max((val - 10) / 15, 0), 1)
    case "ph": return Math.min(Math.max((val - 5.5) / 3.5, 0), 1)
    case "amonio": return Math.min(Math.max(val / 1.0, 0), 1)
    case "nitrito": return Math.min(Math.max(val / 0.5, 0), 1)
    case "oxigeno": return Math.min(Math.max(val / 10, 0), 1)
    default: return 0
  }
}

function formatVal(key: string, val: number | null): string {
  if (val === null) return "—"
  switch (key) {
    case "temperatura": return `${val.toFixed(1)}°C`
    case "ph": return val.toFixed(1)
    case "amonio": return `${val.toFixed(2)} mg/L`
    case "nitrito": return `${val.toFixed(2)} mg/L`
    case "oxigeno": return `${val.toFixed(1)} mg/L`
    default: return String(val)
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const PARAMS = [
  { key: "temperatura", label: "Temperatura" },
  { key: "ph", label: "pH" },
  { key: "amonio", label: "Amonio" },
  { key: "nitrito", label: "Nitrito" },
  { key: "oxigeno", label: "Oxígeno" },
]

const TIPO_LABELS: Record<string, string> = {
  recirculacion: "Recirculación",
  estatico: "Estático",
  mixto: "Mixto",
}

// ── Parameter Row ─────────────────────────────────────────────────────────────

function ParamRow({ pkey, label, val }: { pkey: string; label: string; val: number | null }) {
  const status = paramStatus(pkey, val)
  const fill = paramFill(pkey, val)
  const color = barColor(status)
  const valueColor = status === "ok" ? "#0d0d0d" : status === "warning" ? "#92400e" : "#991b1b"

  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        fontSize: 11, color: "#9a958f",
        width: 80, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: "#e5e2dc", overflow: "hidden" }}>
        <div style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
      </div>
      <span style={{
        fontFamily: "var(--font-dm-mono), DM Mono, monospace",
        fontSize: 11, fontWeight: 500,
        width: 52, textAlign: "right", flexShrink: 0,
        color: valueColor,
      }}>
        {formatVal(pkey, val)}
      </span>
    </div>
  )
}

// ── Estanque Card ─────────────────────────────────────────────────────────────

function EstanqueCard({ estanque, onClick }: { estanque: Estanque; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const status = estanqueOverallStatus(estanque.ultima_medicion)
  const badge = statusBadge(status)
  const dotColor = statusDotColor(status)
  const tipo = estanque.tipo_sistema ? TIPO_LABELS[estanque.tipo_sistema] ?? estanque.tipo_sistema : null
  const subtitle = [tipo, estanque.capacidad_litros ? `${estanque.capacidad_litros}L` : null].filter(Boolean).join(" · ")

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        border: `0.5px solid ${hovered ? "#1a6560" : "#e5e2dc"}`,
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 150ms",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px 12px" }} className="flex items-start justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 14, fontWeight: 500, color: "#0d0d0d" }}>
            {estanque.nombre}
          </div>
          <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2 }}>
            {subtitle || "Sin configurar"}
          </div>
        </div>
        <span style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 10, fontWeight: 500,
          borderRadius: 6, padding: "2px 8px", flexShrink: 0,
          backgroundColor: badge.bg, color: badge.text,
        }}>
          {badge.label}
        </span>
      </div>

      <div style={{ borderTop: "0.5px solid #e5e2dc" }} />

      {/* Parameters */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {PARAMS.map(p => (
          <ParamRow
            key={p.key}
            pkey={p.key}
            label={p.label}
            val={estanque.ultima_medicion ? (estanque.ultima_medicion as unknown as Record<string, number | null>)[p.key] as number | null : null}
          />
        ))}
      </div>

      <div style={{ borderTop: "0.5px solid #e5e2dc" }} />

      {/* Footer */}
      <div style={{ padding: "10px 16px" }} className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
            {estanque.ultima_medicion
              ? `Última medición ${relativeTime(estanque.ultima_medicion.fecha_hora)}`
              : "Sin mediciones registradas"}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div className="flex items-center" style={{ gap: 4 }}>
            <Fish size={12} color="#9a958f" />
            <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f" }}>
              {estanque.ajolotes_vivos} individuos
            </span>
          </div>
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
          >
            <MoreHorizontal size={16} color="#9a958f" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card Skeleton ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px" }} className="flex items-start justify-between">
        <div><Skeleton style={{ width: 120, height: 14 }} /><Skeleton style={{ width: 80, height: 10, marginTop: 6 }} /></div>
        <Skeleton style={{ width: 60, height: 18, borderRadius: 6 }} />
      </div>
      <div style={{ borderTop: "0.5px solid #e5e2dc" }} />
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} className="flex items-center" style={{ gap: 6 }}>
            <Skeleton style={{ width: 80, height: 10 }} />
            <Skeleton style={{ flex: 1, height: 3 }} />
            <Skeleton style={{ width: 52, height: 10 }} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: "0.5px solid #e5e2dc" }} />
      <div style={{ padding: "10px 16px" }} className="flex items-center justify-between">
        <Skeleton style={{ width: 160, height: 10 }} />
        <Skeleton style={{ width: 60, height: 10 }} />
      </div>
    </div>
  )
}

// ── Filter Chip ───────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        fontSize: 11, fontWeight: active ? 500 : 400,
        borderRadius: 6, padding: "4px 12px",
        border: active ? "none" : "0.5px solid #e5e2dc",
        backgroundColor: active ? "#1a6560" : "#ffffff",
        color: active ? "#f9f9f7" : "#3c3a36",
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {label}
    </button>
  )
}

// ── View Toggle Button ────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 6, lineHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: active ? "0.5px solid #e5e2dc" : "none",
        backgroundColor: active ? "#ffffff" : "transparent",
        color: active ? "#0d0d0d" : "#9a958f",
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {children}
    </button>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: "80px 0" }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f3f2ef", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Layers size={28} color="#e5e2dc" />
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 15, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
        Sin estanques registrados
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginBottom: 20 }}>
        Agrega el primer estanque de tu refugio.
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1.5"
        style={{
          height: 36, padding: "0 14px", borderRadius: 8, border: "none",
          backgroundColor: "#1a6560", color: "#f9f9f7",
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
        }}
      >
        <Plus size={14} />
        Agregar estanque
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterType = "todos" | "en_rango" | "con_alerta"

export default function EstanquesPage() {
  const router = useRouter()
  const { activeRefugioId } = useRefugio()
  const [estanques, setEstanques] = useState<Estanque[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("todos")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/estanques`)
      if (res.ok) {
        const { data } = await res.json()
        setEstanques((data ?? []).filter((e: Estanque) => e.activo !== false))
      }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = estanques
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.nombre.toLowerCase().includes(q) || e.ubicacion_fisica?.toLowerCase().includes(q))
    }
    if (filter === "en_rango") list = list.filter(e => estanqueOverallStatus(e.ultima_medicion) === "ok")
    if (filter === "con_alerta") list = list.filter(e => {
      const s = estanqueOverallStatus(e.ultima_medicion)
      return s === "warning" || s === "critical"
    })
    return list
  }, [estanques, search, filter])

  const alertCount = estanques.filter(e => {
    const s = estanqueOverallStatus(e.ultima_medicion)
    return s === "warning" || s === "critical"
  }).length

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Estanques</h1>
        <div className="flex items-center" style={{ gap: 8 }}>
          {!loading && (
            <span style={{ fontSize: 12, color: "#9a958f" }}>
              {estanques.length} {estanques.length === 1 ? "estanque" : "estanques"}
            </span>
          )}
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
            Nuevo estanque
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          {/* Search */}
          <div className="flex items-center" style={{
            width: 240, height: 36, borderRadius: 8,
            backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
            padding: "0 10px", gap: 6,
          }}>
            <Search size={14} color="#9a958f" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar estanque..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 12, color: "#0d0d0d",
              }}
            />
          </div>

          {/* Chips */}
          <div className="flex items-center" style={{ gap: 6 }}>
            <FilterChip label="Todos" active={filter === "todos"} onClick={() => setFilter("todos")} />
            <FilterChip label="En rango" active={filter === "en_rango"} onClick={() => setFilter("en_rango")} />
            <FilterChip
              label={alertCount > 0 ? `Con alerta (${alertCount})` : "Con alerta"}
              active={filter === "con_alerta"}
              onClick={() => setFilter("con_alerta")}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center" style={{ gap: 4 }}>
          <ViewBtn active={view === "grid"} onClick={() => setView("grid")}><Grid2X2 size={15} /></ViewBtn>
          <ViewBtn active={view === "list"} onClick={() => setView("list")}><List size={15} /></ViewBtn>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 12 }}>
          {[0,1,2].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : estanques.length === 0 ? (
        <EmptyState onNew={() => setModalOpen(true)} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center" style={{ padding: "60px 0" }}>
          <div style={{ fontSize: 14, color: "#9a958f" }}>Sin resultados para esta búsqueda.</div>
        </div>
      ) : (
        <div
          className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col"}
          style={{ gap: 12 }}
        >
          {filtered.map(e => (
            <EstanqueCard
              key={e.id}
              estanque={e}
              onClick={() => router.push(`/dashboard/estanques/${e.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {activeRefugioId && (
        <EstanqueModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          refugioId={activeRefugioId}
          onSuccess={() => load()}
        />
      )}
    </div>
  )
}
