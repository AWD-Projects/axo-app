import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; ajolote_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: ajolote } = await supabase
    .from("ajolotes")
    .select("*, madre:madre_id(codigo), padre:padre_id(codigo), estanques(nombre)")
    .eq("id", params.ajolote_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!ajolote) return NextResponse.json({ error: "Ajolote no encontrado" }, { status: 404 })

  const [{ data: eventos }, { data: observaciones }, { data: cruzas }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, tipo, fecha, detalles, post_mortem_analisis, post_mortem_generado_at")
      .eq("ajolote_id", params.ajolote_id)
      .order("fecha", { ascending: false }),
    supabase
      .from("observaciones_clinicas")
      .select("id, fecha_hora, descripcion, severidad")
      .eq("ajolote_id", params.ajolote_id)
      .order("fecha_hora", { ascending: false }),
    supabase
      .from("cruzas")
      .select("id, estado, fecha_inicio, fecha_fin, coeficiente_consanguinidad")
      .or(`hembra_id.eq.${params.ajolote_id},macho_id.eq.${params.ajolote_id}`)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({
    data: {
      ajolote,
      eventos: eventos ?? [],
      observaciones: observaciones ?? [],
      cruzas: cruzas ?? [],
    }
  })
}
