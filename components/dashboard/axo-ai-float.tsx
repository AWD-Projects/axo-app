"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Sparkles, X, ArrowUp, Activity, Clock, GitBranch, BarChart2, ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetState = "closed" | "open" | "thinking" | "response"

// ── Constants ─────────────────────────────────────────────────────────────────

const CHIPS = [
  { Icon: Activity,   text: "¿Qué estanques tienen parámetros fuera de rango?" },
  { Icon: Clock,      text: "¿Cuánto falta para el reporte UMA?" },
  { Icon: GitBranch,  text: "¿Cuál es la cruza con menor riesgo genético?" },
  { Icon: BarChart2,  text: "Resumen de actividad de esta semana" },
] as const

// ── Thinking dots ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <>
      <style>{`
        @keyframes floatdot {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
        backgroundColor: "#f9f9f7", border: "0.5px solid #e5e2dc",
        borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              backgroundColor: "#1a6560",
              animationName: "floatdot",
              animationDuration: "1.2s",
              animationIterationCount: "infinite",
              animationDelay: `${i * 0.15}s`,
              animationTimingFunction: "ease-in-out",
            }} />
          ))}
        </div>
        <span style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 11, color: "#9a958f",
        }}>Analizando…</span>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AxoAIFloat() {
  const { activeRefugioId, activeRefugio } = useRefugio()
  const router = useRouter()

  const [wState, setWState] = useState<WidgetState>("closed")
  const [input, setInput] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)

  const cardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load unread alerts count ─────────────────────────────────────────────

  const loadAlertCount = useCallback(async () => {
    if (!activeRefugioId) return
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/alertas`)
      if (!res.ok) return
      const json = await res.json()
      const unread = (json.data ?? []).filter(
        (a: { leida_at: string | null; resuelta_at: string | null }) =>
          !a.leida_at && !a.resuelta_at
      ).length
      setAlertCount(unread)
    } catch { /* ignore */ }
  }, [activeRefugioId])

  useEffect(() => { loadAlertCount() }, [loadAlertCount])

  // ── Keyboard + outside click ─────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && wState !== "closed") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [wState])

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        close()
      }
    }
    if (wState !== "closed") document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [wState])

  useEffect(() => {
    if (wState === "open") setTimeout(() => inputRef.current?.focus(), 160)
  }, [wState])

  // ── Actions ───────────────────────────────────────────────────────────────

  function open() {
    setWState("open")
    setInput("")
    setResponse(null)
    setConvId(null)
  }

  function close() {
    setWState("closed")
    setInput("")
    setResponse(null)
  }

  function toggle() {
    wState === "closed" ? open() : close()
  }

  function resetToOpen() {
    setWState("open")
    setInput("")
    setResponse(null)
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || !activeRefugioId) return
    setInput(trimmed)
    setWState("thinking")

    try {
      // Create conversation
      const convRes = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refugio_id: activeRefugioId,
          titulo: trimmed.slice(0, 60) + (trimmed.length > 60 ? "…" : ""),
        }),
      })
      if (!convRes.ok) throw new Error("conv")
      const convJson = await convRes.json()
      const cid = convJson.data.id
      setConvId(cid)

      // Send message
      const msgRes = await fetch(`/api/ai/conversations/${cid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: trimmed, refugio_id: activeRefugioId }),
      })
      if (!msgRes.ok) throw new Error("msg")
      const msgJson = await msgRes.json()
      setResponse(msgJson.data.respuesta)
      setWState("response")
    } catch {
      setResponse("No pude conectar con Axo AI en este momento. Intenta desde el chat completo.")
      setWState("response")
    }
  }

  function openFullChat() {
    close()
    if (convId) router.push(`/axo-ai`)
    else router.push("/axo-ai")
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isOpen = wState !== "closed"
  const refugeName = activeRefugio?.nombre ?? "Sin refugio"
  const showBadge = alertCount > 0 && wState === "closed"

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .axo-float-card {
            width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin-bottom: 0 !important;
          }
        }
      `}</style>

      <div
        ref={cardRef}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {/* ── Card ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="axo-float-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                width: 360,
                backgroundColor: "#ffffff",
                border: "0.5px solid #e5e2dc",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(13,13,13,0.10)",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                backgroundColor: "#0d0d0d",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    backgroundColor: "rgba(26,101,96,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Sparkles size={12} color="#e2f0ee" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      fontSize: 13, fontWeight: 500, color: "#f9f9f7",
                    }}>Axo AI</span>
                    <span style={{
                      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      fontSize: 10, color: "#9a958f",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: 180,
                    }}>{refugeName}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Link
                    href="/axo-ai"
                    onClick={close}
                    title="Abrir chat completo"
                    style={{
                      width: 26, height: 26, borderRadius: 6,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#9a958f", textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={12} />
                  </Link>
                  <button
                    onClick={close}
                    style={{
                      width: 26, height: 26, borderRadius: 6,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#9a958f",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 16 }}>
                <AnimatePresence mode="wait">

                  {/* ── State 2: chips + input ────────────────────────── */}
                  {(wState === "open") && (
                    <motion.div
                      key="chips"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <p style={{
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                        fontSize: 10, fontWeight: 500, color: "#9a958f",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        margin: "0 0 8px",
                      }}>Preguntas rápidas</p>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {CHIPS.map(({ Icon, text }) => (
                          <button
                            key={text}
                            onClick={() => send(text)}
                            style={{
                              backgroundColor: "#f9f9f7",
                              border: "0.5px solid #e5e2dc",
                              borderRadius: 8,
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "border-color 0.12s, background-color 0.12s",
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = "#1a6560"
                              e.currentTarget.style.backgroundColor = "#f4faf9"
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = "#e5e2dc"
                              e.currentTarget.style.backgroundColor = "#f9f9f7"
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: 6,
                              backgroundColor: "#e2f0ee",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              <Icon size={11} color="#1a6560" />
                            </div>
                            <span style={{
                              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                              fontSize: 12, color: "#3c3a36", lineHeight: 1.3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              flex: 1,
                            }}>{text}</span>
                          </button>
                        ))}
                      </div>

                      <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "0 0 10px" }} />

                      {/* Input row */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && send(input)}
                          placeholder="Escribe tu pregunta..."
                          style={{
                            flex: 1, height: 34,
                            backgroundColor: "#ffffff",
                            border: "0.5px solid #e5e2dc",
                            borderRadius: 8,
                            padding: "0 10px",
                            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                            fontSize: 12, color: "#0d0d0d",
                            outline: "none",
                          }}
                          onFocus={e => {
                            e.currentTarget.style.border = "1.5px solid #1a6560"
                            e.currentTarget.style.boxShadow = "0 0 0 2px #e2f0ee"
                          }}
                          onBlur={e => {
                            e.currentTarget.style.border = "0.5px solid #e5e2dc"
                            e.currentTarget.style.boxShadow = "none"
                          }}
                        />
                        <button
                          onClick={() => send(input)}
                          disabled={!input.trim()}
                          style={{
                            width: 34, height: 34, borderRadius: 8,
                            border: "none",
                            backgroundColor: input.trim() ? "#1a6560" : "#e5e2dc",
                            color: input.trim() ? "#f9f9f7" : "#9a958f",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: input.trim() ? "pointer" : "not-allowed",
                            flexShrink: 0,
                            transition: "background-color 0.12s, color 0.12s",
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── State 3a: thinking ────────────────────────────── */}
                  {wState === "thinking" && (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ThinkingDots />
                      <div style={{
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                        fontSize: 11, color: "#9a958f",
                        backgroundColor: "#f9f9f7",
                        borderRadius: 8, padding: "8px 12px",
                        border: "0.5px solid #e5e2dc",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {input}
                      </div>
                    </motion.div>
                  )}

                  {/* ── State 3b: response ────────────────────────────── */}
                  {wState === "response" && (
                    <motion.div
                      key="response"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Response card */}
                      <div style={{
                        backgroundColor: "#f9f9f7",
                        border: "0.5px solid #e5e2dc",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 8,
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 4, marginBottom: 4,
                        }}>
                          <Sparkles size={10} color="#1a6560" />
                          <span style={{
                            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                            fontSize: 10, fontWeight: 500, color: "#1a6560",
                          }}>Axo AI</span>
                        </div>
                        <p style={{
                          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                          fontSize: 12, color: "#3c3a36", lineHeight: 1.5,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                          {response}
                        </p>
                      </div>

                      <div style={{ borderTop: "0.5px solid #e5e2dc", margin: "0 0 8px" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          onClick={resetToOpen}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                            fontSize: 11, color: "#9a958f",
                            padding: 0,
                            transition: "color 0.12s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#0d0d0d")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#9a958f")}
                        >
                          Nueva pregunta
                        </button>
                        <button
                          onClick={openFullChat}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                            fontSize: 11, fontWeight: 500, color: "#1a6560",
                            padding: 0,
                          }}
                        >
                          Abrir chat completo →
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Trigger button ─────────────────────────────────────────────── */}
        <div style={{ position: "relative", display: "inline-flex" }}>
          <motion.button
            type="button"
            onClick={toggle}
            whileHover={{ backgroundColor: "#1a1a1a" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              backgroundColor: "#0d0d0d",
              borderRadius: 20,
              padding: "10px 16px",
              boxShadow: "0 4px 16px rgba(13,13,13,0.16)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              backgroundColor: "rgba(26,101,96,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Sparkles size={10} color="#e2f0ee" />
            </div>
            <span style={{
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 13, fontWeight: 500, color: "#f9f9f7",
            }}>Axo AI</span>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: "#1a6560",
              flexShrink: 0,
            }} />
          </motion.button>

          {/* Notification badge */}
          {showBadge && (
            <div style={{
              position: "absolute",
              top: -4, right: -4,
              width: 16, height: 16,
              borderRadius: "50%",
              backgroundColor: "#991b1b",
              border: "2px solid #f9f9f7",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                fontSize: 9, fontWeight: 500, color: "#ffffff",
                lineHeight: 1,
              }}>{alertCount > 9 ? "9+" : alertCount}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
