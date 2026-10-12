"use client"

import { useId, useMemo, useState } from "react"
import {
  COLONIA_EJEMPLO,
  crearCalculadora,
  describirRelacion,
  nivelRiesgo,
  formatoCoeficiente,
  type Nivel,
} from "@/src/lib/pedigree"
import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"
import { PedigreeDiagram } from "./PedigreeDiagram"

const ids = Object.keys(COLONIA_EJEMPLO).filter((i) => !i.startsWith("F-"))
const HEMBRAS = ids.filter((i) => COLONIA_EJEMPLO[i].sexo === "F")
const MACHOS = ids.filter((i) => COLONIA_EJEMPLO[i].sexo === "M")

const NIVEL: Record<Nivel, { etiqueta: string; clase: string; nota: string }> = {
  bajo: {
    etiqueta: "Riesgo bajo",
    clase: "bg-success-bg text-success",
    nota: "Puedes planear esta cruza.",
  },
  precaucion: {
    etiqueta: "Precaución",
    clase: "bg-warning-bg text-warning",
    nota: "Hay parentesco. Revisa otras opciones antes de decidir.",
  },
  alto: {
    etiqueta: "Riesgo alto",
    clase: "bg-error-bg text-error",
    nota: "Cruza muy emparentada. Busca otra pareja.",
  },
}

function Opciones({
  legend,
  name,
  valores,
  actual,
  onChange,
}: {
  legend: string
  name: string
  valores: string[]
  actual: string
  onChange: (v: string) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-label text-text-secondary mb-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {valores.map((v) => (
          <label key={v} className="relative">
            <input
              type="radio"
              name={name}
              value={v}
              checked={actual === v}
              onChange={() => onChange(v)}
              className="peer sr-only"
            />
            <span
              className="flex h-10 sm:h-9 min-w-[64px] items-center justify-center rounded-sm border-[0.5px] border-border bg-bg-card px-3 font-mono text-[12px] text-text-secondary cursor-pointer transition-colors duration-150 motion-reduce:transition-none hover:bg-bg-subtle peer-checked:border-accent peer-checked:bg-accent-bg peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-card"
            >
              {v}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Simulator() {
  const uid = useId()
  const [hembra, setHembra] = useState("A-11")
  const [macho, setMacho] = useState("A-12")

  const calc = useMemo(() => crearCalculadora(COLONIA_EJEMPLO), [])
  const coef = calc.coeficienteCruza(hembra, macho)
  const nivel = nivelRiesgo(coef)
  const relacion = describirRelacion(COLONIA_EJEMPLO, hembra, macho, coef)
  const info = NIVEL[nivel]

  return (
    <section
      aria-labelledby={`${uid}-t`}
      className="rounded-lg border-[0.5px] border-border bg-bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-border px-4 py-3 sm:px-5">
        <h2 id={`${uid}-t`} className="text-h3 text-text-primary">
          Simulador de cruza
        </h2>
        <span className="rounded-xs bg-bg-subtle px-2 py-1 text-small text-text-secondary">
          Colonia de ejemplo
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <Opciones
          legend="Hembra"
          name={`${uid}-h`}
          valores={HEMBRAS}
          actual={hembra}
          onChange={setHembra}
        />
        <Opciones
          legend="Macho"
          name={`${uid}-m`}
          valores={MACHOS}
          actual={macho}
          onChange={setMacho}
        />
      </div>

      <div
        className="border-y-[0.5px] border-border bg-bg-app px-4 py-4 sm:px-5"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-small text-text-secondary mb-1">Coeficiente de endogamia de la cría</p>
        <div className="flex items-center justify-between gap-4">
          <p
            key={`${hembra}-${macho}`}
            className="font-mono text-[40px] leading-none text-text-primary animate-in fade-in duration-200 motion-reduce:animate-none"
          >
            {formatoCoeficiente(coef)}
          </p>
          <span className={`rounded-xs px-2 py-1 text-label ${info.clase}`}>{info.etiqueta}</span>
        </div>
        <p className="mt-3 text-body text-text-secondary">
          {relacion}. {info.nota}
        </p>
      </div>

      <div className="px-3 pt-4 pb-3 sm:px-5">
        <div className="mx-auto max-w-[460px]">
          <PedigreeDiagram pedigri={COLONIA_EJEMPLO} hembra={hembra} macho={macho} />
        </div>
        <p className="sr-only">
          Genealogía de {hembra} y {macho}. {relacion}. Coeficiente {formatoCoeficiente(coef)}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-text-secondary">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-5 rounded-full border-[0.5px] border-text-disabled" aria-hidden="true" />
            Hembra
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-4 rounded-xs border-[0.5px] border-text-disabled" aria-hidden="true" />
            Macho
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-4 rounded-xs bg-accent" aria-hidden="true" />
            Ancestro en común
          </span>
        </div>
      </div>

      <p className="border-t-[0.5px] border-border px-4 py-3 text-small text-text-secondary sm:px-5">
        Animales ficticios. Precaución desde {COEFICIENTE_UMBRAL.warning} y riesgo alto desde{" "}
        {COEFICIENTE_UMBRAL.danger}.
      </p>
    </section>
  )
}
