"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MoreHorizontal, ChevronDown, Info, Check, Minus, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { InvitarUsuarioModal } from "./invitar-usuario-modal"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────────

type Rol = "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"

interface UsuarioPerfil {
  id: string
  nombre: string | null
  apellido: string | null
  email: string
}

interface Membership {
  id: string
  rol: Rol
  activo: boolean
  created_at: string
  usuarios_perfil: UsuarioPerfil
}

interface UsuariosProps {
  refugioId: string
  currentUserId: string
  isAdmin: boolean
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

const ALL_ROLES: Rol[] = ["admin", "tecnico", "investigador", "estudiante", "lectura"]

const PERM_ROWS: { role: Rol; ver: boolean; registrar: boolean; editar: boolean; admin: boolean }[] = [
  { role: "admin",        ver: true,  registrar: true,  editar: true,  admin: true  },
  { role: "tecnico",      ver: true,  registrar: true,  editar: true,  admin: false },
  { role: "investigador", ver: true,  registrar: true,  editar: false, admin: false },
  { role: "estudiante",   ver: true,  registrar: false, editar: false, admin: false },
  { role: "lectura",      ver: true,  registrar: false, editar: false, admin: false },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

function getInitials(nombre: string | null, apellido: string | null, email: string): string {
  if (nombre && apellido) return `${nombre[0]}${apellido[0]}`.toUpperCase()
  if (nombre) return nombre.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function getFullName(p: UsuarioPerfil): string {
  if (p.nombre && p.apellido) return `${p.nombre} ${p.apellido}`
  if (p.nombre) return p.nombre
  return p.email
}

// ── PermCheck cell ─────────────────────────────────────────────────────────────

function PermCell({ ok }: { ok: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      backgroundColor: ok ? "#f0fdf4" : "#f3f2ef",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {ok
        ? <Check size={11} color="#15803d" strokeWidth={2.5} />
        : <Minus size={11} color="#9a958f" />
      }
    </div>
  )
}

// ── Role Pill ─────────────────────────────────────────────────────────────────

function RolePill({ rol }: { rol: Rol }) {
  const c = ROLE_COLORS[rol]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      backgroundColor: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500,
      borderRadius: 999, padding: "2px 8px",
      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
      whiteSpace: "nowrap",
    }}>
      {ROLE_LABELS[rol]}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Usuarios({ refugioId, currentUserId, isAdmin }: UsuariosProps) {
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showPerms, setShowPerms] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState<Record<string, boolean>>({})
  const [actionsOpen, setActionsOpen] = useState<Record<string, boolean>>({})
  const [confirmRemove, setConfirmRemove] = useState<Membership | null>(null)
  const [removing, setRemoving] = useState(false)
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const actionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/refugios/${refugioId}/usuarios`)
      const { data } = await res.json()
      setMembers(data ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [refugioId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      // close role dropdowns
      Object.keys(dropdownRefs.current).forEach(id => {
        if (dropdownRefs.current[id] && !dropdownRefs.current[id]!.contains(target)) {
          setRolesOpen(prev => ({ ...prev, [id]: false }))
        }
      })
      // close action dropdowns
      Object.keys(actionRefs.current).forEach(id => {
        if (actionRefs.current[id] && !actionRefs.current[id]!.contains(target)) {
          setActionsOpen(prev => ({ ...prev, [id]: false }))
        }
      })
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleRoleChange(membershipId: string, newRol: Rol) {
    const prev_rol = members.find(m => m.id === membershipId)?.rol
    setMembers(prev => prev.map(m => m.id === membershipId ? { ...m, rol: newRol } : m))
    setRolesOpen(prev => ({ ...prev, [membershipId]: false }))
    try {
      const res = await fetch(`/api/refugios/${refugioId}/usuarios/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: newRol }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        toast.error(msg ?? "Error al cambiar el rol")
        setMembers(prev => prev.map(m => m.id === membershipId ? { ...m, rol: prev_rol! } : m))
      } else {
        toast.success(`Rol actualizado a ${ROLE_LABELS[newRol]}`)
      }
    } catch {
      toast.error("Error de conexión")
      fetchMembers()
    }
  }

  async function handleRemove(usuarioId: string) {
    const target = confirmRemove
    setRemoving(true)
    try {
      await fetch(`/api/refugios/${refugioId}/usuarios/${usuarioId}`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.usuarios_perfil.id !== usuarioId))
      setConfirmRemove(null)
      toast.success(`${target ? getFullName(target.usuarios_perfil) : "Usuario"} removido del refugio`)
    } catch {
      fetchMembers()
      toast.error("Error al remover el usuario")
    } finally {
      setRemoving(false)
    }
  }

  const sans = "var(--font-dm-sans), DM Sans, sans-serif"
  const mono = "var(--font-dm-mono), DM Mono, monospace"

  return (
    <div style={{ fontFamily: sans }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: "#0d0d0d" }}>Usuarios y permisos</span>
          <span style={{ fontSize: 12, color: "#9a958f", marginLeft: 8 }}>{members.length} miembros</span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            style={{
              height: 36, padding: "0 16px", borderRadius: 8, border: "none",
              backgroundColor: "#1a6560", color: "#f9f9f7",
              fontFamily: sans, fontSize: 12, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ＋ Invitar usuario
          </button>
        )}
      </div>

      {/* Info banner */}
      <div style={{
        backgroundColor: "#e2f0ee", border: "0.5px solid rgba(26,101,96,0.2)",
        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start",
      }}>
        <Info size={14} color="#1a6560" style={{ marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#1a6560", lineHeight: 1.4 }}>
          Los roles definen qué puede hacer cada usuario en este refugio.
        </span>
      </div>

      {/* Roles reference card */}
      <div style={{
        backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
        borderRadius: 10, padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>Permisos por rol</span>
          <button
            type="button"
            onClick={() => setShowPerms(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1a6560", fontFamily: sans, padding: 0 }}
          >
            {showPerms ? "Ocultar ↑" : "Ver permisos ↓"}
          </button>
        </div>

        {showPerms && (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ROL", "VER", "REGISTRAR", "EDITAR", "ADMIN"].map(col => (
                    <th key={col} style={{
                      textAlign: col === "ROL" ? "left" : "center",
                      fontSize: 10, fontWeight: 500, color: "#9a958f",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "0 8px 8px",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_ROWS.map(row => (
                  <tr key={row.role}>
                    <td style={{ padding: "6px 8px", fontSize: 12, color: "#0d0d0d", whiteSpace: "nowrap" }}>
                      {ROLE_LABELS[row.role]}
                    </td>
                    {[row.ver, row.registrar, row.editar, row.admin].map((ok, i) => (
                      <td key={i} style={{ padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <PermCell ok={ok} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Users table */}
      {loading ? (
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "0.5px solid #edeae4" }}>
              <Skeleton style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ width: "40%", height: 12, borderRadius: 4, marginBottom: 5 }} />
                <Skeleton style={{ width: "60%", height: 10, borderRadius: 4 }} />
              </div>
              <Skeleton style={{ width: 70, height: 22, borderRadius: 999 }} />
              <Skeleton style={{ width: 24, height: 24, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10 }}>
          {/* Table header */}
          <div style={{
            backgroundColor: "#f9f9f7", padding: "10px 16px",
            borderBottom: "0.5px solid #e5e2dc",
            borderRadius: "10px 10px 0 0",
            display: "grid", gridTemplateColumns: "1fr 140px 100px 140px 60px",
            gap: 8,
          }}>
            {["USUARIO", "ROL", "INGRESÓ", "ÚLTIMO ACCESO", ""].map((label, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 500, color: "#9a958f",
                textTransform: "uppercase", letterSpacing: "0.06em",
                textAlign: i >= 2 ? "left" : "left",
              }}>
                {label}
              </span>
            ))}
          </div>

          {/* Rows */}
          {members.map((m, idx) => {
            const isCurrentUser = m.usuarios_perfil.id === currentUserId
            const profile = m.usuarios_perfil
            const initials = getInitials(profile.nombre, profile.apellido, profile.email)
            const fullName = getFullName(profile)

            return (
              <div
                key={m.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 140px 100px 140px 60px",
                  gap: 8, padding: "14px 16px",
                  borderBottom: idx < members.length - 1 ? "0.5px solid #edeae4" : "none",
                  backgroundColor: isCurrentUser ? "#f9fffe" : "#ffffff",
                  borderLeft: isCurrentUser ? "3px solid #1a6560" : "3px solid transparent",
                  alignItems: "center",
                }}
                onMouseEnter={e => {
                  if (!isCurrentUser) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f9f9f7"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = isCurrentUser ? "#f9fffe" : "#ffffff"
                }}
              >
                {/* USUARIO */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    backgroundColor: "#e2f0ee", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a6560", fontFamily: sans }}>
                      {initials}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d", fontFamily: sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fullName}
                      </span>
                      {isCurrentUser && (
                        <span style={{
                          fontSize: 10, color: "#1a6560", backgroundColor: "#e2f0ee",
                          borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0,
                        }}>
                          Tú
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#9a958f", fontFamily: sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {profile.email}
                    </div>
                  </div>
                </div>

                {/* ROL */}
                <div style={{ position: "relative" }} ref={el => { dropdownRefs.current[m.id] = el }}>
                  {isCurrentUser || !isAdmin ? (
                    <RolePill rol={m.rol} />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRolesOpen(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          backgroundColor: ROLE_COLORS[m.rol].bg, color: ROLE_COLORS[m.rol].text,
                          fontSize: 11, fontWeight: 500, borderRadius: 999,
                          padding: "2px 8px", border: "none", cursor: "pointer",
                          fontFamily: sans, whiteSpace: "nowrap",
                        }}
                      >
                        {ROLE_LABELS[m.rol]}
                        <ChevronDown size={12} />
                      </button>
                      {rolesOpen[m.id] && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                          backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
                          borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          minWidth: 130, overflow: "hidden",
                        }}>
                          {ALL_ROLES.map(rol => (
                            <button
                              key={rol}
                              type="button"
                              onClick={() => handleRoleChange(m.id, rol)}
                              style={{
                                width: "100%", display: "flex", alignItems: "center",
                                gap: 8, padding: "8px 12px", border: "none",
                                backgroundColor: m.rol === rol ? "#f9f9f7" : "#ffffff",
                                cursor: "pointer",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = m.rol === rol ? "#f9f9f7" : "#ffffff")}
                            >
                              <RolePill rol={rol} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* INGRESÓ */}
                <div style={{ fontFamily: mono, fontSize: 11, color: "#9a958f" }}>
                  {formatDate(m.created_at)}
                </div>

                {/* ÚLTIMO ACCESO */}
                <div style={{ fontFamily: mono, fontSize: 11, color: "#9a958f" }}>—</div>

                {/* ACTIONS */}
                <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}
                  ref={el => { actionRefs.current[m.id] = el }}>
                  {!isCurrentUser && isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionsOpen(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9a958f", lineHeight: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {actionsOpen[m.id] && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
                          backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
                          borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          minWidth: 160, overflow: "hidden",
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(prev => ({ ...prev, [m.id]: false }))
                              setConfirmRemove(m)
                            }}
                            style={{ width: "100%", textAlign: "left", padding: "8px 14px", border: "none", backgroundColor: "#ffffff", fontSize: 13, color: "#991b1b", cursor: "pointer", fontFamily: sans }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                          >
                            Remover del refugio
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#9a958f", fontSize: 13 }}>
              Sin usuarios registrados.
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      <InvitarUsuarioModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        refugioId={refugioId}
        onSuccess={fetchMembers}
      />

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)",
          }}
          onClick={() => { if (!removing) setConfirmRemove(null) }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff", borderRadius: 14,
              width: 380, maxWidth: "calc(100vw - 32px)",
              padding: 24, boxShadow: "0 8px 32px rgba(13,13,13,0.12)",
            }}
          >
            <h2 style={{ fontFamily: sans, fontSize: 16, fontWeight: 500, color: "#0d0d0d", margin: "0 0 8px" }}>
              Remover usuario
            </h2>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#3c3a36", margin: "0 0 6px" }}>
              ¿Estás seguro de que quieres remover a <strong>{getFullName(confirmRemove.usuarios_perfil)}</strong> del refugio?
            </p>
            <p style={{ fontFamily: sans, fontSize: 12, color: "#9a958f", margin: "0 0 24px" }}>
              Perderá acceso inmediatamente. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 8,
                  border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff",
                  fontFamily: sans, fontSize: 12, fontWeight: 500,
                  color: removing ? "#9a958f" : "#3c3a36",
                  cursor: removing ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRemove(confirmRemove.usuarios_perfil.id)}
                disabled={removing}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 8, border: "none",
                  backgroundColor: removing ? "#b91c1c" : "#991b1b",
                  fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#ffffff",
                  cursor: removing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: removing ? 0.8 : 1,
                }}
              >
                {removing && <Loader2 size={13} className="animate-spin" />}
                {removing ? "Removiendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
