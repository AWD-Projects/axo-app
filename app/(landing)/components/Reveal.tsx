"use client"

import { useEffect, useRef, useState } from "react"

type Estado = "visible" | "oculto" | "mostrado"

/**
 * Entrada sutil al hacer scroll. El contenido es visible por defecto (servidor,
 * sin JS, rastreadores): solo se oculta en el cliente lo que está bajo el pliegue,
 * y nunca si el usuario pidió reducir el movimiento.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>("visible")

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (typeof IntersectionObserver === "undefined") return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    setEstado("oculto")
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEstado("mostrado")
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -60px 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const animado =
    estado === "oculto"
      ? "opacity-0 translate-y-3"
      : estado === "mostrado"
      ? "opacity-100 translate-y-0 transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none"
      : ""

  return (
    <div
      ref={ref}
      className={`${className} ${animado}`}
      style={estado === "mostrado" && delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
