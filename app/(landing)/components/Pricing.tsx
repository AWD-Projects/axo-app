import Link from "next/link"
import { Check } from "lucide-react"
import { Reveal } from "./Reveal"

export const PLANES = [
  {
    nombre: "Esencial",
    precio: 890,
    items: ["Hasta 50 ejemplares", "Bitácora básica", "1 usuario"],
  },
  {
    nombre: "Estándar",
    precio: 1800,
    items: [
      "Hasta 200 ejemplares",
      "Reportes de UMA automáticos",
      "Módulo genético básico",
      "3 usuarios",
    ],
  },
  {
    nombre: "Avanzado",
    precio: 3500,
    items: [
      "Ejemplares ilimitados",
      "Axo AI Assistant",
      "Gestión de linajes profunda",
      "10 usuarios",
    ],
  },
] as const

const mxn = (n: number) => `$${n.toLocaleString("en-US")}`

export function Pricing() {
  return (
    <section id="planes" className="border-t-[0.5px] border-border bg-bg-subtle px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-inner">
        <Reveal>
          <h2 className="text-balance text-[clamp(24px,3.4vw,36px)] font-medium leading-[1.15] text-text-primary">
            Planes según el tamaño de tu colonia.
          </h2>
          <p className="mt-3 text-body-l text-text-secondary">Precios en pesos mexicanos, por mes.</p>
        </Reveal>

        <Reveal delay={0.05} className="mt-10 sm:mt-12">
          <ul className="grid grid-cols-1 overflow-hidden rounded-lg border-[0.5px] border-border bg-bg-card md:grid-cols-3">
            {PLANES.map((p) => (
              <li
                key={p.nombre}
                className="flex flex-col border-b-[0.5px] border-border p-6 last:border-b-0 sm:p-8 md:border-b-0 md:border-r-[0.5px] md:last:border-r-0"
              >
                <h3 className="text-h3 text-text-primary">{p.nombre}</h3>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-[34px] leading-none text-text-primary">
                    {mxn(p.precio)}
                  </span>
                  <span className="text-body text-text-secondary">MXN / mes</span>
                </p>
                <ul className="mt-6 mb-8 flex-1 space-y-3">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-body text-text-secondary">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-accent" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className="inline-flex h-11 items-center justify-center rounded-sm border-[0.5px] border-border text-[13px] font-medium text-text-primary transition-colors duration-150 hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
                >
                  Empezar con {p.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
