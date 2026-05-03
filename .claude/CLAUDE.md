# Axo — Contexto del proyecto para Claude Code

## Qué es Axo

Axo es un SaaS multi-tenant de AMOXTLI para gestión operativa de refugios de Ambystoma mexicanum (ajolote) en cautiverio. Sustituye libretas y Excel por un sistema que registra la operación diaria, construye trazabilidad genealógica de las colonias y genera automáticamente los reportes regulatorios que SEMARNAT exige a las UMAs.

**Audiencia:** investigadores, biólogos, operadores de UMAs privadas, laboratorios académicos (UNAM, UAM-Xochimilco), zoológicos y acuarios.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Base de datos | Supabase (Postgres 15 + Auth + Storage + Realtime) |
| Auth | Supabase Auth + invitaciones propias + OTP |
| Email | Resend — sender: no-reply@amoxtli.tech |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |
| IA | Claude API — model: claude-sonnet-4-20250514 |
| Estilos | Tailwind CSS |
| Hosting | Vercel |
| Cron Jobs | Vercel Cron → API Routes |

---

## Supabase MCP

```
URL: https://mcp.supabase.com/mcp?project_ref=gszgkqvtrsvmjtqiaslc
```

Usar este MCP en Claude Code para leer el schema actual, ejecutar queries y verificar el estado de la base de datos.

---

## Estructura del proyecto

```
axo/
├── .claude/
│   ├── CLAUDE.md               ← este archivo
│   ├── 01-database.md          ← schemas SQL, RLS, funciones
│   ├── 02-auth.md              ← 4 flujos de auth + invitaciones + códigos
│   ├── 03-api-patterns.md      ← patrones de API Routes + estructura
│   ├── 04-edge-functions.md    ← Edge Functions completas
│   └── 05-axo-ai.md            ← implementación Axo AI + herramientas
├── app/
│   ├── api/                    ← API Routes (backend)
│   │   ├── auth/callback/
│   │   ├── refugios/
│   │   ├── invitations/
│   │   ├── ai/
│   │   └── cron/
│   └── (frontend — no implementar aquí)
├── supabase/
│   └── functions/              ← Edge Functions
│       ├── send-invitation/
│       ├── validate-invitation/
│       ├── axo-ai/
│       └── post-mortem-analysis/
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       ← browser client
│   │   │   ├── server.ts       ← server client (RSC + Route Handlers)
│   │   │   └── admin.ts        ← service role client (solo server)
│   │   └── resend.ts
│   └── types/
│       └── database.ts         ← generado con supabase gen types
├── middleware.ts
├── vercel.json
└── .env.local
```

---

## Convenciones críticas — leer antes de escribir cualquier código

### 1. Supabase clients — cuál usar dónde

```typescript
// ✅ En Server Components y Route Handlers
import { createClient } from "@/src/lib/supabase/server"

// ✅ En Client Components (solo lectura pública, sin datos sensibles)
import { createClient } from "@/src/lib/supabase/client"

// ✅ En Edge Functions y crons (service role — solo server)
import { createClient } from "@/src/lib/supabase/admin"

// ❌ Nunca usar service role key en client components
// ❌ Nunca usar browser client en Route Handlers
```

### 2. Multi-tenancy — refugio_id es sagrado

- **Toda tabla operacional tiene `refugio_id`.**
- La RLS en Supabase filtra automáticamente por el refugio del usuario autenticado.
- **No filtres manualmente por `refugio_id` en las queries de Route Handlers** — la RLS lo hace.
- Sí incluye `refugio_id` en todos los INSERT — la RLS no lo agrega automáticamente.

```typescript
// ✅ Correcto — RLS filtra automáticamente en SELECT
const { data } = await supabase.from("ajolotes").select("*")

// ✅ Correcto — refugio_id explícito en INSERT
const { data } = await supabase.from("ajolotes").insert({ refugio_id, codigo, ... })

// ❌ Incorrecto — no filtrar manualmente, la RLS ya lo hace
const { data } = await supabase.from("ajolotes").select("*").eq("refugio_id", id)
```

### 3. Roles — confía en la DB, no en el cliente

- Los roles de usuario (admin, tecnico, investigador, estudiante, lectura) viven en `refugio_usuarios`.
- La RLS usa funciones SECURITY DEFINER que leen el rol del usuario autenticado.
- **Nunca confíes en un rol que venga del cliente (body, params, headers).**
- Para verificar rol en una Route Handler antes de una operación sensible, consulta `refugio_usuarios` con el `auth.uid()` de la sesión.

### 4. Auth — el flujo es en el servidor

- Login, registro y validación de OTP ocurren solo en server-side (Route Handlers o Edge Functions).
- Nunca manejes passwords en el cliente.
- El token de invitación y el OTP se validan en Edge Functions, nunca en componentes React.

### 5. Axo AI — escritura siempre con confirmación

- Las herramientas del agente que son de lectura ejecutan automáticamente.
- Las herramientas de escritura (`create_evento`) **requieren `confirmado: true`** en el input.
- Si `confirmado` es false o undefined, retornar error explicando que el usuario debe confirmar.

### 6. Edge Functions — Deno, no Node

- Importar desde `esm.sh` o `deno.land/std`, no desde `node_modules`.
- `@anthropic-ai/sdk`: `import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.20.0"`
- `@supabase/supabase-js`: `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"`

### 7. Variables de entorno

```bash
# Públicas (disponibles en cliente)
NEXT_PUBLIC_SUPABASE_URL=https://gszgkqvtrsvmjtqiaslc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Solo servidor
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=sk-ant-<key>
RESEND_API_KEY=re_<key>
CRON_SECRET=<random-string>
NEXT_PUBLIC_APP_URL=https://axo.amoxtli.tech
```

### 8. Errores HTTP — usar siempre estos códigos

| Situación | Código |
|---|---|
| No autenticado | 401 |
| Autenticado pero sin permiso | 403 |
| Recurso no encontrado | 404 |
| Conflicto (ya existe) | 409 |
| Rate limit (IA) | 429 |
| Error del servidor | 500 |

### 9. Respuestas de API — formato consistente

```typescript
// ✅ Éxito
return NextResponse.json({ data: result }, { status: 200 })
return NextResponse.json({ data: created }, { status: 201 })

// ✅ Error
return NextResponse.json({ error: "Mensaje descriptivo" }, { status: 4xx })

// ❌ Nunca devolver datos en el nivel raíz sin wrappear
return NextResponse.json(result) // mal
```

### 10. Naming conventions

```
Tablas:             snake_case plural (ajolotes, mediciones_agua)
Columnas:           snake_case (refugio_id, fecha_hora)
Edge Functions:     kebab-case (send-invitation, axo-ai)
API Routes:         kebab-case en carpetas (/api/join-by-code)
Variables TS:       camelCase (refugioId, fechaHora)
Tipos TS:           PascalCase (Ajolote, MedicionAgua)
```

---

## Módulos del sistema (referencia rápida)

| Módulo | Tablas principales | API Routes |
|---|---|---|
| Auth | usuarios_perfil, refugio_usuarios | /api/auth/* |
| Refugios | refugios | /api/refugios |
| Invitaciones | invitaciones, codigos_refugio | /api/invitations, /api/refugios/join-by-code |
| Estanques | estanques | /api/refugios/[id]/estanques |
| Inventario | ajolotes, lotes_larvales | /api/refugios/[id]/ajolotes |
| Salud | mediciones_agua, observaciones_clinicas | /api/refugios/[id]/mediciones |
| Eventos | eventos | /api/refugios/[id]/eventos |
| Reproducción | cruzas, puestas | /api/refugios/[id]/cruzas |
| Alertas | alertas | /api/refugios/[id]/alertas |
| Reportes | reportes_generados | /api/refugios/[id]/reportes |
| Axo AI | axo_ai_conversaciones, axo_ai_mensajes | /api/ai/* |

---

## Archivos de contexto disponibles

Cuando necesites detalles de implementación, referencia estos archivos:

- `@.claude/01-database.md` — schemas SQL completos, RLS, funciones SQL, triggers
- `@.claude/02-auth.md` — 4 flujos de auth, Edge Functions de invitación y OTP
- `@.claude/03-api-patterns.md` — patrones de Route Handlers, estructura completa de API
- `@.claude/04-edge-functions.md` — código completo de Edge Functions y Crons
- `@.claude/05-axo-ai.md` — implementación del agente, herramientas, límites por plan

---

## Comandos útiles

```bash
# Generar tipos TypeScript desde Supabase
npx supabase gen types typescript --project-id gszgkqvtrsvmjtqiaslc > src/types/database.ts

# Desplegar Edge Function
npx supabase functions deploy send-invitation --project-ref gszgkqvtrsvmjtqiaslc

# Ver logs de Edge Function
npx supabase functions logs axo-ai --project-ref gszgkqvtrsvmjtqiaslc

# Ejecutar SQL contra Supabase (alternativa al MCP)
npx supabase db push --project-ref gszgkqvtrsvmjtqiaslc
```
