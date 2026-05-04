"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/src/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  nombre: string
  apellido: string | null
  email: string
  avatar_url: string | null
}

interface FormState {
  nombre: string
  apellido: string
}

interface PerfilProps {
  currentUserId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(nombre: string, apellido: string | null): string {
  return (
    ((nombre?.[0] ?? "") + (apellido?.[0] ?? "")).toUpperCase() || "U"
  )
}

function getPasswordStrength(pwd: string): number {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? "#1a6560" : "#e5e2dc",
        border: "none",
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0,
        transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#ffffff",
          display: "block",
          flexShrink: 0,
        }}
      />
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 500,
        color: "#0d0d0d",
        marginBottom: 6,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  type = "text",
  readOnly,
  disabled,
  placeholder,
}: {
  value: string
  onChange?: (v: string) => void
  type?: string
  readOnly?: boolean
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      style={{
        width: "100%",
        height: 42,
        border: "0.5px solid #e5e2dc",
        borderRadius: 8,
        padding: "0 12px",
        fontSize: 13,
        fontFamily: "DM Sans, sans-serif",
        color: readOnly || disabled ? "#9a958f" : "#0d0d0d",
        background: readOnly || disabled ? "#f9f9f7" : "#ffffff",
        cursor: readOnly || disabled ? "not-allowed" : "text",
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  )
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  const colors = ["#e5e2dc", "#ef4444", "#f59e0b", "#3b82f6", "#1a6560"]
  const labels = ["", "Muy débil", "Débil", "Buena", "Fuerte"]

  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: password.length > 0 && i <= strength ? colors[strength] : "#e5e2dc",
              transition: "background 0.15s ease",
            }}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p
          style={{
            fontSize: 11,
            color: "#9a958f",
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {labels[strength]}
        </p>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Perfil({ currentUserId }: PerfilProps) {
  const supabase = createClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<FormState>({ nombre: "", apellido: "" })
  const [originalForm, setOriginalForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  // Preference toggles (UI-only)
  const [notifEmail, setNotifEmail] = useState(true)
  const [resumenSemanal, setResumenSemanal] = useState(false)

  const isDirty =
    originalForm !== null &&
    JSON.stringify(form) !== JSON.stringify(originalForm)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from("usuarios_perfil")
        .select("*")
        .eq("id", currentUserId)
        .single()

      if (err) throw err

      setProfile(data)
      const newForm: FormState = {
        nombre: data.nombre ?? "",
        apellido: data.apellido ?? "",
      }
      setForm(newForm)
      setOriginalForm(newForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar perfil")
    } finally {
      setLoading(false)
    }
  }, [currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!isDirty || saving) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const { error: err } = await supabase
        .from("usuarios_perfil")
        .update({ nombre: form.nombre, apellido: form.apellido })
        .eq("id", currentUserId)

      if (err) throw err

      setOriginalForm(form)
      setProfile((prev) =>
        prev
          ? { ...prev, nombre: form.nombre, apellido: form.apellido }
          : prev
      )
      setSuccessMsg("Perfil actualizado correctamente.")
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    setPwdError(null)
    if (!newPassword || !confirmPassword) {
      setPwdError("Completa todos los campos.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Las contraseñas no coinciden.")
      return
    }
    if (getPasswordStrength(newPassword) < 2) {
      setPwdError("La contraseña es muy débil.")
      return
    }
    setPwdSaving(true)
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (err) throw err
      setShowPasswordForm(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccessMsg("Contraseña actualizada correctamente.")
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 560 }}>
        <Skeleton style={{ width: 80, height: 18, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Skeleton style={{ width: 64, height: 64, borderRadius: "50%" }} />
            <div>
              <Skeleton style={{ width: 120, height: 14, borderRadius: 5, marginBottom: 6 }} />
              <Skeleton style={{ width: 80, height: 10, borderRadius: 4 }} />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: 14 }}>
              <Skeleton style={{ width: 70, height: 10, borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
            </div>
          ))}
        </div>
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
          <Skeleton style={{ width: 140, height: 14, borderRadius: 5, marginBottom: 16 }} />
          {[1, 2].map(i => (
            <div key={i} style={{ marginBottom: 14 }}>
              <Skeleton style={{ width: 80, height: 10, borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const initials = profile
    ? getInitials(form.nombre || profile.nombre, form.apellido || profile.apellido)
    : "U"

  const fullName = [form.nombre, form.apellido].filter(Boolean).join(" ") || profile?.email || ""

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#0d0d0d",
            margin: 0,
          }}
        >
          Mi perfil
        </h1>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            background: isDirty && !saving ? "#1a6560" : "#e5e2dc",
            color: isDirty && !saving ? "#f9f9f7" : "#9a958f",
            border: "none",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "DM Sans, sans-serif",
            cursor: isDirty && !saving ? "pointer" : "not-allowed",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "0.5px solid #fca5a5",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#991b1b",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: "#f0fdf4",
            border: "0.5px solid #86efac",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#166534",
            marginBottom: 16,
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Card 1 — Información personal */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderRadius: 10,
            padding: 20,
          }}
        >
          {/* Avatar section */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#e2f0ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#1a6560",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {initials}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#0d0d0d",
                  margin: 0,
                }}
              >
                {fullName}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#9a958f",
                  margin: "2px 0 0",
                }}
              >
                {profile?.email}
              </p>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 12,
                  color: "#1a6560",
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 6,
                }}
              >
                Cambiar foto
              </a>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 0,
              borderTop: "0.5px solid #e5e2dc",
              marginBottom: 16,
            }}
          />

          {/* Name fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <TextInput
                value={form.nombre}
                onChange={(v) => setField("nombre", v)}
              />
            </div>
            <div>
              <FieldLabel>Apellido</FieldLabel>
              <TextInput
                value={form.apellido}
                onChange={(v) => setField("apellido", v)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <FieldLabel>Correo electrónico</FieldLabel>
            <TextInput
              value={profile?.email ?? ""}
              readOnly
            />
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              {/* Lock icon inline SVG */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9a958f"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: 0,
                }}
              >
                El correo no puede modificarse.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2 — Seguridad */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#0d0d0d",
              margin: 0,
              paddingBottom: 12,
              marginBottom: 16,
              borderBottom: "0.5px solid #e5e2dc",
            }}
          >
            Seguridad
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#0d0d0d",
                  margin: 0,
                }}
              >
                Contraseña
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "2px 0 0",
                }}
              >
                Última vez cambiada hace 45 días
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((v) => !v)
                setPwdError(null)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              }}
              style={{
                border: "0.5px solid #e5e2dc",
                background: "#ffffff",
                color: "#3c3a36",
                borderRadius: 8,
                height: 32,
                padding: "0 12px",
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              Cambiar contraseña
            </button>
          </div>

          {showPasswordForm && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "0.5px solid #e5e2dc",
              }}
            >
              {pwdError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "0.5px solid #fca5a5",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "#991b1b",
                    marginBottom: 12,
                  }}
                >
                  {pwdError}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Contraseña actual</FieldLabel>
                <TextInput
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Nueva contraseña</FieldLabel>
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordStrengthBar password={newPassword} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Confirmar nueva contraseña</FieldLabel>
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPwdError(null)
                  }}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "0.5px solid #e5e2dc",
                    background: "#ffffff",
                    color: "#3c3a36",
                    fontSize: 12,
                    fontFamily: "DM Sans, sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={pwdSaving}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    background: pwdSaving ? "#e5e2dc" : "#1a6560",
                    color: pwdSaving ? "#9a958f" : "#f9f9f7",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "DM Sans, sans-serif",
                    cursor: pwdSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {pwdSaving ? "Actualizando…" : "Actualizar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3 — Preferencias */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#0d0d0d",
              margin: 0,
              paddingBottom: 12,
              marginBottom: 16,
              borderBottom: "0.5px solid #e5e2dc",
            }}
          >
            Preferencias
          </h2>

          {/* Toggle: Notificaciones por email */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#0d0d0d",
                  margin: 0,
                }}
              >
                Notificaciones por email
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "3px 0 0",
                }}
              >
                Recibe alertas críticas en tu correo.
              </p>
            </div>
            <Toggle checked={notifEmail} onChange={setNotifEmail} />
          </div>

          {/* Toggle: Resumen semanal */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "0.5px solid #e5e2dc",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#0d0d0d",
                  margin: 0,
                }}
              >
                Resumen semanal
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "3px 0 0",
                }}
              >
                Email con actividad del refugio cada lunes.
              </p>
            </div>
            <Toggle checked={resumenSemanal} onChange={setResumenSemanal} />
          </div>
        </div>
      </div>
    </div>
  )
}
