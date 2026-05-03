"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"

const plataforma = [
  { label: "Características", href: "/#caracteristicas" },
  { label: "Planes", href: "/#planes" },
  { label: "Casos de uso", href: "/#casos" },
  { label: "Iniciar sesión", href: "/auth/login" },
]

const compania = [
  { label: "Sobre Axo", href: "/about" },
  { label: "AMOXTLI", href: "https://amoxtli.tech" },
  { label: "Contacto", href: "mailto:hola@amoxtli.tech" },
  { label: "Privacidad", href: "/privacidad" },
]

export function Footer() {
  return (
    <footer className="bg-text-primary border-t border-white/10 px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-inner mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 mb-10 sm:mb-12">
          {/* Brand — full width on xs, first col on sm+ */}
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-3">
              <Logo variant="light" size="sm" />
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed font-sans max-w-[220px]">
              Gestión operativa para refugios de Ambystoma mexicanum en cautiverio.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-white/30 mb-4 font-sans">
              Plataforma
            </p>
            <ul className="space-y-2.5">
              {plataforma.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-white/50 hover:text-white/80 transition-colors duration-150 font-sans"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compañía */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-white/30 mb-4 font-sans">
              Compañía
            </p>
            <ul className="space-y-2.5">
              {compania.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-white/50 hover:text-white/80 transition-colors duration-150 font-sans"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[12px] text-white/25 font-sans text-center sm:text-left">
            © 2026 AMOXTLI. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link href="https://github.com/AWD-Projects" className="text-[12px] text-white/30 hover:text-white/60 transition-colors duration-150 font-sans">
              GitHub
            </Link>
            <Link href="https://amoxtli.tech" className="text-[12px] text-white/30 hover:text-white/60 transition-colors duration-150 font-sans">
              amoxtli.tech
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
