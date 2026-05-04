import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"

const MAX_COMBINATIONS = 300

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Fetch all live machos and hembras
  const [{ data: machos }, { data: hembras }] = await Promise.all([
    supabase.from("ajolotes").select("id, codigo, nombre, estanque_id, estanques(id, nombre)")
      .eq("refugio_id", params.refugio_id).eq("estado", "vivo").eq("sexo", "macho"),
    supabase.from("ajolotes").select("id, codigo, nombre, estanque_id, estanques(id, nombre)")
      .eq("refugio_id", params.refugio_id).eq("estado", "vivo").eq("sexo", "hembra"),
  ])

  const m = machos ?? []
  const h = hembras ?? []

  if (m.length === 0 || h.length === 0) {
    return NextResponse.json({
      data: {
        combinaciones: [],
        total_machos: m.length,
        total_hembras: h.length,
        total_combinaciones: 0,
      }
    })
  }

  // Build all pairs, cap at MAX_COMBINATIONS
  const pairs: { macho: typeof m[0]; hembra: typeof h[0] }[] = []
  outer: for (const macho of m) {
    for (const hembra of h) {
      pairs.push({ macho, hembra })
      if (pairs.length >= MAX_COMBINATIONS) break outer
    }
  }

  // Compute coefficients in parallel
  const results = await Promise.all(
    pairs.map(async ({ macho, hembra }) => {
      const { data: coef } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
        p_individuo_a_id: macho.id,
        p_individuo_b_id: hembra.id,
      })
      const val = coef ?? 0
      const riesgo = val > COEFICIENTE_UMBRAL.danger ? "alto"
        : val > COEFICIENTE_UMBRAL.warning ? "moderado" : "bajo"

      const mismoEstanque = macho.estanque_id && hembra.estanque_id
        && macho.estanque_id === hembra.estanque_id

      return {
        pair: `${macho.codigo} × ${hembra.codigo}`,
        macho_id: macho.id,
        macho_codigo: macho.codigo,
        hembra_id: hembra.id,
        hembra_codigo: hembra.codigo,
        coeficiente: val,
        riesgo,
        disponibilidad: mismoEstanque ? "mismo_estanque" : "estanques_distintos",
      }
    })
  )

  // Sort by coeficiente ascending
  results.sort((a, b) => a.coeficiente - b.coeficiente)

  const totalCombinaciones = m.length * h.length
  const byRiesgo = { bajo: 0, moderado: 0, alto: 0 }
  results.forEach(r => { byRiesgo[r.riesgo as keyof typeof byRiesgo]++ })

  return NextResponse.json({
    data: {
      combinaciones: results,
      total_machos: m.length,
      total_hembras: h.length,
      total_combinaciones: totalCombinaciones,
      truncado: totalCombinaciones > MAX_COMBINATIONS,
      por_riesgo: byRiesgo,
    }
  })
}
