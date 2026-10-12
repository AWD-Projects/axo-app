import { RANGOS_SEGUROS } from "@/src/lib/constants"
import { Reveal } from "./Reveal"

const mediciones = [
  { clave: "temperatura", nombre: "Temperatura", unidad: "°C", valor: 17.2 },
  { clave: "ph", nombre: "pH", unidad: "", valor: 7.4 },
  { clave: "amonio", nombre: "Amonio (TAN)", unidad: "mg/L", valor: 0.31 },
  { clave: "nitrito", nombre: "Nitrito", unidad: "mg/L", valor: 0.05 },
  { clave: "oxigeno", nombre: "Oxígeno disuelto", unidad: "mg/L", valor: 7.1 },
] as const

export function Bitacora() {
  return (
    <section className="border-t-[0.5px] border-border bg-bg-subtle px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-inner grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="lg:order-2">
          <h2 className="text-balance text-[clamp(24px,3.4vw,36px)] font-medium leading-[1.15] text-text-primary">
            Cada medición se compara con su rango seguro.
          </h2>
          <p className="mt-4 max-w-[460px] text-body-l text-text-secondary">
            Capturas temperatura, pH, amonio, nitrito y oxígeno. Axo marca lo que queda fuera del
            rango de referencia para Ambystoma mexicanum, para que lo veas el mismo día y no en el
            reporte.
          </p>
        </Reveal>

        <Reveal delay={0.05} className="lg:order-1">
          <div className="rounded-lg border-[0.5px] border-border bg-bg-card">
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-4 py-3 sm:px-5">
              <h3 className="text-h3 text-text-primary">Medición de agua</h3>
              <span className="rounded-xs bg-bg-subtle px-2 py-1 text-small text-text-secondary">
                Ejemplo
              </span>
            </div>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Mediciones de ejemplo contra su rango seguro</caption>
              <thead>
                <tr className="border-b-[0.5px] border-border text-small text-text-secondary">
                  <th scope="col" className="px-4 py-2 font-normal sm:px-5">Parámetro</th>
                  <th scope="col" className="px-2 py-2 text-right font-normal">Valor</th>
                  <th scope="col" className="hidden px-2 py-2 text-right font-normal sm:table-cell">Rango</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal sm:px-5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {mediciones.map((m) => {
                  const r = RANGOS_SEGUROS[m.clave]
                  const ok = m.valor >= r.min && m.valor <= r.max
                  return (
                    <tr key={m.clave} className="border-b-[0.5px] border-border last:border-0">
                      <th scope="row" className="px-4 py-3 text-body font-normal text-text-primary sm:px-5">
                        {m.nombre}
                      </th>
                      <td className="px-2 py-3 text-right font-mono text-[12px] text-text-primary">
                        {m.valor}
                        {m.unidad && <span className="ml-1 text-text-secondary">{m.unidad}</span>}
                      </td>
                      <td className="hidden px-2 py-3 text-right font-mono text-[12px] text-text-secondary sm:table-cell">
                        {r.min}–{r.max}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <span
                          className={`inline-block whitespace-nowrap rounded-xs px-2 py-1 text-small ${
                            ok ? "bg-success-bg text-success" : "bg-error-bg text-error"
                          }`}
                        >
                          {ok ? "En rango" : "Fuera de rango"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
