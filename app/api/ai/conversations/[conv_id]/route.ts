import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { conv_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: conv, error: convError } = await supabase
    .from("axo_ai_conversaciones")
    .select("*")
    .eq("id", params.conv_id)
    .eq("usuario_id", user.id)
    .single()

  if (convError || !conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })

  const { data: mensajes, error: msgError } = await supabase
    .from("axo_ai_mensajes")
    .select("id, rol, contenido, tool_calls, tool_results, tokens_input, tokens_output, created_at")
    .eq("conversacion_id", params.conv_id)
    .order("created_at", { ascending: true })

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json({ data: { ...conv, mensajes } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { conv_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: conv } = await supabase
    .from("axo_ai_conversaciones")
    .select("id")
    .eq("id", params.conv_id)
    .eq("usuario_id", user.id)
    .single()

  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })

  const { error } = await supabase
    .from("axo_ai_conversaciones")
    .update({ activa: false })
    .eq("id", params.conv_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { success: true } })
}
