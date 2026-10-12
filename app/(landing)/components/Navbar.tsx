"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Logo } from "@/components/Logo"

const navLinks = [
  { label: "Cómo funciona", href: "#producto" },
  { label: "Axo AI", href: "#ai" },
  { label: "Para quién", href: "#audiencia" },
  { label: "Planes", href: "#planes" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[64px] items-center bg-bg-app/95 backdrop-blur-sm border-b-[0.5px] transition-colors duration-150 motion-reduce:transition-none ${
        scrolled ? "border-border" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-inner items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Axo, inicio"
          className="flex h-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app rounded-xs"
        >
          <Logo variant="dark" size="sm" />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center px-2 text-[13px] font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-9 items-center justify-center rounded-sm bg-text-primary px-4 text-[12px] font-medium text-accent-text transition-colors duration-150 hover:bg-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  )
}
