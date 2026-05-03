import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; cruza_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: cruza } = await supabase
    .from("cruzas")
    .select("hembra_id, macho_id")
    .eq("id", params.cruza_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (!cruza) return NextResponse.json({ error: "Cruza no encontrada" }, { status: 404 })

  const { data: coeficiente } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
    p_individuo_a_id: cruza.hembra_id,
    p_individuo_b_id: cruza.macho_id,
  })

  const riesgo = (coeficiente ?? 0) > COEFICIENTE_UMBRAL.danger ? "alto"
    : (coeficiente ?? 0) > COEFICIENTE_UMBRAL.warning ? "moderado" : "bajo"

  return NextResponse.json({
    data: {
      coeficiente: coeficiente ?? 0,
      riesgo,
      recomendacion: riesgo === "alto" ? "No recomendada — riesgo alto de endogamia"
        : riesgo === "moderado" ? "Proceder con precaución"
        : "Cruza segura"
    }
  })
}
