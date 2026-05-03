# Axo — Prompts para Claude Code
### Secuencia completa de construcción del backend

---

> **Antes de empezar:** Abre Claude Code en la raíz del proyecto Axo.
> La carpeta `.claude/` ya contiene el contexto completo.
> Ejecuta los prompts en el orden numerado.
> Verifica cada uno antes de pasar al siguiente.

---

## PROMPT 00 — Base de datos en Supabase

> Ejecutar en **Supabase SQL Editor**, no en Claude Code.
> Copiar el SQL de `.claude/01-database.md` y ejecutar en este orden:
> PASO 1 → PASO 2 → PASO 3 → PASO 4 → PASO 5 → PASO 6

**Verificación:**
```sql
-- Ejecutar en SQL Editor para confirmar que todo está correcto
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Debe listar: ajolotes, alertas, axo_ai_conversaciones, axo_ai_mensajes,
-- axo_ai_uso_mensual, codigos_refugio, cruzas, estanques, eventos,
-- invitaciones, lotes_larvales, mediciones_agua, observaciones_clinicas,
-- puestas, refugio_usuarios, refugios, reportes_generados, usuarios_perfil
```

---

## PROMPT 01 — Setup del proyecto Next.js

```
Lee @.claude/CLAUDE.md para contexto del proyecto.

Inicializa el proyecto Next.js 14 de Axo con esta configuración exacta:

1. El proyecto ya existe como repositorio. Instala las dependencias necesarias:
   - @supabase/ssr @supabase/supabase-js
   - @anthropic-ai/sdk
   - resend

2. Crea la estructura de carpetas:
   src/lib/supabase/ (client.ts, server.ts, admin.ts)
   src/lib/ai/ (limits.ts, tools.ts)
   src/lib/constants.ts
   src/types/ (database.ts — vacío por ahora)
   supabase/functions/ (carpeta vacía con .gitkeep)

3. Crea src/lib/supabase/client.ts, server.ts y admin.ts
   con el código exacto que está en @.claude/02-auth.md sección "Supabase Client setup"

4. Crea middleware.ts en la raíz con el código de @.claude/02-auth.md sección "middleware.ts"

5. Crea src/lib/constants.ts con RANGOS_SEGUROS y COEFICIENTE_UMBRAL
   de @.claude/03-api-patterns.md sección "Rangos saludables"

6. Crea src/lib/ai/limits.ts con LIMITES_AI de @.claude/05-axo-ai.md

7. Crea .env.local con todas las variables de @.claude/CLAUDE.md sección "Variables de entorno"
   (con valores placeholder — el dev los reemplazará)

8. Crea vercel.json con la configuración de Cron Jobs de @.claude/03-api-patterns.md

Verificación: ejecuta `npx tsc --noEmit` y confirma que no hay errores de tipos.
```

---

## PROMPT 02 — Tipos TypeScript desde Supabase

```
Lee @.claude/CLAUDE.md para contexto.

El proyecto de Supabase tiene ref: gszgkqvtrsvmjtqiaslc
MCP URL: https://mcp.supabase.com/mcp?project_ref=gszgkqvtrsvmjtqiaslc

Genera los tipos TypeScript del schema de Supabase ejecutando:
npx supabase gen types typescript --project-id gszgkqvtrsvmjtqiaslc > src/types/database.ts

Si el CLI no está disponible, usa el MCP de Supabase para introspeccionar el schema
y genera manualmente los tipos en src/types/database.ts con las siguientes tablas:
refugios, refugio_usuarios, estanques, ajolotes, lotes_larvales, mediciones_agua,
observaciones_clinicas, eventos, cruzas, puestas, alertas, reportes_generados,
axo_ai_conversaciones, axo_ai_mensajes, axo_ai_uso_mensual, invitaciones, codigos_refugio, usuarios_perfil

Después de generar los tipos, actualiza client.ts, server.ts y admin.ts para usar
el tipo Database genérico:
  createBrowserClient<Database>(...)
  createServerClient<Database>(...)
  createClient<Database>(...)

Verificación: `npx tsc --noEmit` sin errores.
```

---

## PROMPT 03 — API Route: Auth callback

```
Lee @.claude/CLAUDE.md y @.claude/02-auth.md

Crea app/api/auth/callback/route.ts — el callback de Supabase Auth para
el flujo OAuth y magic links. Este route handler:

1. Recibe el código de autorización de Supabase en los search params
2. Llama a supabase.auth.exchangeCodeForSession(code)
3. Redirige al usuario a /dashboard en éxito
4. Redirige a /auth/login?error=auth_error en fallo

Usa el server client de @/src/lib/supabase/server.
Maneja el caso donde next (URL de retorno) viene en los params.

Verificación: el flujo de login de Supabase debe redirigir correctamente.
```

---

## PROMPT 04 — API Routes: Refugios

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las siguientes API Routes para el módulo de Refugios:

1. app/api/refugios/route.ts
   - GET: lista todos los refugios del usuario autenticado (con su rol en cada uno)
   - POST: crea un nuevo refugio y agrega al creador como admin automáticamente
     Body: { nombre, tipo, numero_uma?, responsable_tecnico?, ciudad?, estado_republica?, config_regulatoria? }

2. app/api/refugios/[refugio_id]/route.ts
   - GET: detalle del refugio + lista de estanques + conteo de ajolotes vivos
   - PATCH: actualiza datos del refugio (solo admin)
     Body: campos parciales de refugios
   - DELETE: desactiva el refugio (soft delete, solo admin)

3. app/api/refugios/[refugio_id]/usuarios/route.ts
   - GET: lista usuarios del refugio con sus roles (solo miembros)

4. app/api/refugios/[refugio_id]/usuarios/[usuario_id]/route.ts
   - PATCH: cambia el rol de un usuario (solo admin, no puede cambiar su propio rol)
   - DELETE: remueve un usuario del refugio (solo admin)

Usa el patrón exacto de @.claude/03-api-patterns.md.
La RLS filtra automáticamente — no filtres por refugio_id en SELECT.
Sí incluye refugio_id en INSERT.

Verificación con MCP de Supabase:
- Crear refugio con usuario A
- Verificar que usuario B no puede ver el refugio de A
```

---

## PROMPT 05 — API Routes: Invitaciones y códigos de acceso

```
Lee @.claude/CLAUDE.md, @.claude/02-auth.md y @.claude/03-api-patterns.md

Crea las API Routes del sistema de invitaciones y códigos:

1. app/api/invitations/route.ts
   Usar el código completo de @.claude/02-auth.md sección "API Route — POST /api/invitations"

2. app/api/invitations/accept/route.ts
   Usar el código completo de @.claude/02-auth.md sección "API Route — POST /api/invitations/accept"

3. app/api/refugios/join-by-code/route.ts
   Usar el código completo de @.claude/02-auth.md sección "API Route — POST /api/refugios/join-by-code"

4. app/api/refugios/[refugio_id]/codigos/route.ts
   - GET: lista todos los códigos del refugio (solo admin)
   - POST: crea nuevo código
     Body: { codigo, rol, descripcion?, max_usos?, expires_at? }
     Validar: rol no puede ser 'admin'

5. app/api/refugios/[refugio_id]/codigos/[codigo_id]/route.ts
   - PATCH: desactiva o actualiza max_usos/expires_at (solo admin)
   - DELETE: elimina el código (solo admin)

Verificación:
- Crear invitación → verificar email enviado vía Resend
- Usar token + OTP correcto → usuario se une al refugio
- Usar código de refugio → usuario se une con rol correcto
```

---

## PROMPT 06 — API Routes: Estanques

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Estanques:

1. app/api/refugios/[refugio_id]/estanques/route.ts
   - GET: lista todos los estanques del refugio (activos e inactivos)
     Include: conteo de ajolotes vivos por estanque, última medición de agua
   - POST: crea nuevo estanque (solo admin y tecnico)
     Body: { nombre, capacidad_litros?, tipo_sistema?, ubicacion_fisica?, notas? }

2. app/api/refugios/[refugio_id]/estanques/[estanque_id]/route.ts
   - GET: detalle del estanque + últimas 7 mediciones de agua + ajolotes actuales
   - PATCH: actualiza datos del estanque (admin y tecnico)
   - DELETE: desactiva el estanque — verificar que no tiene ajolotes vivos antes

Verificación con MCP:
- Crear estanque → verificar que aparece en la lista del refugio
- Intentar eliminar estanque con ajolotes → debe rechazar
```

---

## PROMPT 07 — API Routes: Inventario (ajolotes y lotes larvales)

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Inventario:

1. app/api/refugios/[refugio_id]/ajolotes/route.ts
   - GET: lista ajolotes con filtros opcionales
     Query params: estado, sexo, estanque_id, search (por código o nombre)
     Include: datos básicos, nombre del estanque, código de madre y padre
   - POST: registra nuevo ajolote
     Body: { codigo, sexo?, fecha_nacimiento?, origen, estanque_id?, morfotipo?, madre_id?, padre_id?, notas? }
     Validar: codigo único en el refugio

2. app/api/refugios/[refugio_id]/ajolotes/[ajolote_id]/route.ts
   - GET: detalle completo — datos del ajolote + madre + padre + 5 hijos + historial de eventos recientes
   - PATCH: actualiza datos editables (no se puede editar madre_id/padre_id directamente)
   - DELETE: solo si el ajolote ya está en estado fallecido/egresado (no eliminar vivos)

3. app/api/refugios/[refugio_id]/ajolotes/[ajolote_id]/historial/route.ts
   - GET: historial completo — todos los eventos + observaciones clínicas + cruzas participadas

4. app/api/refugios/[refugio_id]/lotes/route.ts
   - GET: lista lotes larvales activos
   - POST: registra nuevo lote
     Body: { codigo, etapa, cantidad_inicial, estanque_id?, cruza_id?, notas? }

5. app/api/refugios/[refugio_id]/lotes/[lote_id]/route.ts
   - GET: detalle del lote
   - PATCH: actualiza cantidad_actual, etapa, estanque_id

Verificación con MCP:
- Crear ajolote con madre_id y padre_id → verificar relaciones en DB
- Listar ajolotes con filtro estado=vivo → solo muestra vivos
```

---

## PROMPT 08 — API Routes: Salud (mediciones y observaciones)

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Salud:

1. app/api/refugios/[refugio_id]/mediciones/route.ts
   - GET: lista mediciones con filtros
     Query params: estanque_id (requerido), desde, hasta, limit (default 50)
   - POST: registra nueva medición de agua
     Body: { estanque_id, temperatura?, ph?, amonio?, nitrito?, nitrato?, oxigeno?, conductividad?, notas? }
     Automático: registrado_por = user.id, fecha_hora = now()

2. app/api/refugios/[refugio_id]/mediciones/tendencias/route.ts
   - GET: datos agregados para gráficas
     Query params: estanque_id, period (7d|30d|90d)
     Response: array de { fecha, temperatura_avg, ph_avg, amonio_avg, nitrito_avg, oxigeno_avg }
     Incluir: rangos seguros para Ambystoma mexicanum (de src/lib/constants.ts)
     Incluir: flag "fuera_de_rango" por parámetro

3. app/api/refugios/[refugio_id]/observaciones/route.ts
   - GET: lista observaciones clínicas (filtrar por sujeto_tipo, sujeto_id, severidad)
   - POST: registra nueva observación
     Body: { sujeto_tipo, ajolote_id?, lote_id?, estanque_id?, descripcion, severidad? }

Los rangos seguros para Ambystoma mexicanum están en src/lib/constants.ts:
RANGOS_SEGUROS = { temperatura: {min:14,max:20}, ph: {min:6.5,max:8.0},
                   amonio: {min:0,max:0.5}, nitrito: {min:0,max:0.3}, oxigeno: {min:5.0,max:12.0} }

Verificación:
- Registrar medición con amonio=0.9 → debe guardar sin error
- Consultar tendencias de 30 días → response con promedios y flags
```

---

## PROMPT 09 — API Routes: Eventos

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Eventos:

1. app/api/refugios/[refugio_id]/eventos/route.ts
   - GET: lista eventos del refugio con filtros
     Query params: tipo, ajolote_id, estanque_id, desde, hasta, limit (default 50)
     Order: fecha DESC
   - POST: registra nuevo evento
     Body: { sujeto_tipo, tipo, ajolote_id?, lote_id?, estanque_id?, fecha?, detalles }
     Automático: registrado_por = user.id
     El trigger en DB actualiza el estado del ajolote automáticamente
     según el tipo de evento (muerte → fallecido, egreso → egresado, etc.)

2. app/api/refugios/[refugio_id]/eventos/[evento_id]/route.ts
   - GET: detalle del evento
     Si tipo=muerte y post_mortem_generado_at no es null: incluir post_mortem_analisis
     Si tipo=muerte y post_mortem_generado_at es null: incluir flag "analisis_pendiente: true"

IMPORTANTE: cuando se registra un evento de tipo 'muerte', el Database Webhook
de Supabase dispara automáticamente la Edge Function post-mortem-analysis.
No hay que hacer nada adicional en el API Route — el análisis llega solo en 5-10 segundos.
El cliente debe hacer polling de GET /eventos/[id] hasta que post_mortem_generado_at no sea null.

Verificación con MCP:
- Registrar evento tipo=muerte para ajolote X → verificar que ajolote cambió a estado=fallecido
- GET del evento después de 10 segundos → debe tener post_mortem_analisis populado
```

---

## PROMPT 10 — API Routes: Reproducción

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Reproducción:

1. app/api/refugios/[refugio_id]/cruzas/route.ts
   - GET: lista cruzas con filtros (estado, hembra_id, macho_id)
     Include: datos de hembra, macho, estanque, puestas asociadas
   - POST: registra nueva cruza
     Body: { hembra_id, macho_id, estanque_id?, fecha_planeada?, notas? }
     Al crear: calcular automáticamente coeficiente_consanguinidad usando
     la función RPC calcular_coeficiente_consanguinidad(hembra_id, macho_id)
     Si coeficiente > 0.25: guardar de todas formas pero retornar warning en response

2. app/api/refugios/[refugio_id]/cruzas/[cruza_id]/route.ts
   - GET: detalle de la cruza + árbol genealógico de hembra y macho (3 generaciones) + puestas
   - PATCH: actualizar estado (planeada→activa→exitosa/fallida), fecha_inicio, fecha_fin, aprobado_por

3. app/api/refugios/[refugio_id]/cruzas/[cruza_id]/coeficiente/route.ts
   - GET: calcula y retorna el coeficiente de consanguinidad en tiempo real
     Útil para verificar antes de confirmar la cruza

4. app/api/refugios/[refugio_id]/puestas/route.ts
   - GET: lista puestas del refugio (o filtradas por cruza_id)
   - POST: registra nueva puesta
     Body: { cruza_id, fecha_puesta, cantidad_huevos?, fecha_eclosion?, cantidad_eclosionada?, notas? }
     Si se registra eclosión: opcionalmente crear un lote_larval automáticamente

Verificación:
- Crear cruza entre hermanos (mismos padres) → coeficiente debe ser ~0.25 con warning
- Crear cruza entre individuos sin ancestros comunes → coeficiente 0.0
```

---

## PROMPT 11 — API Routes: Alertas

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Alertas:

1. app/api/refugios/[refugio_id]/alertas/route.ts
   - GET: lista alertas del refugio
     Query params: solo_no_leidas (boolean), severidad, tipo, limit (default 20)
     Order: generada_at DESC, no leídas primero
     Response incluir: conteo de alertas no leídas (para badge en UI)

2. app/api/refugios/[refugio_id]/alertas/[alerta_id]/route.ts
   - PATCH: dos operaciones posibles según body:
     { accion: "leer" } → actualiza leida_at = now()
     { accion: "resolver", notas? } → actualiza resuelta_at = now(), resuelta_por = user.id
   - No hay DELETE de alertas — son registro histórico

3. app/api/refugios/[refugio_id]/alertas/leer-todas/route.ts
   - POST: marca todas las alertas no leídas del refugio como leídas

Verificación:
- Crear alerta manualmente vía SQL → debe aparecer en GET
- PATCH con accion=leer → leida_at populado, no aparece en solo_no_leidas
```

---

## PROMPT 12 — Cron: evaluate-alerts

```
Lee @.claude/CLAUDE.md y @.claude/04-edge-functions.md

Crea el Cron Job de evaluación de alertas:

1. Crea app/api/cron/evaluate-alerts/route.ts
   Usar el código completo de @.claude/04-edge-functions.md sección "Cron — evaluate-alerts"

2. Asegúrate de que vercel.json ya tiene la entrada del cron (de PROMPT 01).
   Si no, agrégala:
   { "path": "/api/cron/evaluate-alerts", "schedule": "0 */6 * * *" }

3. Crea app/api/cron/reset-ai-usage/route.ts — route simple que solo logea
   (el reset es implícito porque cada mes empieza en 0 con upsert)

Los rangos para Ambystoma mexicanum están en src/lib/constants.ts (RANGOS_SEGUROS).
El secret para validar que viene de Vercel Cron está en process.env.CRON_SECRET.

Verificación:
- Hacer GET a /api/cron/evaluate-alerts con header Authorization: Bearer <CRON_SECRET>
- Debe procesar todos los refugios y retornar { alertas_generadas: N, refugios_procesados: M }
```

---

## PROMPT 13 — API Routes: Reportes

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Crea las API Routes del módulo de Reportes:

1. app/api/refugios/[refugio_id]/reportes/route.ts
   - GET: lista reportes generados del refugio (más recientes primero)
     Include: tipo, período, fecha de generación, URL de descarga si existe

2. app/api/refugios/[refugio_id]/reportes/generar/route.ts
   - POST: dispara la generación de un reporte
     Body: { tipo, periodo_inicio, periodo_fin }
     Por ahora: usar get_refugio_summary RPC para obtener los datos y
     guardar los datos_snapshot en reportes_generados. La generación de PDF
     con Puppeteer se implementa después (PROMPT 17).
     Response: { reporte_id, datos_snapshot } con status 202 (accepted)

3. app/api/refugios/[refugio_id]/reportes/[reporte_id]/route.ts
   - GET: detalle del reporte + datos_snapshot + pdf_url si existe

Verificación:
- POST generar reporte tipo=uma_trimestral → retorna datos del refugio en el snapshot
```

---

## PROMPT 14 — Axo AI: API Routes

```
Lee @.claude/CLAUDE.md y @.claude/05-axo-ai.md

Crea las API Routes y la lógica del agente Axo AI:

1. Crea src/lib/ai/tools.ts con las funciones buildAgentTools y executeTool
   Usar el código exacto de @.claude/05-axo-ai.md sección "Herramientas del agente"

2. app/api/ai/conversations/route.ts
   - GET: lista conversaciones del usuario para el refugio activo
     Query params: refugio_id (requerido)
   - POST: crea nueva conversación
     Body: { refugio_id, titulo? }

3. app/api/ai/conversations/[conv_id]/route.ts
   - GET: detalle de la conversación con todos sus mensajes
   - DELETE: desactiva la conversación (no elimina mensajes)

4. app/api/ai/conversations/[conv_id]/messages/route.ts
   Usar el código completo de @.claude/05-axo-ai.md sección "API Route — POST"

5. app/api/ai/usage/route.ts
   - GET: uso mensual del refugio activo
     Query params: refugio_id
     Response: { consultas_realizadas, limite, plan, mes }

IMPORTANTE:
- El modelo es siempre claude-sonnet-4-20250514
- Los límites por plan están en src/lib/ai/limits.ts
- Las herramientas de escritura requieren confirmado=true en el input
- Guardar tokens usados en axo_ai_mensajes y actualizar axo_ai_uso_mensual
  usando la RPC increment_ai_usage (atómica)

Verificación:
- Crear conversación y enviar mensaje "¿Cuántos ajolotes vivos hay en el refugio?"
- Axo AI debe llamar a get_inventario y responder con datos reales
```

---

## PROMPT 15 — Edge Function: post-mortem-analysis

```
Lee @.claude/CLAUDE.md y @.claude/04-edge-functions.md

1. Crea supabase/functions/post-mortem-analysis/index.ts
   Usar el código completo de @.claude/04-edge-functions.md sección "Edge Function: post-mortem-analysis"

2. Despliega la función:
   npx supabase functions deploy post-mortem-analysis --project-ref gszgkqvtrsvmjtqiaslc

3. Configura el Database Webhook en Supabase Dashboard:
   - Tabla: eventos
   - Evento: INSERT
   - Filtro: tipo = 'muerte'
   - URL: https://gszgkqvtrsvmjtqiaslc.supabase.co/functions/v1/post-mortem-analysis
   - HTTP Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

Verificación:
- Registrar un evento de tipo muerte para un ajolote via API Route
- Esperar 5-10 segundos
- Verificar con MCP que eventos.post_mortem_analisis está populado
```

---

## PROMPT 16 — Edge Functions: Invitaciones

```
Lee @.claude/CLAUDE.md y @.claude/02-auth.md

Las Edge Functions de invitación ya están implementadas como Route Handlers
en los PROMPTS 05. Este prompt es para mover la lógica crítica del OTP
a Edge Functions de Supabase si el equipo decide hacerlo.

Si se mantiene como Route Handlers (recomendado para MVP):
- No hay nada que hacer aquí — ya está implementado.

Si se decide mover a Edge Functions:
1. Crear supabase/functions/send-invitation/index.ts
   con el código de @.claude/02-auth.md adaptado para Deno
2. Crear supabase/functions/validate-invitation/index.ts
3. Desplegar ambas funciones
4. Actualizar las Route Handlers para llamar a las Edge Functions
   en lugar de hacer la lógica directamente

Recomendación MVP: mantener como Route Handlers para simplicidad.
Migrar a Edge Functions solo si hay problemas de latencia o seguridad.
```

---

## PROMPT 17 — Generación de PDF (Reporte UMA)

```
Lee @.claude/CLAUDE.md y @.claude/03-api-patterns.md

Implementa la generación de PDF para el reporte UMA trimestral:

1. Instala las dependencias necesarias:
   npm install puppeteer-core @sparticuz/chromium

2. Crea app/api/refugios/[refugio_id]/reportes/[reporte_id]/pdf/route.ts
   - GET: genera y retorna el PDF del reporte

3. El PDF debe incluir:
   - Datos del refugio (nombre, número UMA, responsable técnico)
   - Período del reporte (inicio - fin)
   - Sección de inventario: total de individuos al inicio y fin del período
   - Sección de altas: nacimientos e ingresos del período (de eventos tipo ingreso)
   - Sección de bajas: muertes, egresos y transferencias externas del período
   - Sección de inventario final
   - Firma del responsable técnico (campo para firma física)
   - Fecha de generación

4. Usar los datos de datos_snapshot del reporte si existen,
   o recalcular si no existen.

5. Guardar el PDF en Supabase Storage bucket 'reportes-pdf'
   Path: {refugio_id}/{reporte_id}.pdf
   Actualizar reportes_generados.pdf_storage_path y pdf_url

Verificación:
- Generar reporte UMA trimestral
- GET /reportes/[id]/pdf → debe retornar PDF con datos reales del refugio
```

---

## PROMPT 18 — Verificación final del backend completo

```
Usa el MCP de Supabase (https://mcp.supabase.com/mcp?project_ref=gszgkqvtrsvmjtqiaslc)
para verificar que el backend está completo y funcionando correctamente.

Ejecuta estas verificaciones:

1. SCHEMA: Verificar que las 18 tablas existen con sus columnas correctas
2. RLS: Verificar que RLS está habilitado en todas las tablas
3. FUNCIONES: Verificar que las 6 funciones SQL existen
   (update_updated_at, handle_new_user, get_user_role_in_refugio,
    user_has_access_to_refugio, user_can_write_in_refugio, user_is_admin_of_refugio,
    calcular_coeficiente_consanguinidad, increment_ai_usage, get_refugio_summary)
4. TRIGGERS: Verificar que los triggers están activos
5. STORAGE: Verificar que los buckets 'reportes-pdf' y 'avatares' existen

Ejecuta también un flujo completo de prueba vía SQL:
- Insertar usuario de prueba
- Crear refugio
- Agregar estanque
- Agregar ajolote
- Registrar medición de agua
- Registrar evento de muerte
- Verificar que el ajolote cambió a estado=fallecido automáticamente

Reporta cualquier inconsistencia encontrada y corrígela.
```

---

## Resumen de entregables por prompt

| Prompt | Qué se crea | Dependencias |
|---|---|---|
| 00 | Schema SQL completo en Supabase | Ninguna |
| 01 | Proyecto Next.js + estructura base | 00 |
| 02 | Tipos TypeScript | 00, 01 |
| 03 | Auth callback | 01, 02 |
| 04 | API Refugios | 02, 03 |
| 05 | Invitaciones + códigos | 04 |
| 06 | API Estanques | 04 |
| 07 | API Ajolotes + lotes | 06 |
| 08 | API Salud | 07 |
| 09 | API Eventos | 07, 08 |
| 10 | API Reproducción | 07, 09 |
| 11 | API Alertas | Ninguna (solo lectura/escritura simple) |
| 12 | Cron evaluate-alerts | 08, 11 |
| 13 | API Reportes | 10, 12 |
| 14 | Axo AI completo | 07, 08, 09, 10 |
| 15 | Edge Function post-mortem | 09, Anthropic API |
| 16 | Edge Functions invitaciones | 05 (opcional) |
| 17 | PDF generator | 13 |
| 18 | Verificación final | Todos |
