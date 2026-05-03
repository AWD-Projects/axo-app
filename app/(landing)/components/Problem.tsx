"use client"

import { motion } from "framer-motion"
import { X, Check } from "lucide-react"

const columns = [
  {
    label: "Libreta + Excel",
    dark: false,
    items: [
      { ok: false, text: "Pérdida de datos históricos" },
      { ok: false, text: "Sin control de endogamia" },
      { ok: false, text: "Reporte UMA manual (semanas)" },
    ],
  },
  {
    label: "CRM o Google Sheets",
    dark: false,
    items: [
      { ok: false, text: "No especializado en biología" },
      { ok: false, text: "Propenso a errores humanos" },
      { ok: false, text: "Difícil de auditar legalmente" },
    ],
  },
  {
    label: "Axo",
    dark: true,
    badge: "ESPECIALIZADO",
    items: [
      { ok: true, text: "Trazabilidad genética completa" },
      { ok: true, text: "Alertas de salud en tiempo real" },
      { ok: true, text: "Reportes oficiales en un clic" },
    ],
  },
]

export function Problem() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-inner mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[10px] font-medium tracking-[0.14em] uppercase text-accent mb-4 font-sans"
        >
          El problema
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(24px,4vw,40px)] font-medium text-text-primary mb-10 sm:mb-12 font-sans"
        >
          Hoy, los refugios operan con libretas y Excel.
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {columns.map((col, i) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`rounded-md p-5 sm:p-6 border ${
                col.dark
                  ? "bg-text-primary border-text-primary"
                  : "bg-bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <p className={`text-[13px] font-medium font-sans ${col.dark ? "text-white/70" : "text-text-primary"}`}>
                  {col.label}
                </p>
                {col.badge && (
                  <span className="text-[10px] font-medium tracking-wide bg-accent text-accent-text px-2 py-0.5 rounded-xs font-sans">
                    {col.badge}
                  </span>
                )}
              </div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5">
                    {item.ok ? (
                      <Check size={13} className="text-accent mt-0.5 flex-shrink-0" />
                    ) : (
                      <X size={13} className="text-text-disabled mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-[13px] leading-snug font-sans ${col.dark ? "text-white/60" : "text-text-secondary"}`}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
