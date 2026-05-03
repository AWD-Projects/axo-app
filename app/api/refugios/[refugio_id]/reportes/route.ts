import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("reportes_generados")
    .select("id, tipo, periodo_inicio, periodo_fin, generado_at, pdf_url, pdf_storage_path")
    .eq("refugio_id", params.refugio_id)
    .order("generado_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
