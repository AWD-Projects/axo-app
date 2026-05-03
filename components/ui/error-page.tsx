"use client"

import Link from "next/link"
import { type LucideIcon } from "lucide-react"

interface ErrorPageAction {
  label: string
  href?: string
  onClick?: () => void
  variant: "primary" | "secondary" | "ghost"
}

interface ErrorPageProps {
  icon: LucideIcon
  code: string
  title: string
  description: string
  actions?: ErrorPageAction[]
  note?: string
}

export function ErrorPage({ icon: Icon, code, title, description, actions = [], note }: ErrorPageProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#f9f9f7" }}
    >
      <div className="flex flex-col items-center text-center" style={{ maxWidth: 380 }}>
        <Icon size={36} strokeWidth={1.5} style={{ color: "#e5e2dc" }} />

        <p
          className="mt-4 text-[12px]"
          style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", color: "#9a958f" }}
        >
          {code}
        </p>

        <h1
          className="mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em]"
          style={{ color: "#0d0d0d" }}
        >
          {title}
        </h1>

        <p
          className="mt-2.5 text-[13px] leading-[1.6]"
          style={{ color: "#9a958f" }}
        >
          {description}
        </p>

        {actions.length > 0 && (
          <div className="mt-7 flex flex-col items-center gap-3">
            {actions.map((action, i) => {
              const shared = {
                className: "text-[13px] font-medium rounded-[8px] transition-colors duration-150 flex items-center justify-center",
                style: actionStyle(action.variant),
              }

              if (action.href) {
                return (
                  <Link
                    key={i}
                    href={action.href}
                    className={shared.className}
                    style={{ ...shared.style, minWidth: 180, height: 40, textDecoration: "none" }}
                    onMouseEnter={(e) => applyHover(e, action.variant)}
                    onMouseLeave={(e) => applyBlur(e, action.variant)}
                  >
                    {action.label}
                  </Link>
                )
              }

              if (action.variant === "ghost") {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={action.onClick}
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: "#9a958f", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#3c3a36")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9a958f")}
                  >
                    {action.label}
                  </button>
                )
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className={shared.className}
                  style={{ ...shared.style, minWidth: 180, height: 40 }}
                  onMouseEnter={(e) => applyHover(e, action.variant)}
                  onMouseLeave={(e) => applyBlur(e, action.variant)}
                >
                  {action.label}
                </button>
              )
            })}
          </div>
        )}

        {note && (
          <p
            className="mt-3 text-[11px] text-center"
            style={{ color: "#9a958f" }}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  )
}

function actionStyle(variant: ErrorPageAction["variant"]): React.CSSProperties {
  if (variant === "primary") return { backgroundColor: "#1a6560", color: "#f9f9f7", border: "none" }
  if (variant === "secondary") return { backgroundColor: "transparent", color: "#0d0d0d", border: "0.5px solid #e5e2dc" }
  return { background: "none", border: "none", color: "#9a958f", minWidth: "unset", height: "unset" }
}

function applyHover(e: React.MouseEvent<HTMLElement>, variant: ErrorPageAction["variant"]) {
  if (variant === "primary") e.currentTarget.style.backgroundColor = "#144f4b"
  if (variant === "secondary") e.currentTarget.style.backgroundColor = "#f3f2ef"
}

function applyBlur(e: React.MouseEvent<HTMLElement>, variant: ErrorPageAction["variant"]) {
  if (variant === "primary") e.currentTarget.style.backgroundColor = "#1a6560"
  if (variant === "secondary") e.currentTarget.style.backgroundColor = "transparent"
}
