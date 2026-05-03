import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/src/types/database"

// Solo usar en server-side: Route Handlers, Edge Functions, Crons
// NUNCA en Client Components
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
