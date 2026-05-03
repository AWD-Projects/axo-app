"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export function CTA() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-text-primary border-t border-white/10">
      <div className="max-w-inner mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(24px,4vw,40px)] font-medium text-white leading-[1.15] mb-4 font-sans"
        >
          ¿Listo para dejar el Excel?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-[14px] text-white/50 font-sans mb-8 sm:mb-10 max-w-md mx-auto"
        >
          Únase a los refugios que ya gestionan su colonia con rigor científico y cumplimiento legal automático.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center h-10 px-6 text-[13px] font-medium font-sans bg-accent text-accent-text hover:bg-accent-hover rounded-sm transition-all duration-150 active:scale-[0.98]"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="mailto:hola@amoxtli.tech"
            className="inline-flex items-center justify-center h-10 px-6 text-[13px] font-medium font-sans bg-transparent text-white border border-white/20 hover:bg-white/5 rounded-sm transition-all duration-150 active:scale-[0.98]"
          >
            Hablar con el equipo
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
