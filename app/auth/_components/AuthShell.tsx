import Link from "next/link"
import { Logo } from "@/components/Logo"
import { PedigreeDiagram } from "@/app/(landing)/components/PedigreeDiagram"
import { COLONIA_EJEMPLO } from "@/src/lib/pedigree"

export function AuthShell({
  titulo,
  texto,
  pasos,
  children,
}: {
  titulo: string
  texto: string
  pasos?: { label: string; activo: boolean }[]
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-bg-app">
      <aside className="hidden w-[45%] max-w-[640px] flex-col justify-between border-r-[0.5px] border-border bg-bg-subtle p-10 lg:flex">
        <Link
          href="/"
          aria-label="Axo, inicio"
          className="w-fit rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-subtle"
        >
          <Logo variant="dark" size="md" />
        </Link>

        <div className="max-w-[400px]">
          <h2 className="text-balance text-[28px] font-medium leading-[1.15] text-text-primary">
            {titulo}
          </h2>
          <p className="mt-3 text-body-l text-text-secondary">{texto}</p>

          <div className="mt-8 rounded-lg border-[0.5px] border-border bg-bg-card p-4">
            <PedigreeDiagram pedigri={COLONIA_EJEMPLO} hembra="A-13" macho="A-12" />
            <p className="mt-2 text-small text-text-secondary">
              Colonia de ejemplo. En teal, el ancestro que comparten A-13 y A-12.
            </p>
          </div>

          {pasos && (
            <ol className="mt-8 space-y-3" aria-label="Pasos para empezar">
              {pasos.map((p, i) => (
                <li key={p.label} className="flex items-center gap-3" aria-current={p.activo ? "step" : undefined}>
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${
                      p.activo
                        ? "bg-accent text-accent-text"
                        : "border-[0.5px] border-text-secondary text-text-secondary"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-label ${p.activo ? "text-text-primary" : "text-text-secondary"}`}
                  >
                    {p.label}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="text-small text-text-secondary">© 2026 AMOXTLI</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <Link
            href="/"
            aria-label="Axo, inicio"
            className="mb-8 flex w-fit rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app lg:hidden"
          >
            <Logo variant="dark" size="md" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
