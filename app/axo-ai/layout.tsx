import { RefugioProvider } from "@/src/context/refugio-context"

export default function AxoAILayout({ children }: { children: React.ReactNode }) {
  return (
    <RefugioProvider>
      <div style={{ backgroundColor: "#f9f9f7", height: "100vh", overflow: "hidden" }}>
        {children}
      </div>
    </RefugioProvider>
  )
}
