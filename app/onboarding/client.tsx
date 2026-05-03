"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useAnimate } from "framer-motion"
import { Check, PlusCircle, KeyRound, Mail, CircleCheck, Loader2, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react"
import { createClient } from "@/src/lib/supabase/client"
import { Logo } from "@/components/Logo"

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = "choose" | "code" | "create" | "success"
type CardOption = "create" | "code" | null
type CodeStatus = "idle" | "checking" | "valid" | "invalid"

interface SuccessData {
  refugioNombre: string
  refugioTipo: string
  rol: string
  path: "create" | "join"
}

interface CodePreview {
  nombre: string
  tipo: string
  ciudad: string
  estado_republica: string
  rol: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: "uma_registrada", label: "UMA registrada ante SEMARNAT" },
  { value: "laboratorio_academico", label: "Laboratorio académico" },
  { value: "criadero_privado", label: "Criadero privado" },
  { value: "chinampa_conservacion", label: "Chinampa de conservación" },
  { value: "acuario_publico", label: "Acuario o zoológico público" },
]

const ESTADOS = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche",
  "Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Estado de México",
  "Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla",
  "Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora",
  "Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
]

function tipoLabel(value: string) {
  return TIPOS.find((t) => t.value === value)?.label ?? value
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Onboarding persistence ─────────────────────────────────────────────────────

const STORAGE_KEY = "axo_onboarding_v2"

interface SavedOnboarding {
  screen?: Screen
  selectedCard?: CardOption
  code?: string
  createForm?: {
    nombre: string
    tipo: string
    registroUMA: string
    ciudad: string
    estado: string
    reporteUMA: boolean
    citesMovs: boolean
    responsable: string
  }
}

function loadSaved(): SavedOnboarding {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? {}
  } catch {
    return {}
  }
}

function savePart(update: Partial<SavedOnboarding>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSaved(), ...update }))
  } catch {}
}

function clearSaved() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
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

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEP_LABELS = ["Tu cuenta", "Tu refugio", "Listo"]

function ProgressBar({ screen }: { screen: Screen }) {
  const stepIndex =
    screen === "choose" ? 0 : screen === "code" || screen === "create" ? 1 : 2

  return (
    <div className="flex justify-center px-5 sm:px-12 pt-4 pb-5 flex-shrink-0">
      <div className="w-full max-w-[480px] flex gap-2">
        {STEP_LABELS.map((label, i) => {
          const isDone = i < stepIndex
          const isActive = i === stepIndex
          return (
            <div key={i} className="flex-1 flex flex-col gap-2">
              <motion.div
                className="w-full h-[3px] rounded-full"
                animate={{
                  backgroundColor: isDone ? "#15803d" : isActive ? "#1a6560" : "#e5e2dc",
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              <span
                className="text-[11px] text-center"
                style={{
                  color: isActive ? "#0d0d0d" : isDone ? "#9a958f" : "#c4c0bb",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div
      className="flex items-center justify-between px-5 sm:px-12 h-[52px] flex-shrink-0"
      style={{ borderBottom: "0.5px solid #e5e2dc", backgroundColor: "#f9f9f7" }}
    >
      <Logo variant="dark" size="sm" />
      <span className="hidden sm:block text-[12px]" style={{ color: "#9a958f" }}>
        ¿Necesitas ayuda?{" "}
        <span style={{ color: "#9a958f" }}>axo@amoxtli.tech</span>
      </span>
    </div>
  )
}

// ── Input styles ──────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#0d0d0d",
  border: "0.5px solid #e5e2dc",
  outline: "none",
  width: "100%",
}

function onInputFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.border = "1.5px solid #1a6560"
  e.target.style.boxShadow = "0 0 0 2px #e2f0ee"
}
function onInputBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.border = "0.5px solid #e5e2dc"
  e.target.style.boxShadow = "none"
}

// ── Screen 06 — Choose ────────────────────────────────────────────────────────

function ChooseScreen({
  userName,
  selected,
  setSelected,
  onContinue,
}: {
  userName: string
  selected: CardOption
  setSelected: (v: CardOption) => void
  onContinue: () => void
}) {
  const cards: { id: CardOption; icon: React.ReactNode; title: string; desc: string; tag: string; tagStyle: React.CSSProperties }[] = [
    {
      id: "create",
      icon: <PlusCircle size={24} strokeWidth={1.75} color="#1a6560" />,
      title: "Crear un refugio",
      desc: "Soy administrador o quiero registrar mi propio refugio.",
      tag: "Tu rol: Administrador",
      tagStyle: { backgroundColor: "#e2f0ee", color: "#1a6560" },
    },
    {
      id: "code",
      icon: <KeyRound size={24} strokeWidth={1.75} color="#1a6560" />,
      title: "Tengo un código de refugio",
      desc: "El administrador de un refugio me compartió un código de acceso.",
      tag: "Rol asignado por el código",
      tagStyle: { backgroundColor: "#f3f2ef", color: "#9a958f" },
    },
  ]

  return (
    <div>
      <div className="text-center">
        <h1 className="text-[36px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
          Hola, {userName}.
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.6]" style={{ color: "#9a958f" }}>
          Para empezar, crea tu primer refugio<br />o únete a uno existente.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const isSelected = selected === card.id
          return (
            <motion.button
              key={card.id}
              type="button"
              onClick={() => setSelected(card.id)}
              className="relative text-left rounded-[14px] p-8 transition-all duration-150"
              style={{
                backgroundColor: "#ffffff",
                border: isSelected ? "1.5px solid #1a6560" : "0.5px solid #e5e2dc",
              }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#1a6560" }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#e5e2dc" }}
            >
              {/* Selected badge */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#1a6560" }}
                  >
                    <Check size={10} strokeWidth={2.5} color="#f9f9f7" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center text-center">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: "#f9f9f7" }}
                >
                  {card.icon}
                </div>
                <p className="mt-4 text-[16px] font-medium" style={{ color: "#0d0d0d" }}>
                  {card.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: "#9a958f" }}>
                  {card.desc}
                </p>
                <span
                  className="mt-3 inline-block px-2.5 py-[3px] rounded-[6px] text-[11px] font-medium"
                  style={card.tagStyle}
                >
                  {card.tag}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Separator + notice */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ backgroundColor: "#e5e2dc" }} />
        <span className="text-[12px] px-2" style={{ color: "#9a958f", backgroundColor: "#f9f9f7" }}>o</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#e5e2dc" }} />
      </div>
      <div className="mt-3 flex items-start justify-center gap-1.5" style={{ color: "#9a958f" }}>
        <Mail size={14} strokeWidth={1.75} />
        <p className="text-[12px] leading-[1.5] text-center">
          ¿Tienes un enlace de invitación? Ábrelo directamente desde tu correo.
        </p>
      </div>

      <motion.button
        type="button"
        onClick={onContinue}
        disabled={!selected}
        whileTap={selected ? { scale: 0.97 } : {}}
        className="mt-8 w-full h-11 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
        style={{
          backgroundColor: selected ? "#1a6560" : "#e5e2dc",
          color: selected ? "#f9f9f7" : "#9a958f",
          cursor: selected ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => { if (selected) e.currentTarget.style.backgroundColor = "#144f4b" }}
        onMouseLeave={(e) => { if (selected) e.currentTarget.style.backgroundColor = "#1a6560" }}
      >
        <span className="flex items-center justify-center gap-2">Continuar <ArrowRight size={14} /></span>
      </motion.button>
    </div>
  )
}

// ── Screen 07 — Join by code ──────────────────────────────────────────────────

function CodeScreen({
  code,
  setCode,
  codeStatus,
  codePreview,
  isLoading,
  onSubmit,
  onBack,
}: {
  code: string
  setCode: (v: string) => void
  codeStatus: CodeStatus
  codePreview: CodePreview | null
  isLoading: boolean
  onSubmit: () => void
  onBack: () => void
}) {
  const isInvalid = codeStatus === "invalid"
  const isValid = codeStatus === "valid"

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[12px] transition-colors duration-150"
        style={{ color: "#9a958f", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#3c3a36")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
      >
        <ArrowLeft size={13} /> Volver
      </button>

      <div className="text-center">
        <h1 className="text-[32px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
          Ingresa tu código de refugio
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.6]" style={{ color: "#9a958f" }}>
          El administrador de tu refugio te compartió este código.
        </p>
      </div>

      <div className="mt-8">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CIBAC-2026"
          className="w-full rounded-[10px] text-center transition-all duration-150"
          style={{
            ...inputBase,
            height: 64,
            padding: "0 20px",
            fontSize: 24,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 500,
            letterSpacing: "0.15em",
            border: isInvalid ? "1.5px solid #fca5a5" : "0.5px solid #e5e2dc",
            backgroundColor: isInvalid ? "#fff8f8" : "#ffffff",
          }}
          onFocus={(e) => {
            if (!isInvalid) {
              e.target.style.border = "1.5px solid #1a6560"
              e.target.style.boxShadow = "0 0 0 2px #e2f0ee"
            }
          }}
          onBlur={(e) => {
            if (!isInvalid) {
              e.target.style.border = "0.5px solid #e5e2dc"
              e.target.style.boxShadow = "none"
            }
          }}
        />
        <div className="mt-2 text-center">
          {isInvalid ? (
            <p className="text-[11px]" style={{ color: "#991b1b" }}>Código no válido o inactivo.</p>
          ) : codeStatus === "checking" ? (
            <p className="text-[11px] flex items-center justify-center gap-1.5" style={{ color: "#9a958f" }}>
              <Loader2 size={12} className="animate-spin" /> Verificando...
            </p>
          ) : (
            <p className="text-[11px]" style={{ color: "#9a958f" }}>
              Los códigos distinguen mayúsculas y minúsculas
            </p>
          )}
        </div>

        {/* Preview card */}
        <AnimatePresence>
          {isValid && codePreview && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="mt-5 rounded-[10px] p-5"
              style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
            >
              <div className="flex items-center gap-1.5" style={{ color: "#15803d" }}>
                <CircleCheck size={14} strokeWidth={2} color="#15803d" />
                <span className="text-[12px] font-medium">Refugio encontrado</span>
              </div>
              <div className="my-3" style={{ borderTop: "0.5px solid #e5e2dc" }} />
              <p className="text-[18px] font-medium" style={{ color: "#0d0d0d" }}>{codePreview.nombre}</p>
              <p className="mt-1 text-[12px]" style={{ color: "#9a958f" }}>
                {tipoLabel(codePreview.tipo)} · {codePreview.ciudad}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px]" style={{ color: "#9a958f" }}>Tu rol en este refugio</span>
                <span
                  className="px-2.5 py-[3px] rounded-[6px] text-[11px] font-medium"
                  style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}
                >
                  {cap(codePreview.rol)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || isLoading}
        whileTap={isValid && !isLoading ? { scale: 0.97 } : {}}
        className="mt-6 w-full h-11 rounded-[8px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors duration-150"
        style={{
          backgroundColor: isValid && !isLoading ? "#1a6560" : "#e5e2dc",
          color: isValid && !isLoading ? "#f9f9f7" : "#9a958f",
          cursor: isValid && !isLoading ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => { if (isValid && !isLoading) e.currentTarget.style.backgroundColor = "#144f4b" }}
        onMouseLeave={(e) => { if (isValid && !isLoading) e.currentTarget.style.backgroundColor = "#1a6560" }}
      >
        {isLoading ? <><Loader2 size={15} className="animate-spin" /> Uniéndome...</> : <><span>Unirme al refugio</span><ArrowRight size={14} /></>}
      </motion.button>
    </div>
  )
}

// ── Screen 08 — Create refuge ─────────────────────────────────────────────────

function CreateScreen({
  onSubmit,
  onBack,
}: {
  onSubmit: (data: {
    nombre: string
    tipo: string
    numero_uma: string
    ciudad: string
    estado_republica: string
    config_regulatoria: Record<string, boolean>
    responsable_tecnico: string
  }) => Promise<string | null>
  onBack: () => void
}) {
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState("")
  const [registroUMA, setRegistroUMA] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [estado, setEstado] = useState("")
  const [reporteUMA, setReporteUMA] = useState(false)
  const [citesMovs, setCitesMovs] = useState(false)
  const [responsable, setResponsable] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [apiError, setApiError] = useState("")
  const [formRef, animateForm] = useAnimate()

  // Restore form state after hydration
  useEffect(() => {
    const saved = loadSaved().createForm
    if (!saved) return
    setNombre(saved.nombre)
    setTipo(saved.tipo)
    setRegistroUMA(saved.registroUMA)
    setCiudad(saved.ciudad)
    setEstado(saved.estado)
    setReporteUMA(saved.reporteUMA)
    setCitesMovs(saved.citesMovs)
    setResponsable(saved.responsable)
  }, [])

  // Persist form state on change
  useEffect(() => {
    savePart({ createForm: { nombre, tipo, registroUMA, ciudad, estado, reporteUMA, citesMovs, responsable } })
  }, [nombre, tipo, registroUMA, ciudad, estado, reporteUMA, citesMovs, responsable])

  const isUMA = tipo === "uma_registrada"
  const canSubmit = !!nombre.trim() && !!tipo

  const nombreError = submitted && !nombre.trim()
  const tipoError = submitted && !tipo

  function shake() {
    animateForm(formRef.current, { x: [0, -6, 6, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
  }

  function inputStyle(hasError: boolean): React.CSSProperties {
    return { ...inputBase, border: hasError ? "1.5px solid #991b1b" : "0.5px solid #e5e2dc" }
  }

  function onFocusField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, hasError: boolean) {
    e.target.style.border = hasError ? "1.5px solid #991b1b" : "1.5px solid #1a6560"
    e.target.style.boxShadow = hasError ? "0 0 0 2px #fee2e2" : "0 0 0 2px #e2f0ee"
  }

  function onBlurField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, hasError: boolean) {
    e.target.style.border = hasError ? "1.5px solid #991b1b" : "0.5px solid #e5e2dc"
    e.target.style.boxShadow = "none"
  }

  function clearApiError() { setApiError("") }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!canSubmit) { shake(); return }
    setIsLoading(true)
    setApiError("")
    const error = await onSubmit({
      nombre: nombre.trim(),
      tipo,
      numero_uma: registroUMA.trim(),
      ciudad: ciudad.trim(),
      estado_republica: estado,
      config_regulatoria: { reporte_uma_trimestral: reporteUMA, movimientos_cites: citesMovs },
      responsable_tecnico: responsable.trim(),
    })
    if (error) {
      setApiError(error)
      shake()
    }
    setIsLoading(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[12px] transition-colors duration-150"
        style={{ color: "#9a958f", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#3c3a36")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
      >
        <ArrowLeft size={13} /> Volver
      </button>

      <div className="text-center">
        <h1 className="text-[32px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
          Configura tu refugio
        </h1>
        <p className="mt-2.5 text-[14px] leading-[1.6]" style={{ color: "#9a958f" }}>
          Puedes editar estos datos en cualquier momento desde la configuración.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8">
        {/* Nombre */}
        <div className="mb-4">
          <label className="block mb-1.5 text-[12px] font-medium" style={{ color: nombreError ? "#991b1b" : "#0d0d0d" }}>
            Nombre del refugio {nombreError && <span className="font-normal">— requerido</span>}
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); clearApiError() }}
            placeholder="Ej. Colonia Ambystoma IB-UNAM"
            className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150"
            style={inputStyle(nombreError)}
            onFocus={(e) => onFocusField(e, nombreError)}
            onBlur={(e) => onBlurField(e, nombreError)}
          />
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className="block mb-1.5 text-[12px] font-medium" style={{ color: tipoError ? "#991b1b" : "#0d0d0d" }}>
            Tipo de refugio {tipoError && <span className="font-normal">— requerido</span>}
          </label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); clearApiError() }}
            className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150 appearance-none"
            style={{ ...inputStyle(tipoError), cursor: "pointer" }}
            onFocus={(e) => onFocusField(e, tipoError)}
            onBlur={(e) => onBlurField(e, tipoError)}
          >
            <option value="" disabled>Seleccionar tipo</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Número UMA — conditional */}
        <AnimatePresence>
          {isUMA && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
              className="mb-4"
            >
              <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
                Número de registro UMA
              </label>
              <input
                type="text"
                value={registroUMA}
                onChange={(e) => setRegistroUMA(e.target.value)}
                placeholder="UMA-MX-0000000"
                className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150"
                style={inputBase}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
              />
              <p className="mt-1.5 text-[11px]" style={{ color: "#9a958f" }}>
                Lo encuentras en tu constancia de registro SEMARNAT
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ciudad + Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>Ciudad</label>
            <input
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ciudad de México"
              className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150"
              style={inputBase}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
          </div>
          <div>
            <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150 appearance-none"
              style={{ ...inputBase, cursor: "pointer" }}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            >
              <option value="" disabled>Estado</option>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Regulatory config */}
        <div
          className="rounded-[10px] p-5 mb-6"
          style={{ border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>
            Configuración regulatoria
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: "#9a958f" }}>
            Determina qué reportes aplican para tu refugio.
          </p>
          <div className="mt-3.5" style={{ borderTop: "0.5px solid #e5e2dc" }} />

          <div className="mt-3.5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px]" style={{ color: "#0d0d0d" }}>Reporte UMA trimestral (SEMARNAT)</p>
              <p className="mt-0.5 text-[11px] leading-[1.4]" style={{ color: "#9a958f" }}>
                Para UMAs registradas. Generación automática cada trimestre.
              </p>
            </div>
            <Toggle value={reporteUMA} onChange={setReporteUMA} />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px]" style={{ color: "#0d0d0d" }}>Movimientos CITES</p>
              <p className="mt-0.5 text-[11px] leading-[1.4]" style={{ color: "#9a958f" }}>
                Para exportación o importación internacional de individuos.
              </p>
            </div>
            <Toggle value={citesMovs} onChange={setCitesMovs} />
          </div>
        </div>

        {/* Responsable */}
        <div className="mb-4">
          <label className="block mb-1.5 text-[12px] font-medium" style={{ color: "#0d0d0d" }}>
            Responsable técnico
          </label>
          <input
            type="text"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Nombre del responsable o investigador principal"
            className="h-11 rounded-[8px] px-3 text-[13px] transition-all duration-150"
            style={inputBase}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        {/* API error banner */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
              className="mt-4"
            >
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] text-[13px]"
                role="alert"
                style={{ backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}
              >
                <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={isLoading}
          whileTap={!isLoading ? { scale: 0.97 } : {}}
          className="mt-6 w-full h-11 rounded-[8px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors duration-200"
          style={{
            backgroundColor: canSubmit && !isLoading ? "#1a6560" : "#9a958f",
            color: "#f9f9f7",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => { if (canSubmit && !isLoading) e.currentTarget.style.backgroundColor = "#144f4b" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = canSubmit && !isLoading ? "#1a6560" : "#9a958f" }}
        >
          {isLoading
            ? <><Loader2 size={15} className="animate-spin" /> Creando refugio...</>
            : <><span>Crear refugio</span><ArrowRight size={14} /></>}
        </motion.button>
      </form>
    </div>
  )
}

// ── Screen 09 — Success ───────────────────────────────────────────────────────

const NEXT_STEPS = [
  { n: 1, title: "Agrega tu primer estanque", sub: "Define las unidades físicas de tu refugio." },
  { n: 2, title: "Registra tus primeros ajolotes", sub: "Crea el inventario inicial de tu colonia." },
  { n: 3, title: "Invita a tu equipo", sub: "Agrega técnicos e investigadores al refugio." },
]

function SuccessScreen({ data, onDashboard }: { data: SuccessData; onDashboard: () => void }) {
  return (
    <div className="max-w-[480px] mx-auto">
      <div className="flex justify-center">
        <motion.div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#e2f0ee" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Check size={32} strokeWidth={2.5} color="#1a6560" />
        </motion.div>
      </div>

      <h1 className="mt-6 text-center text-[40px] font-medium tracking-[-0.02em]" style={{ color: "#0d0d0d" }}>
        Todo listo.
      </h1>

      <p className="mt-3 text-center text-[16px] leading-[1.6]" style={{ color: "#9a958f" }}>
        {data.path === "create"
          ? <>Tu refugio &ldquo;{data.refugioNombre}&rdquo; está listo.<br />Eres el administrador.</>
          : <>Te uniste a &ldquo;{data.refugioNombre}&rdquo;<br />como {cap(data.rol)}.</>
        }
      </p>

      {/* Summary card */}
      <div
        className="mt-8 rounded-[10px]"
        style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc" }}
      >
        {[
          { label: "Refugio", value: <span className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>{data.refugioNombre}</span> },
          { label: "Tipo", value: <span className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>{tipoLabel(data.refugioTipo)}</span> },
          {
            label: "Tu rol",
            value: (
              <span className="px-2.5 py-[3px] rounded-[6px] text-[11px] font-medium" style={{ backgroundColor: "#e2f0ee", color: "#1a6560" }}>
                {cap(data.rol)}
              </span>
            ),
          },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: i < arr.length - 1 ? "0.5px solid #edeae4" : "none" }}
          >
            <span className="text-[12px]" style={{ color: "#9a958f" }}>{row.label}</span>
            {row.value}
          </div>
        ))}
      </div>

      {/* Next steps */}
      <div className="mt-6">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "#9a958f" }}
        >
          Tus próximos pasos
        </p>
        <div className="mt-3 space-y-2">
          {NEXT_STEPS.map((step) => (
            <div
              key={step.n}
              className="flex items-center gap-3 rounded-[8px] px-4 py-3"
              style={{ backgroundColor: "#f9f9f7" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#e2f0ee" }}
              >
                <span className="text-[11px] font-medium" style={{ fontFamily: "'DM Mono', monospace", color: "#1a6560" }}>
                  {step.n}
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "#0d0d0d" }}>{step.title}</p>
                <p className="text-[11px]" style={{ color: "#9a958f" }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onDashboard}
        whileTap={{ scale: 0.97 }}
        className="mt-8 w-full h-12 rounded-[8px] text-[14px] font-medium transition-colors duration-150"
        style={{ backgroundColor: "#1a6560", color: "#f9f9f7" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#144f4b")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1a6560")}
      >
        <span className="flex items-center justify-center gap-2">Ir al dashboard <ArrowRight size={14} /></span>
      </motion.button>

      <p className="mt-3 text-center text-[12px]" style={{ color: "#9a958f" }}>
        También puedes explorar desde el dashboard
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OnboardingClient() {
  const router = useRouter()

  const [screen, setScreen] = useState<Screen>("choose")
  const [userName, setUserName] = useState("Usuario")
  const [selectedCard, setSelectedCard] = useState<CardOption>(null)

  // Screen 07
  const [code, setCode] = useState("")
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle")
  const [codePreview, setCodePreview] = useState<CodePreview | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)

  // Screen 09
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  // Restore navigation state after hydration
  useEffect(() => {
    const saved = loadSaved()
    if (saved.screen && saved.screen !== "success") setScreen(saved.screen)
    if (saved.selectedCard !== undefined) setSelectedCard(saved.selectedCard)
    if (saved.code) setCode(saved.code)
  }, [])

  // Persist navigation state on change
  useEffect(() => { savePart({ screen, selectedCard, code }) }, [screen, selectedCard, code])

  // Fetch user name on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.nombre ?? user?.email?.split("@")[0] ?? "Usuario"
      setUserName(name)
    })
  }, [])

  // Debounced code lookup
  useEffect(() => {
    const trimmed = code.trim()
    if (!trimmed) {
      setCodeStatus("idle")
      setCodePreview(null)
      return
    }
    setCodeStatus("checking")
    setCodePreview(null)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/refugios/join-by-code?code=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setCodeStatus("valid")
          setCodePreview(data.data)
        } else {
          setCodeStatus("invalid")
        }
      } catch {
        setCodeStatus("invalid")
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [code])

  function handleContinueChoose() {
    if (!selectedCard) return
    setScreen(selectedCard === "create" ? "create" : "code")
  }

  async function handleJoinByCode() {
    if (!codePreview) return
    setJoinLoading(true)
    try {
      const res = await fetch("/api/refugios/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: code.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        clearSaved()
        setSuccessData({
          refugioNombre: codePreview.nombre,
          refugioTipo: codePreview.tipo,
          rol: codePreview.rol,
          path: "join",
        })
        setScreen("success")
      } else {
        setCodeStatus("invalid")
        setCodePreview(null)
        console.error(data.error)
      }
    } catch {
      setCodeStatus("invalid")
    }
    setJoinLoading(false)
  }

  async function handleCreateRefugio(formData: {
    nombre: string
    tipo: string
    numero_uma: string
    ciudad: string
    estado_republica: string
    config_regulatoria: Record<string, boolean>
    responsable_tecnico: string
  }): Promise<string | null> {
    try {
      const res = await fetch("/api/refugios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        clearSaved()
        setSuccessData({
          refugioNombre: formData.nombre,
          refugioTipo: formData.tipo,
          rol: "admin",
          path: "create",
        })
        setScreen("success")
        return null
      }
      return data.error ?? "Error al crear el refugio. Intenta de nuevo."
    } catch {
      return "Error de conexión. Verifica tu internet e intenta de nuevo."
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f9f9f7" }}>
      <TopBar />
      <ProgressBar screen={screen} />

      <div className="flex-1 flex justify-center px-6 pb-16">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            {screen === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ChooseScreen
                  userName={userName}
                  selected={selectedCard}
                  setSelected={setSelectedCard}
                  onContinue={handleContinueChoose}
                />
              </motion.div>
            )}

            {screen === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <CodeScreen
                  code={code}
                  setCode={setCode}
                  codeStatus={codeStatus}
                  codePreview={codePreview}
                  isLoading={joinLoading}
                  onSubmit={handleJoinByCode}
                  onBack={() => setScreen("choose")}
                />
              </motion.div>
            )}

            {screen === "create" && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <CreateScreen
                  onSubmit={handleCreateRefugio}
                  onBack={() => setScreen("choose")}
                />
              </motion.div>
            )}

            {screen === "success" && successData && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <SuccessScreen
                  data={successData}
                  onDashboard={() => router.push("/dashboard")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}
