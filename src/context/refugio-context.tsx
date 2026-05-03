"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/src/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RefugioItem {
  id: string
  nombre: string
  tipo: string
  rol: string
  plan: string
}

export interface UserProfile {
  id: string
  nombre: string
  apellido: string | null
  email: string
  initials: string
}

interface RefugioContextValue {
  user: UserProfile | null
  refugios: RefugioItem[]
  activeRefugioId: string | null
  activeRefugio: RefugioItem | null
  setActiveRefugio: (id: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const RefugioCtx = createContext<RefugioContextValue | null>(null)

const STORAGE_KEY = "axo_active_refugio"

export function RefugioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [refugios, setRefugios] = useState<RefugioItem[]>([])
  const [activeRefugioId, setActiveRefugioIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const [profileRes, refugiosRes] = await Promise.all([
      supabase.from("usuarios_perfil").select("id, nombre, apellido, email").eq("id", authUser.id).single(),
      fetch("/api/refugios"),
    ])

    if (!profileRes.error && profileRes.data) {
      const p = profileRes.data
      const initials = ((p.nombre?.[0] ?? "") + (p.apellido?.[0] ?? "")).toUpperCase()
        || authUser.email?.[0]?.toUpperCase()
        || "U"
      setUser({ id: authUser.id, nombre: p.nombre, apellido: p.apellido ?? null, email: p.email, initials })
    }

    if (refugiosRes.ok) {
      const { data } = await refugiosRes.json()
      const list: RefugioItem[] = (data ?? [])
        .map((entry: { rol: string; refugios: { id: string; nombre: string; tipo: string; plan: string } }) => ({
          id: entry.refugios?.id,
          nombre: entry.refugios?.nombre,
          tipo: entry.refugios?.tipo,
          plan: entry.refugios?.plan ?? "pionero",
          rol: entry.rol,
        }))
        .filter((r: RefugioItem) => r.id)

      setRefugios(list)

      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
      const valid = (saved && list.find(r => r.id === saved)) ? saved : list[0]?.id ?? null
      setActiveRefugioIdState(valid)
      if (valid && typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, valid)
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function setActiveRefugio(id: string) {
    setActiveRefugioIdState(id)
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id)
  }

  const activeRefugio = refugios.find(r => r.id === activeRefugioId) ?? null

  return (
    <RefugioCtx.Provider value={{ user, refugios, activeRefugioId, activeRefugio, setActiveRefugio, loading, refresh: fetchData }}>
      {children}
    </RefugioCtx.Provider>
  )
}

export function useRefugio() {
  const ctx = useContext(RefugioCtx)
  if (!ctx) throw new Error("useRefugio must be used within RefugioProvider")
  return ctx
}
