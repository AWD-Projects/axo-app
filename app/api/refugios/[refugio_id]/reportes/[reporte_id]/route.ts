import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; reporte_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("reportes_generados")
    .select("*")
    .eq("id", params.reporte_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })
  return NextResponse.json({ data })
}
