"use client"

import { useState, useEffect, useCallback } from "react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

type TipoRefugio =
  | "uma_registrada"
  | "laboratorio_academico"
  | "criadero_privado"
  | "chinampa_conservacion"
  | "acuario_publico"

interface ConfigRegulatoria {
  reporte_uma_trimestral: boolean
  movimientos_cites: boolean
}

interface RefugioData {
  id: string
  nombre: string
  tipo: TipoRefugio
  numero_uma: string | null
  ciudad: string | null
  estado_republica: string | null
  responsable_tecnico: string | null
  rfc: string | null
  config_regulatoria: ConfigRegulatoria
  updated_at: string
}

interface FormState {
  nombre: string
  tipo: TipoRefugio
  numero_uma: string
  ciudad: string
  estado_republica: string
  responsable_tecnico: string
  rfc: string
  reporte_uma_trimestral: boolean
  movimientos_cites: boolean
}

interface DatosRefugioProps {
  refugioId: string
  isAdmin: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoRefugio, string> = {
  uma_registrada: "UMA Registrada",
  laboratorio_academico: "Laboratorio Académico",
  criadero_privado: "Criadero Privado",
  chinampa_conservacion: "Chinampa de Conservación",
  acuario_publico: "Acuario Público",
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
  placeholder,
  disabled,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        height: 42,
        border: "0.5px solid #e5e2dc",
        borderRadius: 8,
        padding: "0 12px",
        fontSize: 13,
        fontFamily: "DM Sans, sans-serif",
        color: disabled ? "#9a958f" : "#0d0d0d",
        background: disabled ? "#f9f9f7" : "#ffffff",
        cursor: disabled ? "not-allowed" : "text",
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DatosRefugio({ refugioId, isAdmin }: DatosRefugioProps) {
  const { activeRefugio } = useRefugio()

  const [refugioData, setRefugioData] = useState<RefugioData | null>(null)
  const [form, setForm] = useState<FormState>({
    nombre: "",
    tipo: "uma_registrada",
    numero_uma: "",
    ciudad: "",
    estado_republica: "",
    responsable_tecnico: "",
    rfc: "",
    reporte_uma_trimestral: false,
    movimientos_cites: false,
  })
  const [originalForm, setOriginalForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty =
    originalForm !== null &&
    JSON.stringify(form) !== JSON.stringify(originalForm)

  const fetchRefugio = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/refugios/${refugioId}`)
      if (!res.ok) throw new Error("Error al cargar el refugio")
      const { data } = await res.json()
      const r: RefugioData = data

      const cfg = (r.config_regulatoria ?? {}) as ConfigRegulatoria
      const newForm: FormState = {
        nombre: r.nombre ?? "",
        tipo: r.tipo ?? "uma_registrada",
        numero_uma: r.numero_uma ?? "",
        ciudad: r.ciudad ?? "",
        estado_republica: r.estado_republica ?? "",
        responsable_tecnico: r.responsable_tecnico ?? "",
        rfc: r.rfc ?? "",
        reporte_uma_trimestral: cfg.reporte_uma_trimestral ?? false,
        movimientos_cites: cfg.movimientos_cites ?? false,
      }

      setRefugioData(r)
      setForm(newForm)
      setOriginalForm(newForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [refugioId])

  useEffect(() => {
    fetchRefugio()
  }, [fetchRefugio])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!isDirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        nombre: form.nombre,
        tipo: form.tipo,
        numero_uma: form.tipo === "uma_registrada" ? form.numero_uma : null,
        ciudad: form.ciudad,
        estado_republica: form.estado_republica,
        responsable_tecnico: form.responsable_tecnico,
        rfc: form.rfc,
        config_regulatoria: {
          reporte_uma_trimestral: form.reporte_uma_trimestral,
          movimientos_cites: form.movimientos_cites,
        },
      }
      const res = await fetch(`/api/refugios/${refugioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg ?? "Error al guardar")
      }
      setOriginalForm(form)
      toast.success("Cambios guardados")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar"
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const lastEdited = refugioData?.updated_at
    ? new Date(refugioData.updated_at).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  if (loading) {
    return (
      <div style={{ maxWidth: 700 }}>
        <Skeleton style={{ width: 160, height: 18, borderRadius: 6, marginBottom: 6 }} />
        <Skeleton style={{ width: 220, height: 12, borderRadius: 4, marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <Skeleton style={{ width: 130, height: 14, borderRadius: 5, marginBottom: 16 }} />
            {[1, 2].map(j => (
              <div key={j} style={{ marginBottom: 14 }}>
                <Skeleton style={{ width: 80, height: 10, borderRadius: 4, marginBottom: 6 }} />
                <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

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
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#0d0d0d",
              margin: 0,
              lineHeight: "1.3",
            }}
          >
            Datos del refugio
          </h1>
          {lastEdited && (
            <p
              style={{
                fontSize: 12,
                color: "#9a958f",
                margin: "4px 0 0",
              }}
            >
              Última edición {lastEdited}
            </p>
          )}
          {activeRefugio && (
            <p
              style={{
                fontSize: 12,
                color: "#9a958f",
                margin: "2px 0 0",
              }}
            >
              {activeRefugio.nombre}
            </p>
          )}
        </div>
        {isAdmin && (
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
            {saving ? <><Loader2 size={13} className="animate-spin" style={{ display: "inline" }} /> Guardando…</> : "Guardar cambios"}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f9f9f7", border: "0.5px solid #e5e2dc",
          borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        }}>
          <Lock size={13} color="#9a958f" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#9a958f", fontFamily: "DM Sans, sans-serif" }}>
            Solo los administradores pueden editar los datos del refugio.
          </span>
        </div>
      )}

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

      {/* Content */}
      <div
        style={{
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Card 1 — Información básica */}
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
            Información básica
          </h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Nombre del refugio */}
            <div>
              <FieldLabel>Nombre del refugio</FieldLabel>
              <TextInput
                value={form.nombre}
                onChange={isAdmin ? (v) => setField("nombre", v) : undefined}
                disabled={!isAdmin}
              />
            </div>

            {/* Tipo + Número UMA */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <FieldLabel>Tipo de refugio</FieldLabel>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.tipo}
                    onChange={isAdmin ? (e) => setField("tipo", e.target.value as TipoRefugio) : undefined}
                    disabled={!isAdmin}
                    style={{
                      width: "100%",
                      height: 42,
                      border: "0.5px solid #e5e2dc",
                      borderRadius: 8,
                      padding: "0 36px 0 12px",
                      fontSize: 13,
                      fontFamily: "DM Sans, sans-serif",
                      color: !isAdmin ? "#9a958f" : "#0d0d0d",
                      background: !isAdmin ? "#f9f9f7" : "#ffffff",
                      outline: "none",
                      cursor: !isAdmin ? "not-allowed" : "pointer",
                      boxSizing: "border-box",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  >
                    {(
                      Object.entries(TIPO_LABELS) as [TipoRefugio, string][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="#9a958f"
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Número UMA</FieldLabel>
                <TextInput
                  value={
                    form.tipo === "uma_registrada" ? form.numero_uma : ""
                  }
                  onChange={
                    isAdmin && form.tipo === "uma_registrada"
                      ? (v) => setField("numero_uma", v)
                      : undefined
                  }
                  placeholder={
                    form.tipo === "uma_registrada" ? "" : "No aplica"
                  }
                  disabled={!isAdmin || form.tipo !== "uma_registrada"}
                />
              </div>
            </div>

            {/* Ciudad + Estado */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <TextInput
                  value={form.ciudad}
                  onChange={isAdmin ? (v) => setField("ciudad", v) : undefined}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <TextInput
                  value={form.estado_republica}
                  onChange={isAdmin ? (v) => setField("estado_republica", v) : undefined}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Responsable técnico */}
            <div>
              <FieldLabel>Responsable técnico</FieldLabel>
              <TextInput
                value={form.responsable_tecnico}
                onChange={isAdmin ? (v) => setField("responsable_tecnico", v) : undefined}
                disabled={!isAdmin}
              />
            </div>

            {/* RFC */}
            <div>
              <FieldLabel>RFC</FieldLabel>
              <TextInput
                value={form.rfc}
                onChange={isAdmin ? (v) => setField("rfc", v) : undefined}
                placeholder="RFC del responsable (opcional)"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Card 2 — Configuración regulatoria */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div style={{ paddingBottom: 12, marginBottom: 16, borderBottom: "0.5px solid #e5e2dc" }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#0d0d0d",
                margin: 0,
              }}
            >
              Configuración regulatoria
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "#9a958f",
                margin: "4px 0 0",
              }}
            >
              Define qué reportes aplican para este refugio.
            </p>
          </div>

          {/* Toggle: Reporte UMA trimestral */}
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
                Reporte UMA trimestral
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "3px 0 0",
                  maxWidth: 420,
                }}
              >
                Genera PDF automático para SEMARNAT al cierre de cada trimestre.
              </p>
            </div>
            <Toggle
              checked={form.reporte_uma_trimestral}
              onChange={isAdmin ? (v) => setField("reporte_uma_trimestral", v) : () => {}}
            />
          </div>

          {/* Toggle: Movimientos CITES */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 16,
              paddingTop: 16,
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
                Movimientos CITES
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "3px 0 0",
                  maxWidth: 420,
                }}
              >
                Para exportación internacional de individuos.
              </p>
            </div>
            <Toggle
              checked={form.movimientos_cites}
              onChange={isAdmin ? (v) => setField("movimientos_cites", v) : () => {}}
            />
          </div>
        </div>

        {/* Card 3 — Zona de peligro */}
        {isAdmin && (<div
          style={{
            background: "#ffffff",
            border: "0.5px solid #fca5a5",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#991b1b",
              margin: 0,
              paddingBottom: 12,
              marginBottom: 16,
              borderBottom: "0.5px solid #fca5a5",
            }}
          >
            Zona de peligro
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
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
                Eliminar refugio
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a958f",
                  margin: "3px 0 0",
                }}
              >
                Esta acción es permanente y no se puede deshacer. Se eliminarán
                todos los datos asociados.
              </p>
            </div>
            <button
              type="button"
              style={{
                border: "1px solid #fca5a5",
                color: "#991b1b",
                background: "transparent",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  "#fef2f2"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  "transparent"
              }}
            >
              Eliminar refugio
            </button>
          </div>
        </div>)}
      </div>
    </div>
  )
}
