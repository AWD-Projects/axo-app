import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

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

  const plan = refugio?.plan ?? "pionero"

  const [{ data: planConfig }, { data: uso }] = await Promise.all([
    (supabase
      .from("plan_configuracion" as never)
      .select("limite_consultas_ai")
      .eq("plan", plan)
      .single() as unknown as Promise<{ data: { limite_consultas_ai: number | null } | null; error: unknown }>),
    supabase
      .from("axo_ai_uso_mensual")
      .select("consultas_realizadas, tokens_input_total, tokens_output_total")
      .eq("refugio_id", refugio_id)
      .eq("mes", new Date().toISOString().slice(0, 7) + "-01")
      .single(),
  ])

  return NextResponse.json({
    data: {
      mes: new Date().toISOString().slice(0, 7) + "-01",
      plan,
      consultas_realizadas: uso?.consultas_realizadas ?? 0,
      limite: planConfig?.limite_consultas_ai ?? null,
      tokens_input_total: uso?.tokens_input_total ?? 0,
      tokens_output_total: uso?.tokens_output_total ?? 0,
    }
  })
}
