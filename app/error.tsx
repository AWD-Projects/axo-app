"use client"

import { AlertTriangle } from "lucide-react"
import { ErrorPage } from "@/components/ui/error-page"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      icon={AlertTriangle}
      code={error.digest ?? "ERROR_500"}
      title="Algo salió mal"
      description="Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio."
      actions={[
        { label: "Reintentar", onClick: reset, variant: "primary" },
        { label: "Ir al inicio", href: "/dashboard", variant: "secondary" },
      ]}
    />
  )
}
