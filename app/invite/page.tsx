import { Suspense } from "react"
import { Loader2 } from "lucide-react"
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
        <Loader2 size={20} className="animate-spin" color="#1a6560" />
      </div>
    </div>
  )
}
