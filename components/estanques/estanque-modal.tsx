"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Trash2 } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EstanqueFormData {
  nombre: string
  capacidad_litros: string
  tipo_sistema: string
  ubicacion_fisica: string
  notas: string
  rangos_personalizados: boolean
  rango_temp_min: string
  rango_temp_max: string
  rango_ph_min: string
  rango_ph_max: string
  rango_amonio_max: string
  rango_nitrito_max: string
  rango_oxigeno_min: string
}

export interface EstanqueData {
  id?: string
  nombre?: string
  capacidad_litros?: number | null
  tipo_sistema?: string | null
  ubicacion_fisica?: string | null
  notas?: string | null
}

interface EstanqueModalProps {
  open: boolean
  onClose: () => void
  refugioId: string
  estanque?: EstanqueData | null
  onSuccess: (estanque: { id: string; nombre: string }) => void
}

// ── Field styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 500,
  color: "#0d0d0d",
  display: "block",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  backgroundColor: "#ffffff",
  border: "0.5px solid #e5e2dc",
  padding: "0 12px",
  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
  fontSize: 13,
  color: "#0d0d0d",
  outline: "none",
  boxSizing: "border-box",
}

const monoInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "var(--font-dm-mono), DM Mono, monospace",
}

const rangeInputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  borderRadius: 6,
  backgroundColor: "#ffffff",
  border: "0.5px solid #e5e2dc",
  padding: "0 10px",
  fontFamily: "var(--font-dm-mono), DM Mono, monospace",
  fontSize: 12,
  color: "#0d0d0d",
  outline: "none",
  boxSizing: "border-box",
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function EstanqueModal({ open, onClose, refugioId, estanque, onSuccess }: EstanqueModalProps) {
  const isEdit = !!estanque?.id
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<EstanqueFormData>({
    nombre: "",
    capacidad_litros: "",
    tipo_sistema: "recirculacion",
    ubicacion_fisica: "",
    notas: "",
    rangos_personalizados: false,
    rango_temp_min: "14",
    rango_temp_max: "20",
    rango_ph_min: "6.5",
    rango_ph_max: "8.0",
    rango_amonio_max: "0.5",
    rango_nitrito_max: "0.3",
    rango_oxigeno_min: "5.0",
  })

  useEffect(() => {
    if (open) {
      setError("")
      if (estanque) {
        setForm(prev => ({
          ...prev,
          nombre: estanque.nombre ?? "",
          capacidad_litros: estanque.capacidad_litros ? String(estanque.capacidad_litros) : "",
          tipo_sistema: estanque.tipo_sistema ?? "recirculacion",
          ubicacion_fisica: estanque.ubicacion_fisica ?? "",
          notas: estanque.notas ?? "",
        }))
      } else {
        setForm({
          nombre: "",
          capacidad_litros: "",
          tipo_sistema: "recirculacion",
          ubicacion_fisica: "",
          notas: "",
          rangos_personalizados: false,
          rango_temp_min: "14",
          rango_temp_max: "20",
          rango_ph_min: "6.5",
          rango_ph_max: "8.0",
          rango_amonio_max: "0.5",
          rango_nitrito_max: "0.3",
          rango_oxigeno_min: "5.0",
        })
      }
    }
  }, [open, estanque])

  function set(key: keyof EstanqueFormData, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return }
    setSaving(true)
    setError("")
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        tipo_sistema: form.tipo_sistema || null,
        ubicacion_fisica: form.ubicacion_fisica.trim() || null,
        notas: form.notas.trim() || null,
      }
      if (form.capacidad_litros) body.capacidad_litros = Number(form.capacidad_litros)

      const url = isEdit
        ? `/api/refugios/${refugioId}/estanques/${estanque!.id}`
        : `/api/refugios/${refugioId}/estanques`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return }
      onSuccess({ id: data.data.id, nombre: data.data.nombre })
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!estanque?.id) return
    if (!confirm(`¿Desactivar "${estanque.nombre}"? Los ajolotes asignados quedarán sin estanque.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/refugios/${refugioId}/estanques/${estanque.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al eliminar"); setDeleting(false); return }
      onSuccess({ id: estanque.id!, nombre: estanque.nombre! })
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              width: 480,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 8px 32px rgba(13,13,13,0.12)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
                  {isEdit ? "Editar estanque" : "Nuevo estanque"}
                </h2>
                <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", marginTop: 4, marginBottom: 0 }}>
                  Define las características físicas del estanque.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "#9a958f" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            {/* Form */}
            <div>
              {/* Nombre */}
              <div>
                <label style={labelStyle}>Nombre del estanque</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set("nombre", e.target.value)}
                  placeholder="Ej. Estanque Principal A"
                  style={inputStyle}
                />
              </div>

              {/* Capacidad + Sistema */}
              <div className="grid grid-cols-2" style={{ gap: 12, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>Capacidad (litros)</label>
                  <input
                    type="number"
                    value={form.capacidad_litros}
                    onChange={e => set("capacidad_litros", e.target.value)}
                    placeholder="500"
                    style={monoInputStyle}
                    min="1"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sistema</label>
                  <select
                    value={form.tipo_sistema}
                    onChange={e => set("tipo_sistema", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
                  >
                    <option value="recirculacion">Recirculación</option>
                    <option value="estatico">Estático</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
              </div>

              {/* Ubicación */}
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Ubicación dentro del refugio</label>
                <input
                  type="text"
                  value={form.ubicacion_fisica}
                  onChange={e => set("ubicacion_fisica", e.target.value)}
                  placeholder="Ej. Sala principal, Módulo B"
                  style={inputStyle}
                />
              </div>

              {/* Notas */}
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Notas adicionales</label>
                <textarea
                  value={form.notas}
                  onChange={e => set("notas", e.target.value)}
                  placeholder="Observaciones sobre el estanque..."
                  style={{
                    width: "100%",
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: "#ffffff",
                    border: "0.5px solid #e5e2dc",
                    padding: "10px 12px",
                    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                    fontSize: 13,
                    color: "#0d0d0d",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Rangos de alerta */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>
                  Rangos de alerta personalizados
                </div>
                <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 2, lineHeight: 1.5 }}>
                  Axo usará estos rangos para generar alertas. Los valores por defecto son para Ambystoma mexicanum.
                </div>

                <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "10px 0" }} />

                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#0d0d0d" }}>
                    Usar rangos personalizados
                  </span>
                  <button
                    type="button"
                    onClick={() => set("rangos_personalizados", !form.rangos_personalizados)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: form.rangos_personalizados ? "#1a6560" : "#e5e2dc",
                      border: "none",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background-color 150ms",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: 3,
                      left: form.rangos_personalizados ? 18 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      transition: "left 150ms",
                    }} />
                  </button>
                </div>

                {/* Range fields */}
                {form.rangos_personalizados && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Temperatura (°C)", minKey: "rango_temp_min" as keyof EstanqueFormData, maxKey: "rango_temp_max" as keyof EstanqueFormData },
                      { label: "pH", minKey: "rango_ph_min" as keyof EstanqueFormData, maxKey: "rango_ph_max" as keyof EstanqueFormData },
                      { label: "Amonio (ppm) — máx", minKey: null, maxKey: "rango_amonio_max" as keyof EstanqueFormData },
                      { label: "Nitrito (ppm) — máx", minKey: null, maxKey: "rango_nitrito_max" as keyof EstanqueFormData },
                      { label: "Oxígeno (mg/L) — mín", minKey: null, maxKey: "rango_oxigeno_min" as keyof EstanqueFormData },
                    ].map(({ label, minKey, maxKey }) => (
                      <div
                        key={label}
                        style={{ display: "grid", gridTemplateColumns: "1fr 72px 16px 72px", alignItems: "center", gap: 0 }}
                      >
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#3c3a36" }}>
                          {label}
                        </span>
                        {/* Min input or empty cell */}
                        {minKey ? (
                          <input
                            type="number"
                            value={String(form[minKey])}
                            onChange={e => set(minKey, e.target.value)}
                            style={{ ...rangeInputStyle, width: "100%" }}
                            step="0.1"
                          />
                        ) : (
                          <div />
                        )}
                        {/* Dash — shown only when both inputs exist */}
                        <span style={{
                          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                          fontSize: 11, color: "#9a958f",
                          textAlign: "center",
                          visibility: minKey && maxKey ? "visible" : "hidden",
                        }}>
                          –
                        </span>
                        {/* Max input or empty cell */}
                        {maxKey ? (
                          <input
                            type="number"
                            value={String(form[maxKey])}
                            onChange={e => set(maxKey, e.target.value)}
                            style={{ ...rangeInputStyle, width: "100%" }}
                            step="0.1"
                          />
                        ) : (
                          <div />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#991b1b", marginTop: 12 }}>
                {error}
              </p>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-end"
              style={{ borderTop: "0.5px solid #e5e2dc", paddingTop: 16, marginTop: 24, gap: 8 }}
            >
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 mr-auto"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: deleting ? "default" : "pointer",
                    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                    fontSize: 12,
                    color: deleting ? "#ccc" : "#991b1b",
                    padding: 0,
                  }}
                >
                  <Trash2 size={14} />
                  {deleting ? "Eliminando..." : "Eliminar estanque"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "0.5px solid #e5e2dc",
                  backgroundColor: "#ffffff",
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#3c3a36",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: saving ? "#9a958f" : "#1a6560",
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#f9f9f7",
                  cursor: saving ? "default" : "pointer",
                  transition: "background-color 150ms",
                }}
              >
                {saving ? "Guardando..." : "Guardar estanque"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
