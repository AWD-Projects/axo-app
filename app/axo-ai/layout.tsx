import type { Metadata } from "next"
import { RefugioProvider } from "@/src/context/refugio-context"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AxoAILayout({ children }: { children: React.ReactNode }) {
  return (
    <RefugioProvider>
      <div style={{ backgroundColor: "#f9f9f7", height: "100vh", overflow: "hidden" }}>
        {children}
      </div>
    </RefugioProvider>
  )
}
