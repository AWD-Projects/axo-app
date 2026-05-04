"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Download, Plus, ArrowRight } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import GenerarReporteModal from "@/components/reportes/generar-reporte-modal"
import type { TipoReporte } from "@/components/reportes/generar-reporte-modal"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Reporte {
  id: string
  tipo: string
  periodo_inicio: string
  periodo_fin: string
  generado_at: string
  pdf_url: string | null
  pdf_storage_path: string | null
  generado_por_nombre: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  uma_trimestral: { bg: "#e2f0ee", text: "#1a6560", border: "#1a6560", label: "UMA trimestral" },
  inventario:     { bg: "#f0fdf4", text: "#15803d", border: "#15803d", label: "Inventario" },
  salud:          { bg: "#eff6ff", text: "#1e3a8a", border: "#1e3a8a", label: "Salud del agua" },
  reproduccion:   { bg: "#f9f0ff", text: "#7c3aed", border: "#7c3aed", label: "Reproductivo" },
  mortalidad:     { bg: "#fef2f2", text: "#991b1b", border: "#991b1b", label: "Mortalidad" },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getQuarterInfo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const q = Math.ceil(month / 3)
  const startM = (q - 1) * 3 + 1
  const endM = q * 3
  const endDate = new Date(year, endM, 0)
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000)
  const deadlineFormatted = endDate.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
  return {
    label: `Q${q} ${year}`,
    period: `1 ${MONTHS[startM - 1]} – ${endDate.getDate()} ${MONTHS[endM - 1]} ${year}`,
    daysRemaining,
    deadlineFormatted,
    prevLabel: q > 1 ? `Q${q - 1} ${year}` : `Q4 ${year - 1}`,
  }
}

function formatPeriod(inicio: string, fin: string): { top: string; sub: string } {
  const [startYear, startM] = inicio.split("-").map(Number)
  const [, endM] = fin.split("-").map(Number)
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const q = Math.ceil(startM / 3)
  const isFullQ = (startM - 1) % 3 === 0 && endM % 3 === 0
  if (isFullQ) {
    return {
      top: `Q${q} ${startYear}`,
      sub: `${MONTHS[startM - 1]}–${MONTHS[endM - 1]} ${startYear}`,
    }
  }
  return {
    top: `${MONTHS[startM - 1]}–${MONTHS[endM - 1]} ${startYear}`,
    sub: "",
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 180px 160px 140px 100px 1fr", padding: "14px 16px", borderBottom: "0.5px solid #edeae4", gap: 0, alignItems: "center" }}>
      {[60, 80, 100, 80, 60, 80].map((w, i) => (
        <div key={i} style={{ height: 12, width: w, backgroundColor: "#f3f2ef", borderRadius: 4 }} />
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const { activeRefugioId } = useRefugio()
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [periodoFilter, setPeriodoFilter] = useState("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState<TipoReporte | null>(null)

  function openModal(tipo?: TipoReporte) {
    setModalTipo(tipo ?? null)
    setModalOpen(true)
  }

  const quarter = getQuarterInfo()

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/reportes`)
      if (res.ok) {
        const { data } = await res.json()
        setReportes(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => { load() }, [load])

  const prevUmaReport = reportes.find(r => r.tipo === "uma_trimestral")

  const filtered = reportes.filter(r => {
    if (tipoFilter !== "todos" && r.tipo !== tipoFilter) return false
    if (periodoFilter !== "todos" && !r.periodo_inicio.startsWith(periodoFilter)) return false
    return true
  })

  const years = Array.from(new Set(reportes.map(r => r.periodo_inicio.slice(0, 4)))).sort().reverse()

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      <style>{`
        .report-row:hover { background-color: #f9f9f7 !important; }
        .link-action { text-decoration: none; }
        .link-action:hover { text-decoration: underline; }
      `}</style>

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>Reportes</h1>
        <button
          type="button"
          onClick={() => openModal()}
          style={{ height: 34, padding: "0 14px", borderRadius: 8, backgroundColor: "#1a6560", border: "none", color: "#f9f9f7", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#144f4b")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}
        >
          <Plus size={14} />
          Generar reporte
        </button>
      </div>

      {/* UMA Highlight Card */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderTop: "3px solid #1a6560", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch" }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#1a6560", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Reporte UMA Trimestral
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#0d0d0d", marginTop: 6 }}>
              {quarter.label} — Próximo reporte
            </div>
            <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#9a958f", marginTop: 4 }}>
              Período: {quarter.period}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#9a958f", marginBottom: 8 }}>
                Datos capturados para este trimestre
              </div>
              {[
                { label: "Mediciones registradas", value: "—" },
                { label: "Eventos del período", value: "—" },
                { label: "Inventario actualizado", value: "—" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < arr.length - 1 ? "0.5px solid #edeae4" : "none" }}>
                  <span style={{ fontSize: 12, color: "#3c3a36" }}>{row.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>{row.value}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, borderRadius: 9999, padding: "1px 6px", backgroundColor: "#f0fdf4", color: "#15803d" }}>ok</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", marginLeft: 40, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 40, fontWeight: 500, color: "#0d0d0d", lineHeight: 1 }}>
                {quarter.daysRemaining}
              </div>
              <div style={{ fontSize: 12, color: "#9a958f", marginTop: 4 }}>para el vencimiento</div>
              <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#9a958f", marginTop: 2 }}>
                {quarter.deadlineFormatted}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openModal("uma_trimestral")}
              style={{ padding: "10px 20px", borderRadius: 8, backgroundColor: "#1a6560", border: "none", color: "#f9f9f7", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#144f4b")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}
            >
              Generar reporte UMA <ArrowRight size={14} />
            </button>
            {prevUmaReport && (
              <button
                type="button"
                onClick={() => openModal("uma_trimestral")}
                style={{ fontSize: 12, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Ver reporte anterior {quarter.prevLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reportes generados */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d" }}>Reportes generados</div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontSize: 12, color: "#3c3a36", outline: "none", cursor: "pointer", appearance: "none" }}
          >
            <option value="todos">Tipo: Todos</option>
            <option value="uma_trimestral">UMA Trimestral</option>
            <option value="inventario">Inventario</option>
            <option value="salud">Salud</option>
            <option value="reproduccion">Reproducción</option>
            <option value="mortalidad">Mortalidad</option>
          </select>
          <select
            value={periodoFilter}
            onChange={e => setPeriodoFilter(e.target.value)}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontSize: 12, color: "#3c3a36", outline: "none", cursor: "pointer", appearance: "none" }}
          >
            <option value="todos">Período: Todos</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 180px 160px 140px 100px 1fr", padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
            {["TIPO", "PERÍODO", "GENERADO POR", "FECHA", "ESTADO", ""].map(col => (
              <div key={col} style={{ fontSize: 10, fontWeight: 500, color: "#9a958f", letterSpacing: "0.04em" }}>{col}</div>
            ))}
          </div>
          {[1, 2, 3].map(i => <RowSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 32px", backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10 }}>
          <FileText size={32} color="#e5e2dc" />
          <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginTop: 16 }}>Sin reportes generados</div>
          <div style={{ fontSize: 13, color: "#9a958f", marginTop: 6, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            Genera tu primer reporte UMA cuando tengas datos del trimestre completo.
          </div>
          <button
            type="button"
            onClick={() => openModal()}
            style={{ marginTop: 20, height: 34, padding: "0 16px", borderRadius: 8, backgroundColor: "#1a6560", border: "none", color: "#f9f9f7", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#144f4b")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a6560")}
          >
            Generar primer reporte
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "180px 180px 160px 140px 100px 1fr", padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
            {["TIPO", "PERÍODO", "GENERADO POR", "FECHA", "ESTADO", ""].map(col => (
              <div key={col} style={{ fontSize: 10, fontWeight: 500, color: "#9a958f", letterSpacing: "0.04em" }}>{col}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((r, i) => {
            const cfg = TIPO_CONFIG[r.tipo] ?? TIPO_CONFIG.inventario
            const period = formatPeriod(r.periodo_inicio, r.periodo_fin)
            const pdfHref = r.pdf_url ?? `/api/refugios/${activeRefugioId}/reportes/${r.id}/pdf`

            return (
              <div
                key={r.id}
                className="report-row"
                style={{ display: "grid", gridTemplateColumns: "180px 180px 160px 140px 100px 1fr", padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "0.5px solid #edeae4" : "none", alignItems: "center" }}
              >
                {/* Tipo */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={13} color={cfg.text} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: cfg.text }}>{cfg.label}</span>
                </div>

                {/* Período */}
                <div>
                  <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#3c3a36" }}>{period.top}</div>
                  {period.sub && <div style={{ fontSize: 11, color: "#9a958f", marginTop: 2 }}>{period.sub}</div>}
                </div>

                {/* Generado por */}
                <div style={{ fontSize: 12, color: "#9a958f" }}>{r.generado_por_nombre ?? "—"}</div>

                {/* Fecha */}
                <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>
                  {formatDate(r.generado_at)}
                </div>

                {/* Estado */}
                <div>
                  <span style={{ fontSize: 10, fontWeight: 500, borderRadius: 9999, padding: "2px 8px", backgroundColor: "#f0fdf4", color: "#15803d" }}>
                    PDF listo
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={pdfHref}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="link-action"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#1a6560" }}
                  >
                    <Download size={14} />
                    Descargar
                  </a>
                  <span style={{ color: "#e5e2dc" }}>·</span>
                  <a
                    href={pdfHref}
                    target="_blank"
                    rel="noreferrer"
                    className="link-action"
                    style={{ fontSize: 12, color: "#9a958f" }}
                  >
                    Ver
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <GenerarReporteModal
        open={modalOpen}
        preselectedTipo={modalTipo}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </div>
  )
}
