"use client"

import { motion } from "framer-motion"
import { useRef } from "react"
import { gsap } from "gsap"

const features = [
  {
    num: "01",
    title: "Bitácora diaria",
    desc: "Digitalización total de parámetros físico-químicos del agua, alimentación y observaciones clínicas con validación instantánea.",
  },
  {
    num: "02",
    title: "Linaje y endogamia",
    desc: "Cálculo automatizado del coeficiente de consanguinidad para garantizar la variabilidad genética de su población.",
  },
  {
    num: "03",
    title: "Reporte UMA automático",
    desc: "Generación de informes semestrales y anuales listos para entrega ante SEMARNAT, cumpliendo con toda la normativa vigente.",
  },
]

function FeatureCard({ num, title, desc, index }: { num: string; title: string; desc: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    gsap.to(cardRef.current, { y: -3, duration: 0.2, ease: "power2.out" })
  }
  const handleLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.2, ease: "power2.out" })
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="flex flex-col"
    >
      <p className="text-[36px] sm:text-[40px] font-medium text-border leading-none mb-5 sm:mb-6 font-sans">{num}</p>
      <h3 className="text-[15px] font-medium text-text-primary mb-2 sm:mb-3 font-sans">{title}</h3>
      <p className="text-[13px] text-text-secondary leading-relaxed font-sans">{desc}</p>
    </motion.div>
  )
}

export function Features() {
  return (
    <section id="caracteristicas" className="py-14 sm:py-20 px-4 sm:px-6 border-b border-border">
      <div className="max-w-inner mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-16">
        {features.map((f, i) => (
          <FeatureCard key={f.num} {...f} index={i} />
        ))}
      </div>
    </section>
  )
}
