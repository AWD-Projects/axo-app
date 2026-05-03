"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Home, Layers, Fish, Activity, Calendar, GitBranch, Bell,
  FileText, ChevronsUpDown, Settings, LogOut,
  X, Plus, KeyRound, Check, Menu,
} from "lucide-react"
import { createClient } from "@/src/lib/supabase/client"
import { Logo } from "@/components/Logo"
import { Skeleton } from "@/components/ui/skeleton"
import { useRefugio, type RefugioItem } from "@/src/context/refugio-context"

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",              icon: Home,       label: "Inicio" },
  { href: "/dashboard/estanques",    icon: Layers,     label: "Estanques" },
  { href: "/dashboard/inventario",   icon: Fish,       label: "Inventario" },
  { href: "/dashboard/salud",        icon: Activity,   label: "Salud" },
  { href: "/dashboard/eventos",      icon: Calendar,   label: "Eventos" },
  { href: "/dashboard/reproduccion", icon: GitBranch,  label: "Reproducción" },
  { href: "/dashboard/alertas",      icon: Bell,       label: "Alertas", showBadge: true },
  { href: "/dashboard/reportes",     icon: FileText,   label: "Reportes" },
]

const TIPOS = [
  { value: "uma_registrada",        label: "UMA registrada ante SEMARNAT" },
  { value: "laboratorio_academico", label: "Laboratorio académico" },
  { value: "criadero_privado",      label: "Criadero privado" },
  { value: "chinampa_conservacion", label: "Chinampa de conservación" },
  { value: "acuario_publico",       label: "Acuario o zoológico público" },
]

const ESTADOS = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche",
  "Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Estado de México",
  "Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla",
  "Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora",
  "Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
]

const TIPO_LABELS: Record<string, string> = {
  uma_registrada:        "UMA SEMARNAT",
  laboratorio_academico: "Laboratorio",
  criadero_privado:      "Criadero",
  chinampa_conservacion: "Chinampa",
  acuario_publico:       "Acuario",
}

const ROL_LABELS: Record<string, string> = {
  admin:        "Administrador",
  tecnico:      "Técnico",
  investigador: "Investigador",
  estudiante:   "Estudiante",
  lectura:      "Solo lectura",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname.startsWith(href)
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0"
      style={{ width: 36, height: 20 }}
    >
      <motion.div
        className="absolute inset-0 rounded-[10px]"
        animate={{ backgroundColor: value ? "#1a6560" : "#e5e2dc" }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="absolute top-[2px] w-4 h-4 rounded-full bg-white"
        animate={{ left: value ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </motion.button>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#0d0d0d",
  border: "0.5px solid #e5e2dc",
  outline: "none",
  width: "100%",
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.border = "1.5px solid #1a6560"
  e.target.style.boxShadow = "0 0 0 2px #e2f0ee"
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.border = "0.5px solid #e5e2dc"
  e.target.style.boxShadow = "none"
}

// ── Logout modal ──────────────────────────────────────────────────────────────

function LogoutModal({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-[300]"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-[14px]"
            style={{ width: 360, padding: 24, boxShadow: "0 8px 32px rgba(13,13,13,0.12)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <LogOut size={24} strokeWidth={1.5} style={{ color: "#9a958f" }} />
            </div>
            <h2 className="mt-3 text-center text-[18px] font-medium" style={{ color: "#0d0d0d" }}>
              ¿Cerrar sesión?
            </h2>
            <p className="mt-1.5 text-center text-[13px]" style={{ color: "#9a958f" }}>
              Se cerrará tu sesión en este dispositivo.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button" onClick={onConfirm}
                className="w-full h-10 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
                style={{ backgroundColor: "#991b1b", color: "#ffffff" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7f1d1d")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#991b1b")}
              >
                Cerrar sesión
              </button>
              <button
                type="button" onClick={onClose}
                className="w-full h-10 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
                style={{ backgroundColor: "transparent", color: "#0d0d0d", border: "0.5px solid #e5e2dc" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f2ef")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Create refuge modal ───────────────────────────────────────────────────────

function CreateRefugeModal({ open, onClose, onSuccess }: {
  open: boolean
  onClose: () => void
  onSuccess: (newRefugioId: string) => void
}) {
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState("")
  const [registroUMA, setRegistroUMA] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [estado, setEstado] = useState("")
  const [reporteUMA, setReporteUMA] = useState(false)
  const [citesMovs, setCitesMovs] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isUMA = tipo === "uma_registrada"
  const canSubmit = !!nombre.trim() && !!tipo

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/refugios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(), tipo,
          numero_uma: registroUMA.trim() || undefined,
          ciudad: ciudad.trim() || undefined,
          estado_republica: estado || undefined,
          config_regulatoria: { uma_semarnat: reporteUMA, cites: citesMovs },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onClose()
        onSuccess(data.data.id)
      } else {
        setError(data.error ?? "Error al crear el refugio.")
      }
    } catch {
      setError("Error de conexión.")
    }
    setIsLoading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-[300]"
          style={{ backgroundColor: "rgba(13,13,13,0.32)", backdropFilter: "blur(2px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-[14px] overflow-y-auto"
            style={{ width: 520, maxHeight: "90vh", padding: 28, boxShadow: "0 8px 32px rgba(13,13,13,0.14)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[20px] font-medium" style={{ color: "#0d0d0d" }}>Crear nuevo refugio</h2>
                <p className="mt-1 text-[13px]" style={{ color: "#9a958f" }}>
                  Configura los datos básicos. Podrás editarlos después.
                </p>
              </div>
              <button
                type="button" onClick={onClose}
                style={{ color: "#9a958f", background: "none", border: "none", cursor: "pointer", padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0d0d0d")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "20px 0" }} />

            <form onSubmit={handleSubmit}>
              <div>
                <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
                  Nombre del refugio
                </label>
                <input
                  type="text" value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Colonia Ambystoma UNAM"
                  className="h-[42px] rounded-[8px] px-3 text-[13px] transition-all duration-150"
                  style={inputBase} onFocus={onFocus} onBlur={onBlur}
                />
              </div>

              <div className="mt-4">
                <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
                  Tipo de refugio
                </label>
                <select
                  value={tipo} onChange={(e) => setTipo(e.target.value)}
                  className="h-[42px] rounded-[8px] px-3 text-[13px] appearance-none transition-all duration-150"
                  style={{ ...inputBase, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}
                >
                  <option value="" disabled>Seleccionar tipo</option>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <AnimatePresence>
                {isUMA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden" }} className="mt-4"
                  >
                    <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
                      Número de registro UMA
                    </label>
                    <input
                      type="text" value={registroUMA}
                      onChange={(e) => setRegistroUMA(e.target.value)}
                      placeholder="UMA-MX-0000000"
                      className="h-[42px] rounded-[8px] px-3 text-[13px] transition-all duration-150"
                      style={inputBase} onFocus={onFocus} onBlur={onBlur}
                    />
                    <p className="mt-1.5 text-[11px]" style={{ color: "#9a958f" }}>
                      Lo encuentras en tu constancia SEMARNAT
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>Ciudad</label>
                  <input
                    type="text" value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Ciudad de México"
                    className="h-[42px] rounded-[8px] px-3 text-[13px] transition-all duration-150"
                    style={inputBase} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>Estado</label>
                  <select
                    value={estado} onChange={(e) => setEstado(e.target.value)}
                    className="h-[42px] rounded-[8px] px-3 text-[13px] appearance-none transition-all duration-150"
                    style={{ ...inputBase, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}
                  >
                    <option value="" disabled>Estado</option>
                    {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>
                  Configuración regulatoria
                </p>
                <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "10px 0" }} />
                <div className="flex items-start justify-between py-2.5" style={{ borderBottom: "0.5px solid #edeae4" }}>
                  <div>
                    <p className="text-[13px]" style={{ color: "#0d0d0d" }}>Reporte UMA trimestral</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "#9a958f" }}>
                      Genera PDF automático para SEMARNAT cada trimestre
                    </p>
                  </div>
                  <Toggle value={reporteUMA} onChange={setReporteUMA} />
                </div>
                <div className="flex items-start justify-between pt-2.5">
                  <div>
                    <p className="text-[13px]" style={{ color: "#0d0d0d" }}>Movimientos CITES</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "#9a958f" }}>
                      Para exportación internacional de individuos
                    </p>
                  </div>
                  <Toggle value={citesMovs} onChange={setCitesMovs} />
                </div>
              </div>

              {error && (
                <p className="mt-4 text-[12px]" style={{ color: "#991b1b" }}>{error}</p>
              )}

              <div className="flex justify-end gap-2 mt-6 pt-4" style={{ borderTop: "0.5px solid #e5e2dc" }}>
                <button
                  type="button" onClick={onClose}
                  className="px-5 h-[38px] rounded-[8px] text-[13px] font-medium transition-colors duration-150"
                  style={{ backgroundColor: "transparent", color: "#0d0d0d", border: "0.5px solid #e5e2dc" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f2ef")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={!canSubmit || isLoading}
                  className="px-5 h-[38px] rounded-[8px] text-[13px] font-medium flex items-center gap-2 transition-colors duration-150"
                  style={{
                    backgroundColor: canSubmit && !isLoading ? "#1a6560" : "#9a958f",
                    color: "#f9f9f7",
                    cursor: canSubmit && !isLoading ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={(e) => { if (canSubmit && !isLoading) e.currentTarget.style.backgroundColor = "#144f4b" }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = canSubmit && !isLoading ? "#1a6560" : "#9a958f" }}
                >
                  {isLoading ? "Creando..." : "Crear refugio"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Refuge dropdown ───────────────────────────────────────────────────────────

function RefugeDropdown({
  refugios,
  activeRefugioId,
  onSelect,
  onClose,
  onCreateNew,
}: {
  refugios: RefugioItem[]
  activeRefugioId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  onCreateNew: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="absolute z-[200]"
      style={{
        top: "calc(100% + 4px)", left: 0, width: 220,
        backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc",
        borderRadius: 12, padding: 6,
        boxShadow: "0 8px 24px rgba(13,13,13,0.10)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-2 pt-1 pb-2 text-[11px] font-medium" style={{ color: "#9a958f" }}>
        Mis refugios
      </p>

      {refugios.map((r) => {
        const active = r.id === activeRefugioId
        return (
          <button
            key={r.id} type="button"
            className="w-full flex items-center justify-between rounded-[8px] transition-colors duration-150"
            style={{ padding: "9px 10px" }}
            onClick={() => { onSelect(r.id); onClose() }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: active ? "#e2f0ee" : "#f3f2ef" }}
              >
                <Home size={13} color={active ? "#1a6560" : "#9a958f"} />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-medium" style={{ color: "#0d0d0d" }}>{r.nombre}</p>
                <p className="text-[10px]" style={{ color: "#9a958f" }}>
                  {TIPO_LABELS[r.tipo] ?? r.tipo} · {ROL_LABELS[r.rol] ?? r.rol}
                </p>
              </div>
            </div>
            {active && <Check size={14} color="#1a6560" />}
          </button>
        )
      })}

      <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "4px 0" }} />

      <button
        type="button"
        className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-2 transition-colors duration-150"
        onClick={() => { onClose(); onCreateNew() }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <Plus size={14} color="#1a6560" />
        <span className="text-[12px]" style={{ color: "#1a6560" }}>Crear nuevo refugio</span>
      </button>

      <button
        type="button"
        className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-2 transition-colors duration-150"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <KeyRound size={14} color="#9a958f" />
        <span className="text-[12px]" style={{ color: "#3c3a36" }}>Unirme con código</span>
      </button>
    </motion.div>
  )
}

// ── Dock content (shared between desktop + mobile drawer) ─────────────────────

function DockContent({
  pathname,
  alertCount,
  onLogout,
  onSettings,
}: {
  pathname: string
  alertCount: number
  onLogout: () => void
  onSettings: () => void
}) {
  const { user, refugios, activeRefugioId, activeRefugio, setActiveRefugio, refresh, loading } = useRefugio()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [dropdownOpen])

  return (
    <>
      {/* Brand + notifications */}
      <div style={{ padding: "16px 14px 12px" }}>
        <div className="flex items-center justify-between">
          <Logo variant="dark" size="sm" />
          <button
            type="button"
            className="relative flex items-center justify-center transition-colors duration-150"
            style={{ color: "#9a958f", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0d0d0d")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
          >
            <Bell size={16} strokeWidth={1.5} />
            {alertCount > 0 && (
              <span
                className="absolute rounded-full"
                style={{ width: 8, height: 8, backgroundColor: "#991b1b", top: -2, right: -2 }}
              />
            )}
          </button>
        </div>

        <div style={{ borderTop: "0.5px solid #e5e2dc", marginTop: 12 }} />

        {/* Refuge selector */}
        <div className="relative mt-2.5" ref={dropdownRef}>
          {loading ? (
            <div
              className="w-full flex items-center gap-2 rounded-[10px]"
              style={{ padding: "9px 12px", backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc" }}
            >
              <Skeleton style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0 }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton style={{ width: "70%", height: 11 }} />
                <Skeleton style={{ width: "40%", height: 9 }} />
              </div>
            </div>
          ) : (
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-[10px] transition-all duration-150 text-left"
            style={{ padding: "9px 12px", backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc", cursor: "pointer" }}
            onClick={() => setDropdownOpen((v) => !v)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f3f2ef"
              e.currentTarget.style.borderColor = "#d4d0ca"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f9f9f7"
              e.currentTarget.style.borderColor = "#e5e2dc"
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#e2f0ee" }}
            >
              <Home size={13} color="#1a6560" />
            </div>
            {activeRefugio ? (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "#0d0d0d" }}>
                  {activeRefugio.nombre}
                </p>
                <p className="text-[10px]" style={{ color: "#9a958f" }}>
                  {ROL_LABELS[activeRefugio.rol] ?? activeRefugio.rol}
                </p>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium" style={{ color: "#9a958f" }}>
                  Sin refugio seleccionado
                </p>
              </div>
            )}
            <ChevronsUpDown size={14} color="#9a958f" className="flex-shrink-0" />
          </button>
          )}

          <AnimatePresence>
            {dropdownOpen && (
              <RefugeDropdown
                refugios={refugios}
                activeRefugioId={activeRefugioId}
                onSelect={setActiveRefugio}
                onClose={() => setDropdownOpen(false)}
                onCreateNew={() => setCreateModalOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: 8 }}>
        <p
          className="uppercase tracking-[0.06em]"
          style={{ padding: "10px 8px 4px", fontSize: 10, fontWeight: 500, color: "#9a958f" }}
        >
          Módulos
        </p>
        <div className="flex flex-col" style={{ gap: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const badge = item.showBadge ? alertCount : undefined
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-[8px] transition-colors duration-150 no-underline"
                style={{
                  gap: 9,
                  padding: "8px 10px",
                  backgroundColor: active ? "#1a6560" : "transparent",
                  color: active ? "#f9f9f7" : "#3c3a36",
                  fontWeight: active ? 500 : 400,
                  fontSize: 12,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "#f9f9f7"
                    e.currentTarget.style.color = "#0d0d0d"
                    const navIcon = e.currentTarget.querySelector(".nav-icon") as HTMLElement | null
                    if (navIcon) navIcon.style.color = "#0d0d0d"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent"
                    e.currentTarget.style.color = "#3c3a36"
                  }
                }}
              >
                <item.icon
                  size={16}
                  strokeWidth={1.5}
                  style={{ color: active ? "#f9f9f7" : "#9a958f", flexShrink: 0 }}
                />
                <span className="flex-1">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                      fontSize: 10,
                      fontWeight: 500,
                      backgroundColor: active ? "rgba(255,255,255,0.18)" : "#fef2f2",
                      color: active ? "#f9f9f7" : "#991b1b",
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid #e5e2dc", padding: 8 }}>
        {/* User row */}
        <div
          className="mt-1.5 flex items-center justify-between rounded-[8px] transition-colors duration-150"
          style={{ padding: "8px 10px", cursor: "default" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div className="flex items-center gap-2">
            {loading ? (
              <Skeleton style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0 }} />
            ) : (
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 26, height: 26, backgroundColor: "#e2f0ee" }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: "#1a6560" }}>
                  {user?.initials ?? "–"}
                </span>
              </div>
            )}
            {loading ? (
              <Skeleton style={{ width: 80, height: 11 }} />
            ) : (
              <span className="text-[12px] font-medium truncate max-w-[100px]" style={{ color: "#0d0d0d" }}>
                {user?.nombre ?? "–"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button" onClick={onSettings}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9a958f", lineHeight: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0d0d0d")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
            >
              <Settings size={14} />
            </button>
            <button
              type="button" onClick={onLogout}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9a958f", lineHeight: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#991b1b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <CreateRefugeModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={async (newRefugioId) => {
          await refresh()
          setActiveRefugio(newRefugioId)
        }}
      />
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DockSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeRefugioId } = useRefugio()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (!activeRefugioId) return
    async function fetchAlerts() {
      const res = await fetch(`/api/refugios/${activeRefugioId}/alertas?solo_no_leidas=true&limit=1`)
      if (res.ok) {
        const json = await res.json()
        setAlertCount(json.no_leidas ?? 0)
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60_000)
    return () => clearInterval(interval)
  }, [activeRefugioId])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <>
      {/* ── Desktop floating dock ── */}
      <div
        className="hidden lg:flex flex-col overflow-hidden"
        style={{
          position: "fixed",
          left: 12, top: 12, bottom: 12,
          width: 220,
          backgroundColor: "#ffffff",
          border: "0.5px solid #e5e2dc",
          borderRadius: 14,
          boxShadow: "0 8px 40px rgba(13,13,13,0.14)",
          zIndex: 100,
        }}
      >
        <DockContent
          pathname={pathname}
          alertCount={alertCount}
          onLogout={() => setLogoutOpen(true)}
          onSettings={() => router.push("/dashboard/settings")}
        />
      </div>

      {/* ── Mobile topbar ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-4 z-[90]"
        style={{ height: 52, backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#0d0d0d", lineHeight: 0 }}
        >
          <Menu size={20} />
        </button>
        <Logo variant="dark" size="sm" />
        <button
          type="button"
          className="relative"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9a958f", lineHeight: 0 }}
        >
          <Bell size={18} strokeWidth={1.5} />
          {alertCount > 0 && (
            <span
              className="absolute rounded-full"
              style={{ width: 7, height: 7, backgroundColor: "#991b1b", top: 0, right: 0 }}
            />
          )}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-[110]"
              style={{ backgroundColor: "rgba(13,13,13,0.32)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed top-0 left-0 bottom-0 flex flex-col overflow-hidden z-[120]"
              style={{ width: 264, backgroundColor: "#ffffff", borderRight: "0.5px solid #e5e2dc" }}
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <DockContent
                pathname={pathname}
                alertCount={alertCount}
                onLogout={() => { setMobileOpen(false); setLogoutOpen(true) }}
                onSettings={() => { setMobileOpen(false); router.push("/dashboard/settings") }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Logout modal ── */}
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}
