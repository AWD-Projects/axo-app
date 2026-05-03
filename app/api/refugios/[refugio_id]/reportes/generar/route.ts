import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { tipo, periodo_inicio, periodo_fin } = await request.json()

  if (!tipo || !periodo_inicio || !periodo_fin) {
    return NextResponse.json({ error: "tipo, periodo_inicio y periodo_fin son requeridos" }, { status: 400 })
  }

  // Obtener datos del refugio para el snapshot
  const { data: snapshot } = await supabase.rpc("get_refugio_summary", {
    p_refugio_id: params.refugio_id,
    p_inicio: periodo_inicio,
    p_fin: periodo_fin,
  })

  const { data: reporte, error } = await supabase
    .from("reportes_generados")
    .insert({
      refugio_id: params.refugio_id,
      tipo,
      periodo_inicio,
      periodo_fin,
      generado_por: user.id,
      datos_snapshot: snapshot ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: { reporte_id: reporte.id, datos_snapshot: snapshot } }, { status: 202 })
}
