"use client"

import { motion } from "framer-motion"

const logos = ["UNAM", "UAM-Xochimilco", "DIBAC", "SEMARNAT"]

export function LogosBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border-t border-border py-4 px-4 sm:px-6"
    >
      <div className="max-w-inner mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-8">
        <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-text-disabled font-sans text-center sm:text-left">
          Adoptado por instituciones líderes
        </p>
        <div className="flex items-center justify-center sm:justify-end gap-6 sm:gap-10 flex-wrap">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-[11px] sm:text-[12px] font-medium text-text-disabled tracking-wide font-sans"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
