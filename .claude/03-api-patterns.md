# Axo — Patrones de API Routes

## Patrón base de Route Handler

Todo Route Handler autenticado sigue este patrón:

```typescript
import { createClient } from "@/src/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()

  // 1. Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. La RLS filtra automáticamente — no filtrar por refugio_id en SELECT
  const { data, error } = await supabase
    .from("tabla")
    .select("*")
    // .eq("refugio_id", params.refugio_id) ← NO NECESARIO — RLS lo hace

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  { params }: { params: { refugio_id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()

  // SÍ incluir refugio_id en INSERT — RLS no lo agrega automáticamente
  const { data, error } = await supabase
    .from("tabla")
    .insert({ ...body, refugio_id: params.refugio_id, registrado_por: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

---

## Estructura completa de API Routes

```
app/api/
│
├── auth/
│   └── callback/route.ts          GET — callback OAuth de Supabase
│
├── refugios/
│   ├── route.ts                   GET list / POST create
│   ├── join-by-code/route.ts      POST — unirse con código
│   └── [refugio_id]/
│       ├── route.ts               GET detail / PATCH update
│       ├── usuarios/
│       │   ├── route.ts           GET list de usuarios del refugio
│       │   └── [usuario_id]/
│       │       └── route.ts       PATCH cambiar rol / DELETE remover
│       ├── codigos/
│       │   ├── route.ts           GET list / POST create código
│       │   └── [codigo_id]/
│       │       └── route.ts       PATCH desactivar / DELETE eliminar
│       ├── estanques/
│       │   ├── route.ts           GET list / POST create
│       │   └── [estanque_id]/
│       │       └── route.ts       GET detail / PATCH / DELETE
│       ├── ajolotes/
│       │   ├── route.ts           GET list (con filtros) / POST create
│       │   └── [ajolote_id]/
│       │       ├── route.ts       GET detail / PATCH / DELETE
│       │       └── historial/route.ts  GET historial completo del individuo
│       ├── lotes/
│       │   ├── route.ts           GET list / POST create
│       │   └── [lote_id]/route.ts GET / PATCH / DELETE
│       ├── mediciones/
│       │   ├── route.ts           GET list con filtros / POST create
│       │   └── tendencias/route.ts GET tendencias por estanque y período
│       ├── observaciones/
│       │   └── route.ts           GET list / POST create
│       ├── eventos/
│       │   ├── route.ts           GET list con filtros / POST create
│       │   └── [evento_id]/route.ts GET detail (incluye post_mortem si existe)
│       ├── cruzas/
│       │   ├── route.ts           GET list / POST create
│       │   └── [cruza_id]/
│       │       ├── route.ts       GET detail / PATCH estado / DELETE
│       │       └── coeficiente/route.ts  GET calcular coeficiente
│       ├── puestas/
│       │   └── route.ts           GET list / POST create
│       ├── alertas/
│       │   ├── route.ts           GET list (no leídas primero)
│       │   └── [alerta_id]/
│       │       └── route.ts       PATCH marcar leída / PATCH resolver
│       └── reportes/
│           ├── route.ts           GET list
│           ├── generar/route.ts   POST generar reporte (trigger PDF)
│           └── [reporte_id]/route.ts GET detail + URL de descarga
│
├── invitations/
│   ├── route.ts                   POST crear invitación (admin)
│   └── accept/route.ts            POST aceptar con token + OTP
│
├── ai/
│   ├── conversations/
│   │   ├── route.ts               GET list / POST create
│   │   └── [conv_id]/
│   │       ├── route.ts           GET detail / DELETE
│   │       └── messages/route.ts  POST enviar mensaje a Axo AI
│   └── usage/route.ts             GET uso mensual del refugio activo
│
└── cron/
    ├── evaluate-alerts/route.ts   GET — llamado por Vercel Cron cada 6h
    └── reset-ai-usage/route.ts    GET — llamado el 1ro de cada mes
```

---

## Queries frecuentes — referencia

### Listar ajolotes con filtros
```typescript
const { data } = await supabase
  .from("ajolotes")
  .select(`
    id, codigo, nombre, sexo, estado, morfotipo, fecha_nacimiento,
    estanques(id, nombre),
    madre:madre_id(id, codigo),
    padre:padre_id(id, codigo)
  `)
  .eq("refugio_id", refugio_id)    // incluir en INSERT, en SELECT la RLS lo filtra
  .eq("estado", "vivo")            // filtro opcional
  .order("codigo")
```

### Mediciones de los últimos N días de un estanque
```typescript
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
const { data } = await supabase
  .from("mediciones_agua")
  .select("fecha_hora, temperatura, ph, amonio, nitrito, oxigeno")
  .eq("estanque_id", estanque_id)
  .gte("fecha_hora", since)
  .order("fecha_hora", { ascending: false })
```

### Alertas no leídas del refugio
```typescript
const { data } = await supabase
  .from("alertas")
  .select("*")
  .is("leida_at", null)
  .order("generada_at", { ascending: false })
```

### Calcular coeficiente de consanguinidad
```typescript
const { data } = await supabase.rpc("calcular_coeficiente_consanguinidad", {
  p_individuo_a_id: hembra_id,
  p_individuo_b_id: macho_id,
})
// data es un número entre 0 y 1
// > 0.125 = warning, > 0.25 = alto riesgo
```

### Historial completo de un ajolote
```typescript
const [ajolote, eventos, mediciones] = await Promise.all([
  supabase.from("ajolotes")
    .select("*, madre:madre_id(codigo), padre:padre_id(codigo), estanques(nombre)")
    .eq("id", ajolote_id)
    .single(),
  supabase.from("eventos")
    .select("tipo, fecha, detalles, post_mortem_analisis")
    .eq("ajolote_id", ajolote_id)
    .order("fecha", { ascending: false })
    .limit(50),
  supabase.from("observaciones_clinicas")
    .select("fecha_hora, descripcion, severidad")
    .eq("ajolote_id", ajolote_id)
    .order("fecha_hora", { ascending: false })
    .limit(20),
])
```

---

## vercel.json — Cron Jobs

```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-alerts",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/reset-ai-usage",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

Todos los cron routes verifican el header `Authorization: Bearer <CRON_SECRET>`.

---

## Rangos saludables para Ambystoma mexicanum (referencia para alertas)

```typescript
export const RANGOS_SEGUROS = {
  temperatura: { min: 14,  max: 20  },  // °C
  ph:          { min: 6.5, max: 8.0 },
  amonio:      { min: 0,   max: 0.5 },  // ppm — alerta si > 0.5 por 3 días
  nitrito:     { min: 0,   max: 0.3 },  // ppm — crítico si > 0.6
  oxigeno:     { min: 5.0, max: 12.0 }, // mg/L
} as const

export const COEFICIENTE_UMBRAL = {
  warning: 0.125,  // primo hermano
  danger:  0.25,   // hermano completo
} as const
```
