import { COLONIA_EJEMPLO, crearCalculadora, nivelRiesgo, formatoCoeficiente, type Nivel } from "@/src/lib/pedigree"
import { Reveal } from "./Reveal"

const HEMBRA = "A-11"
const calc = crearCalculadora(COLONIA_EJEMPLO)
const filas = Object.values(COLONIA_EJEMPLO)
  .filter((i) => i.sexo === "M" && !i.id.startsWith("F-"))
  .map((m) => ({ id: m.id, coef: calc.coeficienteCruza(HEMBRA, m.id) }))
  .map((f) => ({ ...f, nivel: nivelRiesgo(f.coef) }))
  .sort((a, b) => a.coef - b.coef)
const mejor = filas[0]

const ETIQUETA: Record<Nivel, { t: string; c: string }> = {
  bajo: { t: "Bajo", c: "bg-success-bg text-success" },
  precaucion: { t: "Precaución", c: "bg-warning-bg text-warning" },
  alto: { t: "Alto", c: "bg-error-bg text-error" },
}

export function AISection() {
  return (
    <section id="ai" className="border-t-[0.5px] border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-inner grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="text-balance text-[clamp(24px,3.4vw,36px)] font-medium leading-[1.15] text-text-primary">
            Pregúntale a tu colonia en lugar de buscar en tablas.
          </h2>
          <p className="mt-4 max-w-[460px] text-body-l text-text-secondary">
            Axo AI responde con los registros de tu refugio. Si una respuesta implica escribir un
            evento, te pide confirmación antes de guardarlo.
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="rounded-lg border-[0.5px] border-border bg-bg-card p-4 sm:p-6">
            <p className="mb-3 text-small text-text-secondary">Ejemplo con la colonia ficticia</p>
            <div className="mb-5 flex justify-end">
              <p className="max-w-[88%] rounded-md bg-accent-bg px-4 py-2.5 text-body text-text-primary">
                ¿Con qué macho puedo cruzar a {HEMBRA}?
              </p>
            </div>
            <p className="text-label text-accent">Axo AI</p>
            <p className="mt-1 mb-3 text-body text-text-secondary">
              {mejor.id} es la mejor opción ({formatoCoeficiente(mejor.coef)}). Estos son los tres machos
              disponibles:
            </p>
            <table className="w-full border-collapse overflow-hidden rounded-xs border-[0.5px] border-border text-left">
              <caption className="sr-only">Coeficiente de endogamia por macho para {HEMBRA}</caption>
              <thead>
                <tr className="bg-bg-app text-small text-text-secondary">
                  <th scope="col" className="px-3 py-2 font-normal">Macho</th>
                  <th scope="col" className="px-3 py-2 font-normal">Coeficiente</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-t-[0.5px] border-border">
                    <th scope="row" className="px-3 py-2 font-mono text-[12px] font-normal text-accent">{f.id}</th>
                    <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{formatoCoeficiente(f.coef)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-block rounded-xs px-2 py-1 text-small ${ETIQUETA[f.nivel].c}`}>
                        {ETIQUETA[f.nivel].t}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
