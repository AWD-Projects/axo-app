import Link from "next/link"
import { Simulator } from "./Simulator"

export function Hero() {
  return (
    <section className="px-4 pt-[104px] pb-16 sm:px-6 sm:pt-[128px] sm:pb-24">
      <div className="mx-auto grid max-w-inner grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="lg:pt-6">
          <h1 className="text-balance text-[clamp(32px,5.2vw,56px)] font-medium leading-[1.08] text-text-primary">
            Sabe qué tan emparentada está una cruza antes de hacerla.
          </h1>
          <p className="mt-5 max-w-[460px] text-body-l text-text-secondary">
            Axo lleva la bitácora de tu refugio de ajolote, reconstruye el linaje de cada ejemplar y
            calcula el coeficiente de endogamia de cualquier pareja. Pruébalo con una
            colonia de ejemplo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/auth/register"
              className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-6 text-[13px] font-medium text-accent-text transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
            >
              Crear cuenta
            </Link>
            <Link
              href="#planes"
              className="inline-flex h-11 items-center justify-center px-1 text-[13px] font-medium text-text-primary underline decoration-border underline-offset-4 transition-colors duration-150 hover:decoration-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
            >
              Ver planes
            </Link>
          </div>
        </div>

        <Simulator />
      </div>
    </section>
  )
}
