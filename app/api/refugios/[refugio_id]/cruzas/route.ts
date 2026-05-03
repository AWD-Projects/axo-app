import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"

export async function GET(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const hembra_id = searchParams.get("hembra_id")
  const macho_id = searchParams.get("macho_id")

  let query = supabase
    .from("cruzas")
    .select(`
      *,
      hembra:hembra_id(id, codigo, nombre),
      macho:macho_id(id, codigo, nombre),
      estanques(id, nombre),
      puestas(id, fecha_puesta, cantidad_huevos, cantidad_eclosionada)
    `)
    .eq("refugio_id", params.refugio_id)
    .order("created_at", { ascending: false })

  if (estado) query = query.eq("estado", estado as "planeada" | "activa" | "exitosa" | "fallida" | "cancelada")
  if (hembra_id) query = query.eq("hembra_id", hembra_id)
  if (macho_id) query = query.eq("macho_id", macho_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { hembra_id, macho_id, estanque_id, fecha_planeada, notas } = await request.json()

  if (!hembra_id || !macho_id) {
    return NextResponse.json({ error: "hembra_id y macho_id son requeridos" }, { status: 400 })
  }

  // Calcular coeficiente de consanguinidad
  const { data: coeficiente } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
    p_individuo_a_id: hembra_id,
    p_individuo_b_id: macho_id,
  })

  const { data, error } = await supabase
    .from("cruzas")
    .insert({
      refugio_id: params.refugio_id,
      hembra_id, macho_id,
      estanque_id: estanque_id ?? null,
      fecha_planeada: fecha_planeada ?? null,
      notas: notas ?? null,
      coeficiente_consanguinidad: coeficiente ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const warnings: string[] = []
  if ((coeficiente ?? 0) > COEFICIENTE_UMBRAL.danger) {
    warnings.push(`Riesgo alto de endogamia — coeficiente: ${coeficiente} (> ${COEFICIENTE_UMBRAL.danger})`)
  } else if ((coeficiente ?? 0) > COEFICIENTE_UMBRAL.warning) {
    warnings.push(`Coeficiente de consanguinidad moderado: ${coeficiente} (> ${COEFICIENTE_UMBRAL.warning})`)
  }

  return NextResponse.json({ data, warnings }, { status: 201 })
}
