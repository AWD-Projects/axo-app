"use client"

import { motion } from "framer-motion"
import { useRef } from "react"
import { gsap } from "gsap"
import { Check } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "ESENCIAL",
    price: "$890",
    period: "/mes",
    featured: false,
    items: [
      "Hasta 50 ejemplares",
      "Bitácora básica",
      "1 Usuario",
    ],
  },
  {
    name: "ESTÁNDAR",
    price: "$1,800",
    period: "/mes",
    featured: true,
    badge: "MÁS POPULAR",
    items: [
      "Hasta 200 ejemplares",
      "Reportes UMA automáticos",
      "Módulo genético básico",
      "3 Usuarios",
    ],
  },
  {
    name: "AVANZADO",
    price: "$3,500",
    period: "/mes",
    featured: false,
    items: [
      "Ejemplares ilimitados",
      "Axo AI Assistant",
      "Gestión de linajes profunda",
      "10 Usuarios",
    ],
  },
]

function PlanCard({ plan, index }: { plan: typeof plans[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    if (plan.featured) return
    gsap.to(ref.current, { y: -4, duration: 0.2, ease: "power2.out" })
  }
  const handleLeave = () => {
    gsap.to(ref.current, { y: 0, duration: 0.2, ease: "power2.out" })
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`relative flex-1 rounded-md border p-6 sm:p-8 flex flex-col ${
        plan.featured
          ? "border-accent bg-bg-card"
          : "border-border bg-bg-card"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[9px] font-medium tracking-wider bg-accent text-accent-text px-3 py-1 rounded-full font-sans">
            {plan.badge}
          </span>
        </div>
      )}

      <p className="text-[10px] font-medium tracking-[0.14em] text-text-disabled mb-4 font-sans">{plan.name}</p>

      <div className="flex items-baseline gap-1 mb-6 sm:mb-8">
        <span className="text-[32px] sm:text-[36px] font-medium text-text-primary font-sans leading-none">{plan.price}</span>
        <span className="text-[13px] text-text-disabled font-sans">{plan.period}</span>
      </div>

      <ul className="space-y-3 mb-6 sm:mb-8 flex-1">
        {plan.items.map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <Check size={13} className="text-accent flex-shrink-0" />
            <span className="text-[13px] text-text-secondary font-sans">{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/auth/register"
        className={`inline-flex items-center justify-center w-full h-9 text-[12px] font-medium font-sans rounded-sm transition-all duration-150 active:scale-[0.98] ${
          plan.featured
            ? "bg-accent text-accent-text hover:bg-accent-hover"
            : "bg-transparent text-text-primary border border-border hover:bg-bg-subtle"
        }`}
      >
        Seleccionar
      </Link>
    </motion.div>
  )
}

export function Pricing() {
  return (
    <section id="planes" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
      <div className="max-w-inner mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary font-sans mb-3">
            Planes de Gestión
          </h2>
          <p className="text-[14px] text-text-secondary font-sans">
            Inversión en tecnología para asegurar la vida y la legalidad de su colonia.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
