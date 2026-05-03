import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: { refugio_id: string; reporte_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: reporte, error: repError } = await supabase
    .from("reportes_generados")
    .select("*")
    .eq("id", params.reporte_id)
    .eq("refugio_id", params.refugio_id)
    .single()

  if (repError || !reporte) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })

  // Return cached PDF if already generated
  if (reporte.pdf_url) {
    return NextResponse.redirect(reporte.pdf_url)
  }

  const { data: refugio } = await supabase
    .from("refugios")
    .select("nombre, numero_uma, responsable_tecnico, tipo")
    .eq("id", params.refugio_id)
    .single()

  const snapshot = reporte.datos_snapshot as Record<string, unknown> | null

  const html = buildReporteHtml(refugio, reporte, snapshot)

  let pdfBuffer: Buffer

  try {
    const chromium = await import("@sparticuz/chromium")
    const puppeteer = await import("puppeteer-core")

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "2cm", bottom: "2cm", left: "2cm", right: "2cm" } })
    await browser.close()
    pdfBuffer = Buffer.from(pdf as Uint8Array)
  } catch {
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }

  // Upload to Supabase Storage
  const admin = createAdminClient()
  const storagePath = `${params.refugio_id}/${params.reporte_id}.pdf`

  const { error: uploadError } = await admin.storage
    .from("reportes-pdf")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true })

  if (!uploadError) {
    const { data: urlData } = admin.storage.from("reportes-pdf").getPublicUrl(storagePath)
    await admin.from("reportes_generados").update({
      pdf_storage_path: storagePath,
      pdf_url: urlData.publicUrl,
    }).eq("id", params.reporte_id)
  }

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${params.reporte_id}.pdf"`,
    },
  })
}

function buildReporteHtml(
  refugio: { nombre?: string | null; numero_uma?: string | null; responsable_tecnico?: string | null; tipo?: string | null } | null,
  reporte: { tipo: string; periodo_inicio: string; periodo_fin: string; generado_at?: string | null },
  snapshot: Record<string, unknown> | null
): string {
  const fechaGen = reporte.generado_at
    ? new Date(reporte.generado_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })

  const inv = snapshot?.inventario as Record<string, unknown> | null
  const reprod = snapshot?.reproduccion as Record<string, unknown> | null
  const mortalidad = snapshot?.mortalidad as Record<string, unknown> | null

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 13pt; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 24px; }
  .subtitle { text-align: center; font-size: 12pt; color: #444; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #1a472a; color: white; padding: 8px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
  .meta { margin-bottom: 16px; }
  .meta td { border: none; padding: 3px 8px; }
  .firma { margin-top: 60px; border-top: 1px solid #333; width: 280px; padding-top: 8px; text-align: center; font-size: 10pt; }
  .footer { margin-top: 40px; font-size: 9pt; color: #666; text-align: center; }
</style>
</head>
<body>
<h1>REPORTE ${reporte.tipo.toUpperCase().replace(/_/g, " ")}</h1>
<p class="subtitle">Unidad de Manejo para la Conservación de la Vida Silvestre (UMA)<br>
<em>Ambystoma mexicanum</em></p>

<table class="meta">
  <tr><td><strong>Refugio:</strong></td><td>${refugio?.nombre ?? "—"}</td></tr>
  <tr><td><strong>Número UMA:</strong></td><td>${refugio?.numero_uma ?? "—"}</td></tr>
  <tr><td><strong>Responsable técnico:</strong></td><td>${refugio?.responsable_tecnico ?? "—"}</td></tr>
  <tr><td><strong>Período:</strong></td><td>${reporte.periodo_inicio} al ${reporte.periodo_fin}</td></tr>
  <tr><td><strong>Fecha de generación:</strong></td><td>${fechaGen}</td></tr>
</table>

<h2>Inventario</h2>
<table>
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Total de individuos (machos)</td><td>${(inv?.machos as number | null) ?? "—"}</td></tr>
  <tr><td>Total de individuos (hembras)</td><td>${(inv?.hembras as number | null) ?? "—"}</td></tr>
  <tr><td>Total de individuos (indeterminado)</td><td>${(inv?.indeterminado as number | null) ?? "—"}</td></tr>
  <tr><td>Total de individuos vivos</td><td>${(inv?.total_vivos as number | null) ?? "—"}</td></tr>
  <tr><td>Lotes larvales activos</td><td>${(inv?.lotes_activos as number | null) ?? "—"}</td></tr>
</table>

<h2>Reproducción</h2>
<table>
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Cruzas activas en el período</td><td>${(reprod?.cruzas_activas as number | null) ?? "—"}</td></tr>
  <tr><td>Puestas registradas</td><td>${(reprod?.puestas as number | null) ?? "—"}</td></tr>
  <tr><td>Huevos eclosionados</td><td>${(reprod?.huevos_eclosionados as number | null) ?? "—"}</td></tr>
</table>

<h2>Mortalidad y Movimientos</h2>
<table>
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Muertes registradas</td><td>${(mortalidad?.muertes as number | null) ?? "—"}</td></tr>
  <tr><td>Egresos (transferencias externas)</td><td>${(mortalidad?.egresos as number | null) ?? "—"}</td></tr>
  <tr><td>Ingresos (nuevos individuos)</td><td>${(mortalidad?.ingresos as number | null) ?? "—"}</td></tr>
</table>

<br>
<div class="firma">
  ${refugio?.responsable_tecnico ?? "Responsable Técnico"}<br>
  Firma y sello
</div>

<div class="footer">
  Generado por el sistema Axo — AMOXTLI · ${fechaGen}
</div>
</body>
</html>`
}
