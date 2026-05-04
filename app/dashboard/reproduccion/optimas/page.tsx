"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, RefreshCw, Users } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Combinacion {
  pair: string
  macho_id: string
  macho_codigo: string
  hembra_id: string
  hembra_codigo: string
  coeficiente: number
  riesgo: "bajo" | "moderado" | "alto"
  disponibilidad: "mismo_estanque" | "estanques_distintos"
}

interface OptimasResult {
  combinaciones: Combinacion[]
  total_machos: number
  total_hembras: number
  total_combinaciones: number
  truncado: boolean
  por_riesgo: { bajo: number; moderado: number; alto: number }
}

type FiltroRiesgo = "todos" | "bajo" | "moderado" | "alto"

// ── Helpers ────────────────────────────────────────────────────────────────────

function riesgoInfo(riesgo: string) {
  if (riesgo === "alto")     return { label: "Alto",     color: "#991b1b", bg: "#fef2f2" }
  if (riesgo === "moderado") return { label: "Moderado", color: "#92400e", bg: "#fffbeb" }
  return { label: "Bajo", color: "#15803d", bg: "#f0fdf4" }
}

function MiniMeter({ coef }: { coef: number }) {
  const pct = Math.min((coef / 0.375) * 100, 100)
  const color = coef > 0.25 ? "#991b1b" : coef > 0.125 ? "#92400e" : "#15803d"
  return (
    <div style={{ position: "relative", width: 80, flexShrink: 0 }}>
      <div style={{ height: 3, borderRadius: 2, background: "linear-gradient(to right, #15803d, #92400e 50%, #991b1b 100%)" }} />
      <div style={{ position: "absolute", top: -3, left: `calc(${pct}% - 3px)`, width: 6, height: 6, borderRadius: "50%", backgroundColor: color, border: "1.5px solid #ffffff" }} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CruzasOptimasPage() {
  const router = useRouter()
  const { activeRefugioId, loading: ctxLoading } = useRefugio()

  const [result, setResult] = useState<OptimasResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtroRiesgo, setFiltroRiesgo] = useState<FiltroRiesgo>("todos")

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/cruzas/optimas`)
      const { data } = await res.json()
      setResult(data ?? null)
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId])

  useEffect(() => {
    if (!ctxLoading) load()
  }, [ctxLoading, load])

  const combinaciones = result?.combinaciones ?? []
  const recommended = combinaciones.slice(0, 5)
  const filtered = combinaciones.filter(c =>
    filtroRiesgo === "todos" ? true : c.riesgo === filtroRiesgo
  )

  const isEmpty = !loading && result !== null && combinaciones.length === 0
  const noAjolotes = isEmpty && (result.total_machos === 0 || result.total_hembras === 0)

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Sparkles size={16} color="#1a6560" />
          <h1 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 20, fontWeight: 500, color: "#0d0d0d", margin: 0 }}>
            Cruzas óptimas · Axo AI
          </h1>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-1.5"
          style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", color: "#3c3a36", fontSize: 12, fontWeight: 500, cursor: loading ? "wait" : "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Actualizar análisis
        </button>
      </div>

      {/* AI Context banner */}
      <div style={{ backgroundColor: "#0d0d0d", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Sparkles size={20} color="#1a6560" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          {loading ? (
            <div>
              <Skeleton style={{ width: "80%", height: 13, marginBottom: 8, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <Skeleton style={{ width: "60%", height: 13, backgroundColor: "rgba(255,255,255,0.06)" }} />
            </div>
          ) : noAjolotes ? (
            <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", lineHeight: 1.6, margin: 0 }}>
              Axo AI necesita reproductores registrados para calcular las combinaciones óptimas.
              Registra machos y hembras en el módulo de Inventario para comenzar.
            </p>
          ) : result ? (
            <>
              <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", lineHeight: 1.6, margin: "0 0 10px 0" }}>
                Axo AI analizó las combinaciones posibles entre los {result.total_machos} machos y {result.total_hembras} hembras vivos en tu refugio y calculó el coeficiente de consanguinidad para cada una.
                {result.truncado && " (Se analizaron las primeras 300 combinaciones.)"}
              </p>
              <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
                <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#f9f9f7" }}>
                  {result.total_combinaciones} combinaciones{result.truncado ? " (muestra de 300)" : " analizadas"}
                </span>
                {result.por_riesgo.bajo > 0 && (
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#4ade80" }}>· {result.por_riesgo.bajo} de bajo riesgo</span>
                )}
                {result.por_riesgo.moderado > 0 && (
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#fb923c" }}>· {result.por_riesgo.moderado} moderado</span>
                )}
                {result.por_riesgo.alto > 0 && (
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, color: "#f87171" }}>· {result.por_riesgo.alto} alto</span>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Empty state — no ajolotes */}
      {noAjolotes && (
        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#f3f2ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Users size={22} color="#9a958f" />
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 15, fontWeight: 500, color: "#0d0d0d", margin: "0 0 8px 0" }}>
            Sin reproductores registrados
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 20px 0", lineHeight: 1.5, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            {result?.total_machos === 0 && result?.total_hembras === 0
              ? "Registra machos y hembras en el módulo de Inventario para que Axo AI pueda calcular las cruzas óptimas."
              : result?.total_machos === 0
              ? "No hay machos vivos registrados. Axo AI necesita al menos un macho y una hembra para generar recomendaciones."
              : "No hay hembras vivas registradas. Axo AI necesita al menos una hembra para generar recomendaciones."}
          </p>
          <button type="button" onClick={() => router.push("/dashboard/inventario")}
            style={{ height: 36, padding: "0 20px", borderRadius: 8, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Ir a Inventario →
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 16, fontWeight: 500, color: "#0d0d0d", margin: "0 0 6px 0" }}>Plan recomendado para maximizar diversidad</h2>
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 16px 0" }}>Calculando combinaciones…</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 88, borderRadius: 10 }} />)}
          </div>
        </>
      )}

      {/* Results */}
      {!loading && !noAjolotes && combinaciones.length > 0 && (
        <>
          {/* Recommended plan */}
          <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 16, fontWeight: 500, color: "#0d0d0d", margin: "0 0 6px 0" }}>
            Plan recomendado para maximizar diversidad
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Las siguientes cruzas tienen el menor coeficiente de consanguinidad disponible en tu refugio.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {recommended.map((rec, i) => {
              const riesgo = riesgoInfo(rec.riesgo)
              const rank = String(i + 1).padStart(2, "0")
              return (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 16, display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 24, fontWeight: 500, color: "#e5e2dc", flexShrink: 0, width: 44 }}>{rank}</span>
                  <div style={{ flex: 1, marginLeft: 4 }}>
                    <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginBottom: 8 }}>{rec.pair}</div>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: riesgo.color }}>{rec.coeficiente.toFixed(4)}</span>
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: riesgo.color, backgroundColor: riesgo.bg, borderRadius: 4, padding: "1px 5px" }}>{riesgo.label}</span>
                      <MiniMeter coef={rec.coeficiente} />
                      <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: rec.disponibilidad === "mismo_estanque" ? "#15803d" : "#9a958f", backgroundColor: rec.disponibilidad === "mismo_estanque" ? "#f0fdf4" : "#f3f2ef", borderRadius: 4, padding: "2px 7px" }}>
                        {rec.disponibilidad === "mismo_estanque" ? "Mismo estanque" : "Estanques distintos"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, marginLeft: 16 }}>
                    <button type="button"
                      onClick={() => router.push("/dashboard/reproduccion/planear")}
                      style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Planear cruza
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full table */}
          <h2 style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 16, fontWeight: 500, color: "#0d0d0d", margin: "0 0 12px 0" }}>
            Todas las combinaciones
          </h2>

          <div className="flex items-center" style={{ gap: 6, marginBottom: 12 }}>
            {([["todos", "Todas"], ["bajo", "Bajo riesgo"], ["moderado", "Moderado"], ["alto", "Alto"]] as [string, string][]).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setFiltroRiesgo(val as FiltroRiesgo)}
                style={{ height: 30, padding: "0 12px", borderRadius: 6, border: filtroRiesgo === val ? "none" : "0.5px solid #e5e2dc", backgroundColor: filtroRiesgo === val ? "#1a6560" : "#ffffff", cursor: "pointer", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: filtroRiesgo === val ? "#f9f9f7" : "#3c3a36", transition: "all 150ms" }}>
                {label}
              </button>
            ))}
            <span style={{ marginLeft: 8, fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 11, color: "#9a958f" }}>{filtered.length} combinaciones</span>
          </div>

          <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 180px 120px", minWidth: 620, padding: "10px 16px", backgroundColor: "#f9f9f7", borderBottom: "0.5px solid #e5e2dc" }}>
                {["CRUZA", "COEFICIENTE", "RIESGO", "DISPONIBILIDAD", "ACCIÓN"].map((h, i) => (
                  <span key={i} style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: "#9a958f" }}>{h}</span>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 13, color: "#9a958f" }}>
                  Sin combinaciones para este filtro
                </div>
              ) : (
                filtered.map((c, i) => {
                  const riesgo = riesgoInfo(c.riesgo)
                  const isLast = i === filtered.length - 1
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 180px 120px", minWidth: 620, padding: "12px 16px", borderBottom: isLast ? "none" : "0.5px solid #edeae4", backgroundColor: "#ffffff" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9f9f7")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>

                      <div className="flex items-center">
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>{c.pair}</span>
                      </div>
                      <div className="flex items-center">
                        <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: riesgo.color }}>{c.coeficiente.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center">
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, fontWeight: 500, color: riesgo.color, backgroundColor: riesgo.bg, borderRadius: 999, padding: "3px 8px" }}>{riesgo.label}</span>
                      </div>
                      <div className="flex items-center">
                        <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: c.disponibilidad === "mismo_estanque" ? "#15803d" : "#3c3a36", backgroundColor: c.disponibilidad === "mismo_estanque" ? "#f0fdf4" : "#f3f2ef", borderRadius: 4, padding: "2px 7px" }}>
                          {c.disponibilidad === "mismo_estanque" ? "Mismo estanque" : "Estanques distintos"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button type="button"
                          onClick={() => router.push("/dashboard/reproduccion/planear")}
                          style={{ height: 28, padding: "0 12px", borderRadius: 6, border: "none", backgroundColor: "#1a6560", color: "#f9f9f7", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                          Planear
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
