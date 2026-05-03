import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"
import { LIMITES_AI } from "@/src/lib/ai/limits"

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const refugio_id = searchParams.get("refugio_id")
  if (!refugio_id) return NextResponse.json({ error: "refugio_id es requerido" }, { status: 400 })

  const { data: membership } = await supabase
    .from("refugio_usuarios")
    .select("rol")
    .eq("refugio_id", refugio_id)
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .single()

  if (!membership) return NextResponse.json({ error: "Sin acceso al refugio" }, { status: 403 })

  const { data: refugio } = await supabase
    .from("refugios")
    .select("plan")
    .eq("id", refugio_id)
    .single()

  const mesActual = new Date().toISOString().slice(0, 7) + "-01"
  const { data: uso } = await supabase
    .from("axo_ai_uso_mensual")
    .select("consultas_realizadas, tokens_input_total, tokens_output_total")
    .eq("refugio_id", refugio_id)
    .eq("mes", mesActual)
    .single()

  const plan = (refugio?.plan ?? "pionero") as keyof typeof LIMITES_AI
  const limite = LIMITES_AI[plan]

  return NextResponse.json({
    data: {
      mes: mesActual,
      plan,
      consultas_realizadas: uso?.consultas_realizadas ?? 0,
      limite: limite === Infinity ? null : limite,
      tokens_input_total: uso?.tokens_input_total ?? 0,
      tokens_output_total: uso?.tokens_output_total ?? 0,
    }
  })
}
