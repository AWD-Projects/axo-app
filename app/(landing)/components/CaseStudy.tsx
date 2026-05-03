"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { gsap } from "gsap"

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState("0")

  useEffect(() => {
    if (!inView) return
    const isArrow = value.includes("→")
    if (isArrow) { setDisplayed(value); return }

    const num = parseFloat(value.replace(/[^0-9.]/g, ""))
    const suffix = value.replace(/[0-9.]/g, "")
    const obj = { n: 0 }
    gsap.to(obj, {
      n: num,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => setDisplayed(obj.n.toFixed(0) + suffix),
    })
  }, [inView, value])

  return (
    <div ref={ref}>
      <p className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary font-sans leading-none mb-1">
        {displayed}
      </p>
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-text-disabled font-sans">{label}</p>
    </div>
  )
}

export function CaseStudy() {
  return (
    <section id="casos" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
      <div className="max-w-inner mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[10px] font-medium tracking-[0.14em] uppercase text-accent mb-4 font-sans"
        >
          Casos piloto
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary mb-8 sm:mb-12 font-sans"
        >
          Lo que dicen los primeros refugios.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Quote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 bg-bg-card border border-border rounded-md p-6 sm:p-8"
          >
            <blockquote className="text-[15px] sm:text-[18px] font-medium text-text-primary leading-[1.5] mb-5 sm:mb-6 font-sans">
              &ldquo;La capacidad de calcular el coeficiente de endogamia en segundos ha transformado nuestra estrategia de repoblación. Axo no es solo software, es una herramienta de conservación científica.&rdquo;
            </blockquote>
            <div>
              <p className="text-[13px] font-medium text-text-primary font-sans">Dr. Luis Zambrano</p>
              <p className="text-[12px] text-text-disabled font-sans">Investigador Titular, Instituto de Biología UNAM</p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-bg-card border border-border rounded-md p-6 sm:p-8 flex flex-row md:flex-col justify-between gap-6 sm:gap-8"
          >
            <AnimatedStat value="3h → 1 clic" label="Tiempo de reporte UMA" />
            <div className="hidden md:block border-t border-border-sub" />
            <AnimatedStat value="2" label="Años de datos migrados" />
            <div className="hidden md:block border-t border-border-sub" />
            <AnimatedStat value="100%" label="Auditabilidad legal" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
