"use client"

import { useState, useEffect, useCallback } from "react"
import { Mail, Clock, CheckCircle, XCircle } from "lucide-react"

interface Invitation {
  id: string
  email: string
  rol: string
  token: string
  used: boolean
  expires_at: string | null
  created_at: string
}

const ROL_COLORS: Record<string, { bg: string; text: string }> = {
  admin:         { bg: "#e2f0ee", text: "#1a6560" },
  tecnico:       { bg: "#eff6ff", text: "#1e3a8a" },
  investigador:  { bg: "#f0fdf4", text: "#15803d" },
  estudiante:    { bg: "#fffbeb", text: "#92400e" },
  lectura:       { bg: "#f3f2ef", text: "#9a958f" },
}

const ROL_LABELS: Record<string, string> = {
  admin: "Admin", tecnico: "Técnico", investigador: "Investigador",
  estudiante: "Estudiante", lectura: "Lectura",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

function isExpired(expires_at: string | null) {
  if (!expires_at) return false
  return new Date(expires_at) < new Date()
}

export default function Invitaciones({ refugioId }: { refugioId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/invitations`)
      if (res.ok) {
        const json = await res.json()
        setInvitations(json.data ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [refugioId])

  useEffect(() => { load() }, [load])

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
    fontSize: 10, fontWeight: 500, color: "#9a958f",
    letterSpacing: "0.06em", textTransform: "uppercase",
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 18, fontWeight: 500, color: "#0d0d0d", margin: 0,
          }}>Invitaciones</h1>
          <p style={{
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 12, color: "#9a958f", margin: "4px 0 0",
          }}>Invitaciones enviadas por correo electrónico</p>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px 100px 120px 80px",
          padding: "10px 16px",
          backgroundColor: "#f9f9f7",
          borderBottom: "0.5px solid #e5e2dc",
        }}>
          {["CORREO", "ROL", "ENVIADA", "EXPIRA", "ESTADO"].map(h => (
            <span key={h} style={labelStyle}>{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <style>{`@keyframes shimmer2{0%{background-position:-200px 0}100%{background-position:200px 0}}`}</style>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 14, borderRadius: 5, marginBottom: 12,
                background: "linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)",
                backgroundSize: "400px 100%",
                animation: "shimmer2 1.4s ease-in-out infinite",
              }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && invitations.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: "#f5f2ed",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <Mail size={18} color="#9a958f" />
            </div>
            <p style={{
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: "0 0 6px",
            }}>Sin invitaciones enviadas</p>
            <p style={{
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 12, color: "#9a958f", margin: 0,
            }}>Las invitaciones enviadas desde Usuarios y permisos aparecerán aquí.</p>
          </div>
        )}

        {/* Rows */}
        {!loading && invitations.map(inv => {
          const expired = isExpired(inv.expires_at)
          const colors = ROL_COLORS[inv.rol] ?? ROL_COLORS.lectura
          const statusColor = inv.used
            ? { bg: "#f0fdf4", text: "#15803d", label: "Aceptada" }
            : expired
            ? { bg: "#fef2f2", text: "#991b1b", label: "Expirada" }
            : { bg: "#fffbeb", text: "#92400e", label: "Pendiente" }
          const StatusIcon = inv.used ? CheckCircle : expired ? XCircle : Clock

          return (
            <div key={inv.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 100px 120px 80px",
              padding: "14px 16px",
              borderBottom: "0.5px solid #edeae4",
              alignItems: "center",
              opacity: expired && !inv.used ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  backgroundColor: "#f5f2ed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Mail size={12} color="#9a958f" />
                </div>
                <span style={{
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 13, color: "#0d0d0d",
                }}>{inv.email}</span>
              </div>

              <span style={{
                display: "inline-flex", alignItems: "center",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 11, fontWeight: 500,
                backgroundColor: colors.bg, color: colors.text,
                borderRadius: 999, padding: "3px 8px",
                width: "fit-content",
              }}>{ROL_LABELS[inv.rol] ?? inv.rol}</span>

              <span style={{
                fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                fontSize: 11, color: "#9a958f",
              }}>{formatDate(inv.created_at)}</span>

              <span style={{
                fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                fontSize: 11, color: expired ? "#991b1b" : "#9a958f",
              }}>{inv.expires_at ? formatDate(inv.expires_at) : "Sin expiración"}</span>

              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 10, fontWeight: 500,
                backgroundColor: statusColor.bg, color: statusColor.text,
                borderRadius: 999, padding: "3px 8px",
                width: "fit-content",
              }}>
                <StatusIcon size={10} />
                {statusColor.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
