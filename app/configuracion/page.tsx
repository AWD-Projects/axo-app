"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Home, Users, Key, Mail, User, CreditCard } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"
import { Skeleton } from "@/components/ui/skeleton"
import DatosRefugio from "@/components/configuracion/datos-refugio"
import Usuarios from "@/components/configuracion/usuarios"
import Codigos from "@/components/configuracion/codigos"
import Perfil from "@/components/configuracion/perfil"
import PlanUso from "@/components/configuracion/plan-uso"
import Invitaciones from "@/components/configuracion/invitaciones"

type Section = "datos" | "usuarios" | "codigos" | "invitaciones" | "perfil" | "plan"

const NAV_REFUGIO: { id: Section; icon: React.ElementType; label: string }[] = [
  { id: "datos",         icon: Home,       label: "Datos del refugio" },
  { id: "usuarios",      icon: Users,      label: "Usuarios y permisos" },
  { id: "codigos",       icon: Key,        label: "Códigos de acceso" },
  { id: "invitaciones",  icon: Mail,       label: "Invitaciones" },
]

const NAV_CUENTA: { id: Section; icon: React.ElementType; label: string }[] = [
  { id: "perfil", icon: User,       label: "Perfil" },
  { id: "plan",   icon: CreditCard, label: "Plan y uso" },
]

function ConfiguracionSkeleton() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#f9f9f7" }}>
      {/* Left nav skeleton */}
      <div style={{
        width: 220, minWidth: 220,
        backgroundColor: "#ffffff",
        borderRight: "0.5px solid #e5e2dc",
        display: "flex", flexDirection: "column",
        padding: "16px 8px",
      }}>
        <Skeleton style={{ width: 90, height: 12, borderRadius: 6, margin: "6px 10px 16px" }} />
        <div style={{ borderBottom: "0.5px solid #e5e2dc", marginBottom: 12 }} />
        <Skeleton style={{ width: 50, height: 8, borderRadius: 4, margin: "0 10px 8px" }} />
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} style={{ height: 32, borderRadius: 8, marginBottom: 4 }} />
        ))}
        <Skeleton style={{ width: 60, height: 8, borderRadius: 4, margin: "12px 10px 8px" }} />
        {[1, 2].map(i => (
          <Skeleton key={i} style={{ height: 32, borderRadius: 8, marginBottom: 4 }} />
        ))}
      </div>

      {/* Right content skeleton */}
      <div style={{ flex: 1, padding: 24, backgroundColor: "#f9f9f7" }}>
        <Skeleton style={{ width: 160, height: 18, borderRadius: 6, marginBottom: 6 }} />
        <Skeleton style={{ width: 240, height: 12, borderRadius: 4, marginBottom: 24 }} />

        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <Skeleton style={{ width: 120, height: 14, borderRadius: 5, marginBottom: 16 }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: 16 }}>
              <Skeleton style={{ width: 80, height: 10, borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 10, padding: 20 }}>
          <Skeleton style={{ width: 140, height: 14, borderRadius: 5, marginBottom: 16 }} />
          {[1, 2].map(i => (
            <div key={i} style={{ marginBottom: 16 }}>
              <Skeleton style={{ width: 90, height: 10, borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  const { activeRefugioId, user, activeRefugio } = useRefugio()
  const [section, setSection] = useState<Section>("datos")
  const router = useRouter()

  if (!activeRefugioId || !user) return <ConfiguracionSkeleton />

  const isAdmin = activeRefugio?.rol === "admin"

  const ADMIN_ONLY_SECTIONS: Section[] = ["usuarios", "codigos", "invitaciones", "plan"]
  if (!isAdmin && ADMIN_ONLY_SECTIONS.includes(section)) {
    setSection("datos")
  }

  function NavItem({ id, icon: Icon, label }: { id: Section; icon: React.ElementType; label: string }) {
    const active = section === id
    return (
      <button
        onClick={() => setSection(id)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 8, width: "100%",
          border: "none", cursor: "pointer", textAlign: "left",
          backgroundColor: active ? "#1a6560" : "transparent",
          color: active ? "#f9f9f7" : "#3c3a36",
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 12, fontWeight: active ? 500 : 400,
          transition: "background-color 0.12s",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = "#f5f2ed" }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
      >
        <Icon size={15} style={{ color: active ? "#f9f9f7" : "#9a958f", flexShrink: 0 }} />
        {label}
      </button>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <p style={{
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        fontSize: 10, fontWeight: 500, color: "#9a958f",
        letterSpacing: "0.06em", textTransform: "uppercase",
        padding: "8px 8px 4px", margin: 0,
      }}>{label}</p>
    )
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#f9f9f7",
    }}>
      {/* ── Left nav ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 220, minWidth: 220,
        backgroundColor: "#ffffff",
        borderRight: "0.5px solid #e5e2dc",
        display: "flex", flexDirection: "column",
        padding: "16px 8px",
        overflowY: "auto",
      }}>
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8,
            border: "none", cursor: "pointer", textAlign: "left",
            backgroundColor: "transparent", color: "#9a958f",
            fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
            fontSize: 12, marginBottom: 4,
            transition: "background-color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f5f2ed" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent" }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>

        <p style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 13, fontWeight: 500, color: "#0d0d0d",
          padding: "8px 8px 12px", margin: 0,
          borderBottom: "0.5px solid #e5e2dc",
          marginBottom: 8,
        }}>Configuración</p>

        <SectionLabel label="Refugio" />
        {NAV_REFUGIO.filter(item => {
          if (!isAdmin && (item.id === "usuarios" || item.id === "codigos" || item.id === "invitaciones")) return false
          return true
        }).map(item => <NavItem key={item.id} {...item} />)}

        <SectionLabel label="Mi cuenta" />
        {NAV_CUENTA.filter(item => isAdmin || item.id !== "plan").map(item => <NavItem key={item.id} {...item} />)}
      </div>

      {/* ── Right content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, backgroundColor: "#f9f9f7" }}>
        {section === "datos"        && <DatosRefugio refugioId={activeRefugioId} isAdmin={isAdmin} />}
        {section === "usuarios"     && <Usuarios refugioId={activeRefugioId} currentUserId={user.id} isAdmin={isAdmin} />}
        {section === "codigos"      && <Codigos refugioId={activeRefugioId} refugioNombre={activeRefugio?.nombre ?? ""} />}
        {section === "invitaciones" && <Invitaciones refugioId={activeRefugioId} />}
        {section === "perfil"       && <Perfil currentUserId={user.id} />}
        {section === "plan"         && <PlanUso refugioId={activeRefugioId} />}
      </div>
    </div>
  )
}
