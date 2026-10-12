import Link from "next/link"
import { Logo } from "@/components/Logo"

const enlaces = [
  { label: "Cómo funciona", href: "/#producto" },
  { label: "Planes", href: "/#planes" },
  { label: "Iniciar sesión", href: "/auth/login" },
  { label: "Crear cuenta", href: "/auth/register" },
]

const link =
  "text-[13px] text-white/70 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xs"

export function Footer() {
  return (
    <footer className="bg-text-primary px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-inner">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo variant="light" size="sm" />
            <p className="mt-4 max-w-[280px] text-body text-white/70">
              Gestión operativa para refugios de Ambystoma mexicanum en cautiverio.
            </p>
          </div>
          <nav aria-label="Pie de página">
            <ul className="flex flex-col gap-3 md:flex-row md:gap-8">
              {enlaces.map((e) => (
                <li key={e.label}>
                  <Link href={e.href} className={link}>
                    {e.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="mailto:hello@amoxtli.tech" className={link}>
                  Contacto
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t-[0.5px] border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-white/60">© 2026 AMOXTLI</p>
          <a href="https://amoxtli.tech" className={`${link} !text-[12px]`}>
            Un producto de AMOXTLI
          </a>
        </div>
      </div>
    </footer>
  )
}
