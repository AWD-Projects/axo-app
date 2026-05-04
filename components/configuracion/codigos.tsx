"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MoreHorizontal, Copy, Info } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { GenerarCodigoModal } from "./generar-codigo-modal"

// ── Types ──────────────────────────────────────────────────────────────────────

type Rol = "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"

interface Codigo {
  id: string
  codigo: string
  rol: Rol
  max_usos: number | null
  usos_actuales: number
  expires_at: string | null
  activo: boolean
  created_at: string
}

interface CodigosProps {
  refugioId: string
  refugioNombre: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<Rol, { bg: string; text: string }> = {
  admin:        { bg: "#e2f0ee", text: "#1a6560" },
  tecnico:      { bg: "#eff6ff", text: "#1e3a8a" },
  investigador: { bg: "#f0fdf4", text: "#15803d" },
  estudiante:   { bg: "#fffbeb", text: "#92400e" },
  lectura:      { bg: "#f3f2ef", text: "#9a958f" },
}

const ROLE_LABELS: Record<Rol, string> = {
  admin: "Admin",
  tecnico: "Técnico",
  investigador: "Investigador",
  estudiante: "Estudiante",
  lectura: "Lectura",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Sin expiración"
  const d = new Date(expiresAt)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Role Pill ─────────────────────────────────────────────────────────────────

function RolePill({ rol }: { rol: Rol }) {
  const c = ROLE_COLORS[rol]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      backgroundColor: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500, borderRadius: 999,
      padding: "2px 8px", whiteSpace: "nowrap",
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
    }}>
      {ROLE_LABELS[rol]}
    </span>
  )
}

// ── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ activo, expires_at }: { activo: boolean; expires_at: string | null }) {
  const expired = isExpired(expires_at)
  const label = expired ? "Expirado" : activo ? "Activo" : "Inactivo"
  const styles = expired
    ? { bg: "#fef2f2", text: "#991b1b" }
    : activo
    ? { bg: "#f0fdf4", text: "#15803d" }
    : { bg: "#f3f2ef", text: "#9a958f" }

  return (
    <span style={{
      backgroundColor: styles.bg, color: styles.text,
      fontSize: 10, fontWeight: 500, borderRadius: 999,
      padding: "3px 8px", whiteSpace: "nowrap",
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
    }}>
      {label}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Codigos({ refugioId, refugioNombre }: CodigosProps) {
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const actionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const sans = "var(--font-dm-sans), DM Sans, sans-serif"
  const mono = "var(--font-dm-mono), DM Mono, monospace"

  const fetchCodigos = useCallback(async () => {
    try {
      const res = await fetch(`/api/refugios/${refugioId}/codigos`)
      const { data } = await res.json()
      setCodigos(data ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [refugioId])

  useEffect(() => { fetchCodigos() }, [fetchCodigos])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      Object.keys(actionRefs.current).forEach(id => {
        if (actionRefs.current[id] && !actionRefs.current[id]!.contains(target)) {
          setActionsOpen(prev => ({ ...prev, [id]: false }))
        }
      })
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleCopy(id: string, codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // clipboard error
    }
  }

  async function handleDeactivate(codeId: string) {
    setCodigos(prev => prev.map(c => c.id === codeId ? { ...c, activo: false } : c))
    setActionsOpen(prev => ({ ...prev, [codeId]: false }))
    try {
      const res = await fetch(`/api/refugios/${refugioId}/codigos/${codeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: false }),
      })
      if (!res.ok) { fetchCodigos(); toast.error("Error al desactivar el código") }
      else toast.success("Código desactivado")
    } catch {
      fetchCodigos(); toast.error("Error de conexión")
    }
  }

  async function handleDelete(codeId: string) {
    setCodigos(prev => prev.filter(c => c.id !== codeId))
    setActionsOpen(prev => ({ ...prev, [codeId]: false }))
    try {
      const res = await fetch(`/api/refugios/${refugioId}/codigos/${codeId}`, { method: "DELETE" })
      if (!res.ok) { fetchCodigos(); toast.error("Error al eliminar el código") }
      else toast.success("Código eliminado")
    } catch {
      fetchCodigos(); toast.error("Error de conexión")
    }
  }

  return (
    <div style={{ fontFamily: sans }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 500, color: "#0d0d0d" }}>Códigos de acceso</span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            height: 36, padding: "0 16px", borderRadius: 8, border: "none",
            backgroundColor: "#1a6560", color: "#f9f9f7",
            fontFamily: sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}
        >
          ＋ Generar código
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        backgroundColor: "#e2f0ee", border: "0.5px solid rgba(26,101,96,0.2)",
        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start",
      }}>
        <Info size={14} color="#1a6560" style={{ marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#1a6560", lineHeight: 1.4 }}>
          Los códigos permiten a los usuarios unirse al refugio sin necesidad de invitación individual.
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 120px 100px 48px", padding: "14px 16px", borderBottom: "0.5px solid #edeae4", alignItems: "center", gap: 8 }}>
              <Skeleton style={{ height: 12, borderRadius: 4 }} />
              <Skeleton style={{ height: 10, borderRadius: 4 }} />
              <Skeleton style={{ height: 10, borderRadius: 4 }} />
              <Skeleton style={{ height: 6, borderRadius: 3 }} />
              <Skeleton style={{ height: 10, borderRadius: 4 }} />
              <Skeleton style={{ width: 24, height: 24, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : codigos.length === 0 ? (
        /* Empty state */
        <div style={{
          backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
          borderRadius: 10, padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
            Sin códigos de acceso
          </div>
          <div style={{ fontSize: 12, color: "#9a958f", marginBottom: 16 }}>
            Los códigos permiten que nuevos usuarios se unan al refugio sin invitación.
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              height: 36, padding: "0 16px", borderRadius: 8, border: "none",
              backgroundColor: "#1a6560", color: "#f9f9f7",
              fontFamily: sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >
            ＋ Generar primer código
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            backgroundColor: "#f9f9f7", padding: "10px 16px",
            borderBottom: "0.5px solid #e5e2dc",
            display: "grid", gridTemplateColumns: "1fr 120px 100px 120px 100px 48px",
            gap: 8,
          }}>
            {["CÓDIGO", "ROL", "USOS", "EXPIRA", "ESTADO", ""].map((label, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 500, color: "#9a958f",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {label}
              </span>
            ))}
          </div>

          {/* Rows */}
          {codigos.map((c, idx) => {
            const expired = isExpired(c.expires_at)
            const expiringSoon = isExpiringSoon(c.expires_at)
            const muted = expired || !c.activo
            const progressPct = c.max_usos ? Math.min((c.usos_actuales / c.max_usos) * 100, 100) : 0

            return (
              <div
                key={c.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 120px 100px 120px 100px 48px",
                  gap: 8, padding: "14px 16px",
                  borderBottom: idx < codigos.length - 1 ? "0.5px solid #edeae4" : "none",
                  opacity: muted ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                {/* CÓDIGO */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: "#0d0d0d", letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.codigo}
                  </span>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.id, c.codigo)}
                      title="Copiar código"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9a958f", lineHeight: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
                    >
                      <Copy size={14} />
                    </button>
                    {copiedId === c.id && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 4px)", left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#0d0d0d", color: "#ffffff",
                        fontSize: 10, padding: "3px 8px", borderRadius: 4,
                        whiteSpace: "nowrap", fontFamily: sans, pointerEvents: "none",
                      }}>
                        Copiado
                      </div>
                    )}
                  </div>
                </div>

                {/* ROL */}
                <div>
                  <RolePill rol={c.rol} />
                </div>

                {/* USOS */}
                <div>
                  <div style={{ fontFamily: mono, fontSize: 12, color: "#0d0d0d" }}>
                    {c.max_usos === null ? "Ilimitado" : `${c.usos_actuales} / ${c.max_usos}`}
                  </div>
                  {c.max_usos !== null && (
                    <div style={{ marginTop: 4, width: 40, height: 3, backgroundColor: "#e5e2dc", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${progressPct}%`, height: "100%", backgroundColor: "#1a6560", borderRadius: 2 }} />
                    </div>
                  )}
                </div>

                {/* EXPIRA */}
                <div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: expiringSoon ? "#92400e" : "#9a958f" }}>
                    {formatExpiry(c.expires_at)}
                  </div>
                  {expiringSoon && (
                    <div style={{ fontFamily: sans, fontSize: 10, color: "#92400e", marginTop: 2 }}>
                      Próximo a expirar
                    </div>
                  )}
                </div>

                {/* ESTADO */}
                <div>
                  <StatusPill activo={c.activo} expires_at={c.expires_at} />
                </div>

                {/* ACTIONS */}
                <div
                  style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}
                  ref={el => { actionRefs.current[c.id] = el }}
                >
                  <button
                    type="button"
                    onClick={() => setActionsOpen(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9a958f", lineHeight: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {actionsOpen[c.id] && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
                      backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
                      borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      minWidth: 140, overflow: "hidden",
                    }}>
                      {c.activo && !expired && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(c.id)}
                          style={{ width: "100%", textAlign: "left", padding: "8px 14px", border: "none", backgroundColor: "#ffffff", fontSize: 13, color: "#0d0d0d", cursor: "pointer", fontFamily: sans }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                        >
                          Desactivar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        style={{ width: "100%", textAlign: "left", padding: "8px 14px", border: "none", borderTop: c.activo && !expired ? "0.5px solid #e5e2dc" : "none", backgroundColor: "#ffffff", fontSize: 13, color: "#991b1b", cursor: "pointer", fontFamily: sans }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <GenerarCodigoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        refugioId={refugioId}
        refugioNombre={refugioNombre}
        onSuccess={fetchCodigos}
      />
    </div>
  )
}
