import Link from "next/link"
import { Reveal } from "./Reveal"

export function CTA() {
  return (
    <section className="border-t-[0.5px] border-border px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto flex max-w-inner flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="max-w-[560px] text-balance text-[clamp(28px,4.2vw,44px)] font-medium leading-[1.1] text-text-primary">
            Empieza por registrar a tu colonia.
          </h2>
          <p className="mt-4 max-w-[460px] text-body-l text-text-secondary">
            Crea tu cuenta y carga tus primeros ejemplares. Si prefieres que alguien te acompañe,
            escríbenos.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link
            href="/auth/register"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-6 text-[13px] font-medium text-accent-text transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
          >
            Crear cuenta
          </Link>
          <a
            href="mailto:hello@amoxtli.tech"
            className="inline-flex h-11 items-center justify-center px-1 text-[13px] font-medium text-text-primary underline decoration-border underline-offset-4 transition-colors duration-150 hover:decoration-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
          >
            Escríbenos
          </a>
        </div>
      </Reveal>
    </section>
  )
}
