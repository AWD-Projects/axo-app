import { Suspense } from "react"
import { InviteClient } from "./client"

export default function InvitePage() {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <InviteClient />
    </Suspense>
  )
}

function InviteSkeleton() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block w-[45%] min-h-screen" style={{ backgroundColor: "#0d0d0d" }} />
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#f9f9f7" }}>
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6560" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
