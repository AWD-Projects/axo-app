"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, CreditCard, ArrowRight, TriangleAlert, Mail } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanKey = "pionero" | "estandar" | "academico" | "institucional" | "regulador"

interface UsageData {
  consultas_realizadas: number
  limite: number | null   // null = ilimitado
  mes: string             // "YYYY-MM-01"
  plan: string
}

interface PlanUsoProps {
  refugioId: string
}

// ── Plan config ────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<PlanKey, { nombre: string; features: string[] }> = {
  pionero:      { nombre: "Pionero",      features: ["1 refugio activo", "Hasta 100 individuos", "50 consultas de Axo AI / mes", "Generación de reporte UMA", "Soporte por email"] },
  estandar:     { nombre: "Estándar",     features: ["Refugios ilimitados", "Individuos ilimitados", "Axo AI ilimitado", "Reportes avanzados", "Soporte prioritario"] },
  academico:    { nombre: "Académico",    features: ["Múltiples refugios", "Individuos ilimitados", "Axo AI ilimitado", "Reportes regulatorios", "Soporte académico"] },
  institucional:{ nombre: "Institucional",features: ["Refugios ilimitados", "Usuarios ilimitados", "Axo AI ilimitado", "Reportes avanzados", "Soporte dedicado"] },
  regulador:    { nombre: "Regulador",    features: ["Acceso de solo lectura", "Reportes regulatorios", "Sin Axo AI"] },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMesLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
}

function getNextMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number)
  const date = new Date(year, month, 1) // month is 0-indexed, so +1 naturally
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
}


function getBarColor(pct: number): string {
  if (pct >= 1) return "#991b1b"
  if (pct >= 0.8) return "#92400e"
  return "#1a6560"
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PlanUso({ refugioId }: PlanUsoProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ai/usage?refugio_id=${refugioId}`)
      if (!res.ok) throw new Error("Error al cargar uso de AI")
      const { data } = await res.json()
      setUsage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [refugioId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div style={{ maxWidth: 640 }}>
        <Skeleton style={{ width: 100, height: 18, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderTop: "3px solid #1a6560", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <Skeleton style={{ width: 70, height: 9, borderRadius: 4, marginBottom: 10 }} />
          <Skeleton style={{ width: 120, height: 28, borderRadius: 6, marginBottom: 6 }} />
          <Skeleton style={{ width: 80, height: 20, borderRadius: 5, marginBottom: 20 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} style={{ width: `${55 + i * 8}%`, height: 12, borderRadius: 4, marginBottom: 8 }} />
          ))}
        </div>
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <Skeleton style={{ width: 180, height: 14, borderRadius: 5, marginBottom: 20 }} />
          <Skeleton style={{ width: 80, height: 44, borderRadius: 6, marginBottom: 6 }} />
          <Skeleton style={{ width: "100%", height: 8, borderRadius: 4, marginBottom: 8 }} />
          <Skeleton style={{ width: 160, height: 10, borderRadius: 4, marginBottom: 20 }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Skeleton style={{ width: 80, height: 10, borderRadius: 4 }} />
              <Skeleton style={{ width: 80, height: 4, borderRadius: 2 }} />
              <Skeleton style={{ width: 50, height: 10, borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
          <Skeleton style={{ width: 90, height: 14, borderRadius: 5, marginBottom: 20 }} />
          {[1, 2].map(i => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <Skeleton style={{ width: 90, height: 10, borderRadius: 4 }} />
              <Skeleton style={{ width: 140, height: 10, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fef2f2",
          border: "0.5px solid #fca5a5",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          color: "#991b1b",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {error}
      </div>
    )
  }

  const planKey = (usage?.plan ?? "pionero") as PlanKey
  const planCfg = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.pionero

  const consultasRealizadas = usage?.consultas_realizadas ?? 0
  const limiteConsultas = usage?.limite ?? null  // null = ilimitado
  const mesActual = (usage?.mes ?? new Date().toISOString().slice(0, 8) + "01").slice(0, 7)
  const ilimitado = limiteConsultas === null

  const pctUso = ilimitado || limiteConsultas === 0
    ? 0
    : Math.min(consultasRealizadas / limiteConsultas, 1)
  const pctLabel = Math.round(pctUso * 100)
  const barColor = getBarColor(pctUso)

  const mesLabel = getMesLabel(mesActual)
  const nextMonthLabel = getNextMonthLabel(mesActual)

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#0d0d0d",
            margin: 0,
          }}
        >
          Plan y uso
        </h1>
      </div>

      <div
        style={{
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Card 1 — Plan actual */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderTop: "3px solid #1a6560",
            borderRadius: 10,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            {/* Left */}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#1a6560",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 8px",
                }}
              >
                Plan actual
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "#0d0d0d",
                  margin: "0 0 4px",
                }}
              >
                {planCfg.nombre}
              </p>

              {/* Features */}
              <ul
                style={{
                  listStyle: "none",
                  margin: "16px 0 0",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {planCfg.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Check size={14} color="#1a6560" strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "#3c3a36",
                      }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#1a6560",
                  color: "#f9f9f7",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Actualizar plan
              </button>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "#1a6560",
                  textDecoration: "none",
                }}
              >
                Ver todos los planes
                <ArrowRight size={12} color="#1a6560" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 2 — Uso de Axo AI */}
        <div
          style={{
            background: "#ffffff",
            border: "0.5px solid #e5e2dc",
            borderRadius: 10,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingBottom: 12,
              marginBottom: 16,
              borderBottom: "0.5px solid #e5e2dc",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#0d0d0d",
                margin: 0,
              }}
            >
              Uso de Axo AI · {mesLabel}
            </h2>
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 11,
                color: "#9a958f",
                whiteSpace: "nowrap",
                marginLeft: 12,
              }}
            >
              Se reinicia el 1 {nextMonthLabel}
            </span>
          </div>

          {/* Usage number */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 40, fontWeight: 500, color: "#0d0d0d", lineHeight: 1 }}>
              {consultasRealizadas}
            </span>
            <span style={{ fontSize: 14, color: "#9a958f" }}>
              {ilimitado ? "consultas · ilimitado" : `/ ${limiteConsultas} consultas`}
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 4,
              background: "#e5e2dc",
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pctLabel}%`,
                height: "100%",
                borderRadius: 4,
                background: barColor,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {!ilimitado && (
            <p style={{ fontSize: 12, color: "#9a958f", margin: 0 }}>
              {pctLabel}% del límite mensual utilizado
            </p>
          )}

          {/* Warning banner */}
          {pctUso >= 0.8 && (
            <div
              style={{
                background: "#fffbeb",
                border: "0.5px solid #fde68a",
                borderRadius: 8,
                padding: "10px 14px",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TriangleAlert size={14} color="#92400e" />
                <span
                  style={{
                    fontSize: 12,
                    color: "#92400e",
                  }}
                >
                  Estás cerca del límite mensual de consultas de Axo AI.
                </span>
              </div>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#1a6560",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Actualizar <ArrowRight size={11} style={{ display: "inline", verticalAlign: "middle" }} />
              </a>
            </div>
          )}

        </div>

        {/* Card 3 — Facturación */}
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: "#0d0d0d", margin: 0, paddingBottom: 12, marginBottom: 16, borderBottom: "0.5px solid #e5e2dc" }}>
            Facturación
          </h2>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#f5f2ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CreditCard size={15} color="#9a958f" />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#0d0d0d", margin: "0 0 4px" }}>
                Gestionado por el equipo de Axo
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, color: "#9a958f", margin: "0 0 12px" }}>
                Para cambios en tu plan, método de pago o historial de cobros, contacta a soporte.
              </p>
              <a
                href="mailto:soporte@amoxtli.tech"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#1a6560", textDecoration: "none" }}
              >
                <Mail size={13} />
                soporte@amoxtli.tech
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
