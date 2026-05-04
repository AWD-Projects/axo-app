"use client"

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react"
import {
  Sparkles, SquarePen, ArrowUp, Trash2, MessageSquare,
  TriangleAlert, ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  titulo: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  rol: "user" | "assistant"
  contenido: string
  created_at: string
}

interface Usage {
  consultas_realizadas: number
  limite: number | null
  plan: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGERENCIAS = [
  "¿Cuántos ajolotes hay en el inventario activo?",
  "¿Qué alertas están activas ahora mismo?",
  "¿Cómo está la calidad del agua en los estanques?",
  "Resume los últimos eventos registrados",
]

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderInline(text: string, key: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match
  let i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const seg = match[0]
    if (seg.startsWith("**")) {
      parts.push(<strong key={`${key}-b${i++}`} style={{ fontWeight: 600 }}>{seg.slice(2, -2)}</strong>)
    } else {
      parts.push(
        <code key={`${key}-c${i++}`} style={{
          fontFamily: "var(--font-dm-mono), DM Mono, monospace",
          fontSize: "0.9em",
          backgroundColor: "#f5f2ed",
          padding: "1px 4px",
          borderRadius: 4,
          color: "#1a6560",
        }}>{seg.slice(1, -1)}</code>
      )
    }
    last = match.index + seg.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderContent(text: string): React.ReactNode {
  const lines = text.split("\n")
  const result: React.ReactNode[] = []
  const bullets: string[] = []
  let k = 0

  const flushBullets = () => {
    if (bullets.length === 0) return
    result.push(
      <ul key={k++} style={{ margin: "6px 0 6px 4px", paddingLeft: 16, listStyleType: "disc" }}>
        {bullets.map((item, i) => (
          <li key={i} style={{ marginBottom: 3, color: "#3a3730" }}>
            {renderInline(item, `ul-${k}-${i}`)}
          </li>
        ))}
      </ul>
    )
    bullets.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      bullets.push(trimmed.slice(2))
    } else if (/^\d+\.\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^\d+\.\s/, ""))
    } else {
      flushBullets()
      if (line.trim() === "") {
        result.push(<div key={k++} style={{ height: 6 }} />)
      } else {
        result.push(
          <p key={k++} style={{ margin: 0, marginBottom: 4, color: "#3a3730", lineHeight: 1.55 }}>
            {renderInline(line, `p-${k}`)}
          </p>
        )
      }
    }
  }
  flushBullets()
  return <>{result}</>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
}

function isPostMortem(titulo: string): boolean {
  return titulo.startsWith("Post-mortem")
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <>
      <style>{`
        @keyframes axodot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0 8px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            backgroundColor: "#9a958f",
            animationName: "axodot",
            animationDuration: "1.2s",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.18}s`,
            animationTimingFunction: "ease-in-out",
          }} />
        ))}
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AxoAIPage() {
  const { activeRefugioId, activeRefugio } = useRefugio()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!activeRefugioId) return
    setLoadingConversations(true)
    const res = await fetch(`/api/ai/conversations?refugio_id=${activeRefugioId}`)
    if (res.ok) {
      const json = await res.json()
      setConversations(json.data ?? [])
    }
    setLoadingConversations(false)
  }, [activeRefugioId])

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true)
    const res = await fetch(`/api/ai/conversations/${convId}`)
    if (res.ok) {
      const json = await res.json()
      setMessages(json.data?.mensajes ?? [])
    }
    setLoadingMessages(false)
  }, [])

  const loadUsage = useCallback(async () => {
    if (!activeRefugioId) return
    const res = await fetch(`/api/ai/usage?refugio_id=${activeRefugioId}`)
    if (res.ok) {
      const json = await res.json()
      setUsage(json.data)
    }
  }, [activeRefugioId])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { loadUsage() }, [loadUsage])

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId)
    else setMessages([])
  }, [activeConvId, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  // ── Actions ───────────────────────────────────────────────────────────────────

  const startNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  const selectConversation = (id: string) => {
    setActiveConvId(id)
    setInput("")
  }

  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConvId === convId) {
      setActiveConvId(null)
      setMessages([])
    }
    fetch(`/api/ai/conversations/${convId}`, { method: "DELETE" }).catch(() => {
      loadConversations()
    })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || !activeRefugioId) return

    const atLimit = usage?.limite !== null && usage !== null &&
      usage.consultas_realizadas >= (usage.limite ?? Infinity)
    if (atLimit) return

    setSending(true)
    setInput("")

    // Optimistic user message
    const tempId = `temp-${Date.now()}`
    const userMsg: Message = {
      id: tempId,
      rol: "user",
      contenido: text.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    let convId = activeConvId

    // Create conversation if needed
    if (!convId) {
      const titulo = text.trim().slice(0, 60) + (text.trim().length > 60 ? "…" : "")
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refugio_id: activeRefugioId, titulo }),
      })
      if (!res.ok) { setSending(false); return }
      const json = await res.json()
      convId = json.data.id
      setActiveConvId(convId)
      setConversations(prev => [json.data, ...prev])
    }

    // Send message
    const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: text.trim(), refugio_id: activeRefugioId }),
    })

    setSending(false)

    if (res.ok) {
      const json = await res.json()
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        rol: "assistant",
        contenido: json.data.respuesta,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setUsage(prev => prev ? {
        ...prev,
        consultas_realizadas: prev.consultas_realizadas + 1,
      } : prev)
      // Refresh conversation list (update updated_at)
      loadConversations()
    } else {
      const err = await res.json()
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        rol: "assistant",
        contenido: err.error ?? "Ocurrió un error al procesar tu consulta.",
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ── Usage state ────────────────────────────────────────────────────────────

  const atLimit = usage !== null && usage.limite !== null &&
    usage.consultas_realizadas >= usage.limite
  const nearLimit = usage !== null && usage.limite !== null && !atLimit &&
    usage.consultas_realizadas >= usage.limite - 5
  const showBanner = nearLimit || atLimit

  const activeConv = conversations.find(c => c.id === activeConvId)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    }}>

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 260,
        minWidth: 260,
        borderRight: "0.5px solid #e5e2dc",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fafaf8",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "0.5px solid #e5e2dc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/dashboard"
              title="Volver al dashboard"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: "0.5px solid #e5e2dc",
                backgroundColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6b6660", textDecoration: "none",
              }}
            >
              <ArrowLeft size={13} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color="#1a6560" />
              <span style={{
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 14, fontWeight: 500, color: "#0d0d0d",
              }}>Axo AI</span>
            </div>
          </div>
          <button
            onClick={startNewConversation}
            title="Nueva conversación"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: "0.5px solid #e5e2dc",
              backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6b6660",
            }}
          >
            <SquarePen size={13} />
          </button>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {loadingConversations ? (
            <>
              <style>{`
                @keyframes axo-shimmer {
                  0% { background-position: -200px 0; }
                  100% { background-position: 200px 0; }
                }
                .axo-skel {
                  background: linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%);
                  background-size: 400px 100%;
                  animation: axo-shimmer 1.4s ease-in-out infinite;
                  border-radius: 5px;
                }
              `}</style>
              {[80, 60, 72, 50, 65].map((w, i) => (
                <div key={i} style={{
                  padding: "8px 10px", display: "flex", alignItems: "flex-start",
                  gap: 8, marginBottom: 2,
                }}>
                  <div className="axo-skel" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
                    <div className="axo-skel" style={{ height: 10, width: `${w}%` }} />
                    <div className="axo-skel" style={{ height: 8, width: "40%" }} />
                  </div>
                </div>
              ))}
            </>
          ) : conversations.length === 0 ? (
            <div style={{
              padding: "24px 12px",
              textAlign: "center",
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: 12, color: "#9a958f",
            }}>
              No hay conversaciones aún
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeConvId
              const isHovered = conv.id === hoveredConvId
              const pm = isPostMortem(conv.titulo)
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  role="button"
                  onMouseEnter={() => setHoveredConvId(conv.id)}
                  onMouseLeave={() => setHoveredConvId(null)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    backgroundColor: isActive ? "#e2f0ee" : isHovered ? "#f0ede8" : "transparent",
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    position: "relative",
                    transition: "background-color 0.12s",
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    backgroundColor: pm ? "#0d0d0d" : isActive ? "#1a6560" : "#e5e2dc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 1,
                  }}>
                    {pm
                      ? <Sparkles size={12} color="#9a958f" />
                      : <MessageSquare size={12} color={isActive ? "#ffffff" : "#9a958f"} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      fontSize: 12, fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#0d0d0d" : "#3a3730",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      lineHeight: 1.4,
                    }}>
                      {conv.titulo}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-dm-mono), DM Mono, monospace",
                      fontSize: 10, color: "#9a958f", marginTop: 2,
                    }}>
                      {relativeTime(conv.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    title="Eliminar conversación"
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: "none", backgroundColor: "transparent",
                      cursor: "pointer", color: "#9a958f",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      opacity: isHovered || isActive ? 1 : 0,
                      transition: "opacity 0.12s",
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Refuge context footer */}
        <div style={{
          padding: "12px 16px",
          borderTop: "0.5px solid #e5e2dc",
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#1a6560", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#9a958f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeRefugio?.nombre ?? "Sin refugio"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#ffffff" }}>

        {/* Usage banner */}
        {showBanner && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 24px",
            backgroundColor: atLimit ? "#fef2f2" : "#fffbeb",
            borderBottom: `0.5px solid ${atLimit ? "#fecaca" : "#fde68a"}`,
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 12,
            color: atLimit ? "#991b1b" : "#92400e",
          }}>
            <TriangleAlert size={13} />
            {atLimit
              ? `Límite de ${usage!.limite} consultas mensuales alcanzado. Actualiza tu plan para continuar.`
              : `${usage!.limite! - usage!.consultas_realizadas} consultas restantes este mes.`
            }
          </div>
        )}

        {/* Messages area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Empty state */}
          {!loadingMessages && messages.length === 0 && (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 16,
              paddingBottom: 40,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                backgroundColor: "#e2f0ee",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={24} color="#1a6560" />
              </div>
              <div>
                <p style={{
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 18, fontWeight: 500, color: "#0d0d0d", margin: 0,
                }}>¿En qué puedo ayudarte?</p>
                <p style={{
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 13, color: "#9a958f", margin: "6px 0 0",
                }}>Consulta datos del refugio, analiza tendencias o registra eventos.</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 460 }}>
                {SUGERENCIAS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      height: 34, borderRadius: 8, padding: "0 14px",
                      border: "0.5px solid #e5e2dc",
                      backgroundColor: "#fafaf8",
                      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      fontSize: 12, color: "#3a3730",
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => {
            if (msg.rol === "user") {
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <div style={{
                    maxWidth: "72%",
                    backgroundColor: "#e2f0ee",
                    borderRadius: "12px 12px 2px 12px",
                    padding: "10px 14px",
                    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                    fontSize: 13, color: "#0d0d0d", lineHeight: 1.55,
                  }}>
                    {msg.contenido}
                  </div>
                </div>
              )
            }

            // Assistant message
            const pm = activeConv ? isPostMortem(activeConv.titulo) : false
            if (pm) {
              return (
                <div key={msg.id} style={{ marginBottom: 20 }}>
                  <div style={{
                    backgroundColor: "#0d0d0d",
                    borderRadius: 12,
                    padding: "16px 20px",
                    color: "#e8e4de",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Sparkles size={14} color="#9a958f" />
                      <span style={{
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                        fontSize: 11, fontWeight: 500, color: "#9a958f",
                        letterSpacing: "0.05em", textTransform: "uppercase",
                      }}>Análisis post-mortem</span>
                    </div>
                    <div style={{
                      fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      fontSize: 13, lineHeight: 1.65, color: "#e8e4de",
                    }}>
                      {renderContent(msg.contenido)}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: "#e2f0ee",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2,
                }}>
                  <Sparkles size={13} color="#1a6560" />
                </div>
                <div style={{
                  flex: 1,
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  fontSize: 13, color: "#0d0d0d", paddingTop: 4,
                }}>
                  {renderContent(msg.contenido)}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {sending && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: "#e2f0ee",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Sparkles size={13} color="#1a6560" />
              </div>
              <div style={{ paddingTop: 6 }}>
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{
          borderTop: "0.5px solid #e5e2dc",
          padding: "16px 24px 20px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "0.5px solid #e5e2dc",
            borderRadius: 12,
            padding: "10px 12px",
            backgroundColor: atLimit ? "#fafaf8" : "#ffffff",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={atLimit ? "Límite de consultas alcanzado" : "Escribe una consulta… (Enter para enviar)"}
              disabled={atLimit || sending}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                fontSize: 13,
                color: "#0d0d0d",
                backgroundColor: "transparent",
                lineHeight: 1.5,
                maxHeight: 100,
                overflowY: "auto",
              }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = `${Math.min(el.scrollHeight, 100)}px`
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending || atLimit}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: "none",
                backgroundColor: !input.trim() || sending || atLimit ? "transparent" : "#1a6560",
                color: !input.trim() || sending || atLimit ? "#c4bfb8" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: !input.trim() || sending || atLimit ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              <ArrowUp size={15} />
            </button>
          </div>
          <p style={{
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 10, color: "#c4bfb8", margin: "6px 0 0", textAlign: "center",
          }}>
            Axo AI puede cometer errores. Verifica información crítica antes de actuar.
            {usage && usage.limite !== null && !atLimit && (
              <> · {usage.consultas_realizadas}/{usage.limite} consultas usadas</>
            )}
          </p>
        </div>
      </div>

    </div>
  )
}
