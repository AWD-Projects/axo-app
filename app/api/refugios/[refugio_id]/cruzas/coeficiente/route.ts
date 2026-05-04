import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const hembra_id = searchParams.get("hembra_id")
  const macho_id = searchParams.get("macho_id")

  if (!hembra_id || !macho_id) {
    return NextResponse.json({ error: "hembra_id y macho_id son requeridos" }, { status: 400 })
  }

  const { data: coeficiente } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
    p_individuo_a_id: hembra_id,
    p_individuo_b_id: macho_id,
  })

  const val = coeficiente ?? 0
  const riesgo = val > COEFICIENTE_UMBRAL.danger ? "alto"
    : val > COEFICIENTE_UMBRAL.warning ? "moderado" : "bajo"

  return NextResponse.json({
    data: {
      coeficiente: val,
      riesgo,
      recomendacion: riesgo === "alto" ? "Riesgo alto de endogamia"
        : riesgo === "moderado" ? "Precaución recomendada"
        : "Cruza segura",
    }
  })
}
