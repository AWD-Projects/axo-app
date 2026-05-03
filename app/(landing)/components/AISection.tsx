"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const tableData = [
  { candidato: "M-102 (Neu.)", coef: "0.002", riesgo: "Bajo", ok: true },
  { candidato: "M-084 (Mel.)", coef: "0.016", riesgo: "Bajo", ok: true },
  { candidato: "M-195 (Leuc.)", coef: "0.048", riesgo: "Moderado", ok: false },
]

export function AISection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
      <div className="max-w-inner mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary leading-[1.15] mb-6 sm:mb-8 font-sans">
            Tu agente de inteligencia, con datos reales de tu colonia.
          </h2>
          <ul className="space-y-3 sm:space-y-4">
            {[
              "Predicción de salud poblacional",
              "Optimización de cruzas genéticas",
              "Alertas tempranas de parámetros críticos",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <ArrowRight size={14} className="text-accent flex-shrink-0" />
                <span className="text-[14px] text-text-secondary font-sans">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — AI chat mockup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="bg-bg-card border border-border rounded-md p-4 sm:p-6 overflow-hidden"
          style={{ boxShadow: "0 4px 16px rgba(13,13,13,0.06), 0 1px 4px rgba(13,13,13,0.04)" }}
        >
          {/* User message */}
          <div className="flex justify-end mb-4">
            <div className="bg-accent-bg text-text-primary text-[12px] sm:text-[13px] leading-relaxed px-3 sm:px-4 py-2.5 rounded-[10px_10px_2px_10px] max-w-[90%] font-sans">
              ¿Qué machos de la pecera 8 no tienen relación de linaje directa con la hembra I-7?
            </div>
          </div>

          {/* AI response header */}
          <div className="mb-3">
            <span className="text-[10px] font-medium text-accent font-sans block mb-1">Axo AI</span>
            <p className="text-[12px] sm:text-[13px] text-text-secondary leading-relaxed font-sans">
              He encontrado 3 candidatos óptimos con coeficiente de endogamia bajo:
            </p>
          </div>

          {/* Results table */}
          <div className="border border-border rounded-xs overflow-hidden">
            <div className="grid grid-cols-3 bg-bg-app px-2 sm:px-3 py-2 border-b border-border">
              {["Candidato", "Coef.", "Riesgo"].map((h) => (
                <span key={h} className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide text-text-disabled font-sans">{h}</span>
              ))}
            </div>
            {tableData.map((row) => (
              <div key={row.candidato} className="grid grid-cols-3 px-2 sm:px-3 py-2 border-b border-border last:border-0 hover:bg-bg-app transition-colors duration-100">
                <span className="text-[10px] sm:text-[12px] font-mono text-accent truncate pr-1">{row.candidato}</span>
                <span className="text-[10px] sm:text-[12px] font-mono text-text-primary">{row.coef}</span>
                <span className={`text-[10px] sm:text-[11px] font-medium font-sans px-1.5 sm:px-2 py-0.5 rounded-xs w-fit ${row.ok ? "bg-accent-bg text-accent" : "bg-warning-bg text-warning"}`}>
                  {row.riesgo}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
