"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { Logo } from "@/components/Logo"

const navLinks = [
  { label: "Producto",     href: "#caracteristicas" },
  { label: "Precios",      href: "#planes" },
  { label: "Casos de uso", href: "#casos" },
  { label: "Para quién",   href: "#audiencia" },
]

export function Navbar() {
  const { scrollY } = useScroll()
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1])

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center"
      style={{
        backgroundColor: "rgba(249,249,247,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid",
        borderColor: borderOpacity.get() > 0.1 ? "#e5e2dc" : "transparent",
      }}
    >
      <div className="w-full max-w-inner mx-auto px-4 sm:px-6 grid grid-cols-[auto_1fr_auto] items-center gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo variant="dark" size="sm" />
        </Link>

        {/* Nav — centered */}
        <nav className="hidden md:flex items-center justify-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] text-text-secondary hover:text-text-primary transition-colors duration-150 font-sans"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="md:hidden" />

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:block text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 font-sans"
          >
            Iniciar sesión
          </Link>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center h-8 px-4 text-[12px] font-medium font-sans bg-text-primary text-accent-text hover:bg-text-primary/90 rounded-sm transition-all duration-150 active:scale-[0.98]"
          >
            Crear cuenta
          </Link>
        </div>

      </div>
    </motion.header>
  )
}
