"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ArrowRight } from "lucide-react"
import { Logo } from "@/components/Logo"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const mouse = useRef({ x: 38, y: 45 })
  const pos = useRef({ x: 38, y: 45 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const section = sectionRef.current
    const cursor = cursorRef.current
    if (!section || !cursor) return

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 100
      mouse.current.y = ((e.clientY - rect.top) / rect.height) * 100
    }

    const onLeave = () => {
      gsap.to(mouse.current, { x: 38, y: 45, duration: 2.5, ease: "power2.out" })
    }

    const tick = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.05
      pos.current.y += (mouse.current.y - pos.current.y) * 0.05
      cursor.style.left = `${pos.current.x}%`
      cursor.style.top = `${pos.current.y}%`
      rafRef.current = requestAnimationFrame(tick)
    }

    section.addEventListener("mousemove", onMove)
    section.addEventListener("mouseleave", onLeave)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      section.removeEventListener("mousemove", onMove)
      section.removeEventListener("mouseleave", onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      style={{ background: "#060e0d", borderRadius: "28px" }}
    >

      {/* ── MESH GRADIENT BLOBS ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ filter: "blur(72px)" }}>
        {/* blob top-left — primary teal */}
        <div className="absolute rounded-full"
          style={{ width: "55%", height: "65%", top: "-10%", left: "-8%",
            background: "radial-gradient(circle, #1a6560 0%, transparent 70%)", opacity: 0.55 }} />
        {/* blob center — accent */}
        <div className="absolute rounded-full"
          style={{ width: "45%", height: "50%", top: "15%", left: "25%",
            background: "radial-gradient(circle, #144f4b 0%, transparent 70%)", opacity: 0.45 }} />
        {/* blob bottom-right — deep teal */}
        <div className="absolute rounded-full"
          style={{ width: "40%", height: "40%", bottom: "-5%", right: "-5%",
            background: "radial-gradient(circle, #0d3d39 0%, transparent 70%)", opacity: 0.35 }} />
        {/* blob top-right — lighter pop */}
        <div className="absolute rounded-full"
          style={{ width: "30%", height: "35%", top: "5%", right: "5%",
            background: "radial-gradient(circle, #1f7a74 0%, transparent 70%)", opacity: 0.2 }} />
        {/* blob bottom-left — muted fill */}
        <div className="absolute rounded-full"
          style={{ width: "35%", height: "30%", bottom: "10%", left: "5%",
            background: "radial-gradient(circle, #0f4844 0%, transparent 70%)", opacity: 0.3 }} />
      </div>

      {/* ── INTERACTIVE CURSOR GLOW ───────────────────── */}
      <div
        ref={cursorRef}
        className="absolute pointer-events-none rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "38%", height: "55%",
          background: "radial-gradient(circle, #1a6560 0%, transparent 65%)",
          filter: "blur(48px)",
          opacity: 0.5,
          left: "38%", top: "45%",
        }}
      />

      {/* ── MESH GRID OVERLAY ─────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(26,101,96,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,101,96,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%)",
        }}
      />

      {/* ── NOISE TEXTURE ─────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.06,
          mixBlendMode: "soft-light",
        }}
      />

      {/* ── VIGNETTE ──────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 35%, #060e0d 100%)",
        }}
      />

      {/* ── CONTENT ───────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-inner mx-auto px-4 sm:px-6 text-center">
        <motion.p
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[9px] sm:text-[10px] font-medium tracking-[0.18em] uppercase text-white/40 mb-6 sm:mb-8 font-sans"
        >
          #1 Plataforma de Gestión · Ambystoma Mexicanum
        </motion.p>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[clamp(32px,6vw,72px)] font-medium leading-[1.1] text-white mb-5 sm:mb-6 max-w-[860px] mx-auto text-balance font-sans"
        >
          <Logo variant="white" className="h-[0.85em] w-auto inline-block align-baseline mr-[0.18em]" />
          El sistema operativo de tu refugio de ajolote.
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[14px] sm:text-[15px] text-white/50 max-w-[480px] mx-auto leading-relaxed mb-8 sm:mb-10 font-sans"
        >
          La plataforma técnica diseñada para la preservación científica.
          Automatice sus bitácoras de la UMA, controle el coeficiente de
          endogamia y gestione la salud de su colonia.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Link
            href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 text-[13px] font-medium font-sans bg-white text-[#091918] hover:bg-white/90 rounded-sm transition-all duration-150 active:scale-[0.98]"
          >
            Comenzar registro
          </Link>
          <button className="flex items-center gap-2 text-[13px] font-medium text-white/60 hover:text-white/90 transition-colors duration-150 group cursor-pointer">
            Ver demostración
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
