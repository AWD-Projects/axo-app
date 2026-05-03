"use client"

import { RefugioProvider } from "@/src/context/refugio-context"
import { DockSidebar } from "@/components/dashboard/dock"
import { AxoAIFloat } from "@/components/dashboard/axo-ai-float"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <RefugioProvider>
      <div style={{ backgroundColor: "#f9f9f7", minHeight: "100vh" }}>
        <DockSidebar />
        <main className="lg:ml-[244px] pt-[52px] lg:pt-8 lg:pr-4 lg:pb-4 px-4 pb-4 lg:pl-0">
          {children}
        </main>
        <AxoAIFloat />
      </div>
    </RefugioProvider>
  )
}
