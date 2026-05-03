import { type LucideIcon } from "lucide-react"

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center px-6 py-8 ${className ?? ""}`}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: "#e5e2dc" }} />
      <h3 className="mt-4 text-[15px] font-medium" style={{ color: "#0d0d0d" }}>
        {title}
      </h3>
      <p
        className="mt-1.5 text-[12px] leading-[1.6]"
        style={{ color: "#9a958f", maxWidth: 200 }}
      >
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 px-4 rounded-[8px] text-[12px] font-medium transition-colors duration-150"
          style={{
            height: 32,
            ...(action.variant === "secondary"
              ? {
                  border: "0.5px solid #e5e2dc",
                  color: "#0d0d0d",
                  backgroundColor: "transparent",
                }
              : {
                  backgroundColor: "#1a6560",
                  color: "#f9f9f7",
                  border: "none",
                }),
          }}
          onMouseEnter={(e) => {
            if (action.variant !== "secondary")
              e.currentTarget.style.backgroundColor = "#144f4b"
          }}
          onMouseLeave={(e) => {
            if (action.variant !== "secondary")
              e.currentTarget.style.backgroundColor = "#1a6560"
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
