"use client"

import { motion } from "framer-motion"
import { useRef } from "react"
import { gsap } from "gsap"
import { FlaskConical, Shield, Leaf, Heart } from "lucide-react"

const cards = [
  {
    icon: FlaskConical,
    title: "Investigación Académica",
    desc: "Herramientas avanzadas para la recolección de datos científicos, exportación en formatos abiertos y control de variables experimentales.",
    featured: false,
  },
  {
    icon: Shield,
    title: "UMAs Registradas",
    desc: "El estándar para el cumplimiento legal ante SEMARNAT. Bitácoras certificadas y autoevaluación de reportes de aprovechamiento.",
    featured: false,
  },
  {
    icon: Leaf,
    title: "Proyectos de Rescate",
    desc: "Ideal para PMVs que requieren una gestión simplificada pero rigurosa del inventario y estados de salud.",
    featured: false,
  },
  {
    icon: Heart,
    title: "Criaderos Éticos",
    desc: "Enfoque en la trazabilidad genética y la salud individual para asegurar que cada ejemplar sea fuerte y saludable.",
    featured: false,
  },
]

function AudienceCard({ icon: Icon, title, desc, featured, badge, index }: {
  icon: React.ElementType; title: string; desc: string; featured: boolean; badge?: string; index: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    if (featured) return
    gsap.to(ref.current, { y: -4, duration: 0.2, ease: "power2.out" })
  }
  const handleLeave = () => {
    gsap.to(ref.current, { y: 0, duration: 0.2, ease: "power2.out" })
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`rounded-md p-5 sm:p-6 border cursor-default ${
        featured
          ? "bg-text-primary border-text-primary"
          : "bg-bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <Icon size={18} className={featured ? "text-white/50" : "text-text-disabled"} strokeWidth={1.5} />
        {badge && (
          <span className="text-[9px] font-medium tracking-wider bg-accent text-accent-text px-2 py-0.5 rounded-xs font-sans">
            {badge}
          </span>
        )}
      </div>
      <h3 className={`text-[14px] font-medium mb-2 font-sans ${featured ? "text-white" : "text-text-primary"}`}>
        {title}
      </h3>
      <p className={`text-[13px] leading-relaxed font-sans ${featured ? "text-white/50" : "text-text-secondary"}`}>
        {desc}
      </p>
    </motion.div>
  )
}

export function Audience() {
  return (
    <section id="audiencia" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
      <div className="max-w-inner mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-8 sm:mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary leading-[1.15] font-sans"
          >
            Diseñado para cada etapa de la conservación.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[14px] text-text-secondary leading-relaxed font-sans lg:self-end"
          >
            Desde laboratorios universitarios hasta proyectos de rescate comunitario. Axo escala según las necesidades de su colonia.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {cards.map((card, i) => (
            <AudienceCard key={card.title} {...card} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
