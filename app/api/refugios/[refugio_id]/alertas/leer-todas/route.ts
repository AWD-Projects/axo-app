import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { error, count } = await supabase
    .from("alertas")
    .update({ leida_at: new Date().toISOString() })
    .eq("refugio_id", params.refugio_id)
    .is("leida_at", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true, alertas_leidas: count ?? 0 } })
}
