"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, ArrowRight, Send } from "lucide-react"

const SUGGESTIONS = [
  "¿Cómo va el pH esta semana?",
  "Ajolotes con mayor riesgo sanitario",
  "Genera un resumen para el reporte UMA",
]

export function AxoAIFloat() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", onKey)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  function submit(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setOpen(false)
    setQuery("")
    router.push(`/dashboard/ai?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-2">
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              width: 300,
              backgroundColor: "#0d0d0d",
              boxShadow: "0 8px 40px rgba(0,0,0,0.36)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: "#1a9e98" }} />
                <span className="text-sm font-semibold text-white">Axo AI</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/ai"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: "#4ecdc4" }}
                >
                  Abrir <ArrowRight size={12} />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ color: "#6b6560", background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#9a958f")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6560")}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="flex flex-col gap-1 p-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm w-full transition-colors"
                  style={{ backgroundColor: "#161616", color: "#d4d0ca", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e1e1e")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#161616")}
                >
                  <span className="line-clamp-1">{s}</span>
                  <ArrowRight size={12} className="shrink-0 ml-2" style={{ color: "#6b6560" }} />
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 pt-0">
              <div
                className="flex items-center gap-2 rounded-lg px-3"
                style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", height: 40 }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit(query)}
                  placeholder="Pregúntale algo a Axo…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#4a4a4a]"
                  style={{ color: "#f9f9f7", border: "none" }}
                />
                <button
                  type="button"
                  onClick={() => submit(query)}
                  disabled={!query.trim()}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: query.trim() ? "pointer" : "default",
                    color: query.trim() ? "#1a9e98" : "#3a3a3a",
                    lineHeight: 0,
                    transition: "color 0.15s",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full font-medium text-white select-none"
        style={{
          backgroundColor: "#0d0d0d",
          padding: "13px 22px",
          fontSize: 15,
          boxShadow: "0 4px 24px rgba(0,0,0,0.32)",
          border: "1px solid #1e1e1e",
          cursor: "pointer",
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.12 }}
      >
        <Sparkles size={17} style={{ color: "#1a9e98" }} />
        Axo AI
      </motion.button>
    </div>
  )
}
