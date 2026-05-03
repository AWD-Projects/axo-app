"use client"

import { Search } from "lucide-react"
import { ErrorPage } from "@/components/ui/error-page"

export default function NotFound() {
  return (
    <ErrorPage
      icon={Search}
      code="ERROR_404"
      title="Página no encontrada"
      description="La dirección que buscas no existe o fue movida a otro lugar."
      actions={[
        { label: "Ir al inicio", href: "/dashboard", variant: "primary" },
        { label: "Volver atrás", href: "/", variant: "secondary" },
      ]}
    />
  )
}
