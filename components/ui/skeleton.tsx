"use client"

import { useEffect, useState } from "react"
import { Logo } from "@/components/Logo"

// ── Skeleton primitive ────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-[4px] ${className}`}
      style={{ backgroundColor: "#f3f2ef", ...style }}
    />
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

export function SkeletonCard({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[10px] p-4 ${className}`}
      style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", ...style }}
    >
      <Skeleton style={{ width: "60%", height: 14 }} />
      <Skeleton style={{ width: "40%", height: 10, marginTop: 8 }} />

      <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "12px 0" }} />

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between"
          style={{ marginBottom: i < 2 ? 8 : 0 }}
        >
          <Skeleton style={{ width: "30%", height: 10 }} />
          <Skeleton style={{ width: "20%", height: 10 }} />
        </div>
      ))}

      <Skeleton style={{ width: "100%", height: 36, marginTop: 12, borderRadius: 8 }} />
    </div>
  )
}

// ── Table skeleton ────────────────────────────────────────────────────────────

const COL_WIDTHS = ["25%", "35%", "20%"]

export function TableSkeleton({ rows = 4, className = "", style }: { rows?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] ${className}`}
      style={{ border: "0.5px solid #e5e2dc", ...style }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-[14px] py-[10px]"
        style={{ backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}
      >
        {COL_WIDTHS.map((w, i) => (
          <Skeleton key={i} style={{ width: w, height: 10, borderRadius: 3 }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-[14px] py-[12px]"
          style={{
            backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa",
            borderBottom: i < rows - 1 ? "0.5px solid #edeae4" : "none",
          }}
        >
          {COL_WIDTHS.map((w, j) => (
            <Skeleton key={j} style={{ width: w, height: 12, borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── App splash ────────────────────────────────────────────────────────────────

interface AppSplashProps {
  message?: string
}

export function AppSplash({ message = "Cargando tu refugio..." }: AppSplashProps) {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 2200
    let raf: number

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setFill(Math.round(eased * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#f9f9f7" }}
    >
      <Logo variant="teal" size="lg" />

      <div
        className="overflow-hidden rounded-[2px]"
        style={{ width: 120, height: 2, backgroundColor: "#e5e2dc", marginTop: 24 }}
      >
        <div
          className="h-full rounded-[2px] transition-none"
          style={{
            width: `${fill}%`,
            backgroundColor: "#1a6560",
            transition: "width 80ms linear",
          }}
        />
      </div>

      <p
        className="text-[12px] text-center"
        style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          color: "#9a958f",
          marginTop: 12,
        }}
      >
        {message}
      </p>
    </div>
  )
}
