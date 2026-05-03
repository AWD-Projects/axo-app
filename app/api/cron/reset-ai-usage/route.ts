import { NextResponse } from "next/server"

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  // El uso mensual se acumula en axo_ai_uso_mensual por mes+refugio.
  // Cada mes nuevo el upsert de increment_ai_usage crea una nueva fila.
  // No se requiere borrar registros anteriores — son histórico.
  console.log(`[cron/reset-ai-usage] ${new Date().toISOString()} — ciclo mensual iniciado`)

  return NextResponse.json({ success: true, message: "El uso mensual se resetea implícitamente por fila nueva en axo_ai_uso_mensual" })
}
