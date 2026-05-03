import { Suspense } from "react"
import { InviteNewClient } from "./client"

export default function InviteNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9f9f7" }}>
          <div
            className="w-5 h-5 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: "#1a6560" }}
          />
        </div>
      }
    >
      <InviteNewClient />
    </Suspense>
  )
}
