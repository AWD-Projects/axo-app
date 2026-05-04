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
    .select("id, tipo, periodo_inicio, periodo_fin, generado_at, pdf_url, pdf_storage_path, generado_por")
    .eq("refugio_id", params.refugio_id)
    .order("generado_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = Array.from(new Set((data ?? []).map(r => r.generado_por).filter(Boolean)))
  const nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: perfiles } = await supabase
      .from("usuarios_perfil")
      .select("id, nombre, apellido")
      .in("id", userIds)
    for (const p of perfiles ?? []) {
      nameMap[p.id] = [p.nombre, p.apellido].filter(Boolean).join(" ")
    }
  }

  const enriched = (data ?? []).map(r => ({
    ...r,
    generado_por_nombre: r.generado_por ? (nameMap[r.generado_por] ?? null) : null,
  }))

  return NextResponse.json({ data: enriched })
}
