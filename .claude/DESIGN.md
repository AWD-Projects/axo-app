# Axo — Design System v1.0
### AMOXTLI · Mayo 2026

---

## Filosofía de diseño

Axo tiene la simpleza de Apple, el minimalismo de Notion y la elegancia técnica de OpenAI y Anthropic. No es una app de consumo masivo — es una herramienta de precisión para científicos y operadores. Cada decisión de diseño parte de esa premisa: **claridad funcional sobre decoración**.

**El diseño no se nota. La información sí.**

Tres principios que gobiernan cada decisión:

**1. Sustracción.** Si un elemento puede eliminarse sin perder significado, se elimina. El espacio en blanco es diseño activo, no espacio desperdiciado.

**2. Jerarquía sin esfuerzo.** El usuario entiende qué es más importante sin leer. El tamaño, el peso y el color guían la mirada en ese orden.

**3. Confianza a través de consistencia.** Un sistema que siempre se comporta igual genera confianza. Los componentes no improvisan — tienen estados definidos para cada situación.

---

## Paleta de color

### Filosofía cromática

Un solo color de acento. Todo lo demás es una escala de grises cálidos. El teal `#1a6560` aparece con disciplina — solo donde realmente importa. Cuando aparece, el usuario lo nota. Si apareciera en todos lados, no significaría nada.

Los grises tienen temperatura ligeramente cálida (no fría, no azulada) — esto da al producto carácter orgánico sin perder rigor técnico.

---

### Fondos — 3 capas de profundidad

| Token | Hex | Uso |
|---|---|---|
| `--bg-app` | `#f9f9f7` | Fondo base de la aplicación y sidebar |
| `--bg-card` | `#ffffff` | Cards, inputs, modales, popovers |
| `--bg-subtle` | `#f3f2ef` | Fondos hover de nav, filas alternas en tablas, section backgrounds |
| `--border` | `#e5e2dc` | Bordes de cards, separadores de sección |
| `--border-sub` | `#edeae4` | Divisores internos dentro de cards |

La profundidad se crea por capas de color, no por sombras. `#f9f9f7` → `#ffffff` → `#f3f2ef` crean una jerarquía visual sin ninguna `box-shadow`.

---

### Textos — 3 niveles

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#0d0d0d` | Headings, body principal, labels de campos |
| `--text-secondary` | `#3c3a36` | Descripciones, small text, metadatos de apoyo |
| `--text-disabled` | `#9a958f` | Placeholders, elementos inactivos, timestamps |

**Regla:** texto sobre fondo de acento (`#1a6560`) usa siempre `#f9f9f7`, nunca blanco puro. El blanco puro sobre teal es demasiado frío.

---

### Acento de marca — un solo color

| Token | Hex | Uso |
|---|---|---|
| `--accent` | `#1a6560` | Botón primario, nav activo, links, logo X, Axo AI |
| `--accent-bg` | `#e2f0ee` | Badge de acento, fondo nav activo, Axo AI strip, focus ring |
| `--accent-hover` | `#144f4b` | Hover de botón primario, pressed state |
| `--accent-text` | `#f9f9f7` | Texto sobre fondo de acento |

**Cuándo usar el acento:** botón de acción primaria (máx 1 por pantalla), ítem de navegación activo, links dentro de texto, el "o" del logo Axo, indicadores de Axo AI, valores de parámetros de agua dentro de rango.

**Cuándo NO usar el acento:** decoración, backgrounds de sección, estados informativos que no son acción.

---

### System colors — semánticos

No son de marca. Son señales. Usarlos solo cuando el estado del sistema lo requiere.

| Estado | Texto | Fondo | Border | Uso en Axo |
|---|---|---|---|---|
| **Success** | `#15803d` | `#f0fdf4` | `#bbf7d0` | Parámetros en rango, acciones exitosas, individuo en buen estado |
| **Warning** | `#92400e` | `#fffbeb` | `#fde68a` | Parámetro elevado, endogamia en límite, acción recomendada |
| **Error** | `#991b1b` | `#fef2f2` | `#fecaca` | Parámetro crítico, muerte registrada, alerta urgente, validación |
| **Info** | `#1e3a8a` | `#eff6ff` | `#bfdbfe` | Axo AI insights, tips, notificaciones informativas neutras |

---

### Paleta completa — referencia visual rápida

```
FONDOS
  #f9f9f7  ████  App bg, sidebar
  #ffffff  ████  Cards, inputs
  #f3f2ef  ████  Subtle bg, hover, alternating
  #e5e2dc  ████  Borders
  #edeae4  ████  Sub-borders

TEXTOS
  #0d0d0d  ████  Primary
  #3c3a36  ████  Secondary
  #9a958f  ████  Disabled

ACENTO
  #1a6560  ████  Brand accent
  #e2f0ee  ████  Accent bg
  #144f4b  ████  Accent hover

SYSTEM
  #15803d  ████  Success text
  #f0fdf4  ████  Success bg
  #92400e  ████  Warning text
  #fffbeb  ████  Warning bg
  #991b1b  ████  Error text
  #fef2f2  ████  Error bg
  #1e3a8a  ████  Info text
  #eff6ff  ████  Info bg
```

---

## Tipografía

### Familias

**UI General: DM Sans**
Geométrica humanista con personalidad propia. Suficientemente técnica para un dashboard científico, suficientemente cálida para no sentirse fría. Funciona excepcionalmente bien a tamaños pequeños — crítico para tablas de datos. Import: Google Fonts, `wght@400;500`.

**Datos numéricos: DM Mono**
Monoespaciada de la misma familia tipográfica. Garantiza alineación decimal en columnas, lectura rítmica de valores, y carácter científico sin pretensión. Import: Google Fonts, `wght@400`.

**Regla absoluta:** si es un número medible (°C, pH, ppm, mg/L, coeficiente, porcentaje, conteo, fecha en tabla) → DM Mono. Si es texto editorial o interfaz → DM Sans.

---

### Escala tipográfica

| Nivel | Fuente | Size | Weight | Color token | Uso |
|---|---|---|---|---|---|
| **Display** | DM Sans | 40px | 500 | `--text-primary` | Landing hero, pantallas vacías grandes |
| **H1** | DM Sans | 28px | 500 | `--text-primary` | Títulos de página dentro del app |
| **H2** | DM Sans | 20px | 500 | `--text-primary` | Títulos de sección, modal headers |
| **H3** | DM Sans | 15px | 500 | `--text-primary` | Card headers, subtítulos de sección |
| **Body L** | DM Sans | 14px | 400 | `--text-secondary` | Párrafos largos, descripciones |
| **Body** | DM Sans | 13px | 400 | `--text-secondary` | Body estándar, contenido de cards |
| **Label** | DM Sans | 12px | 500 | `--text-primary` | Labels de campos, nav items, badges |
| **Small** | DM Sans | 11px | 400 | `--text-disabled` | Timestamps, metadata, captions |
| **Micro** | DM Sans | 10px | 500 | `--text-disabled` | Kickers uppercase, eyebrow labels |
| **Data L** | DM Mono | 20px | 400 | `--text-primary` | Valores hero en dashboard |
| **Data** | DM Mono | 13px | 400 | `--text-primary` | Valores en tablas y cards |
| **Data S** | DM Mono | 11px | 400 | `--text-secondary` | Valores en tablas densas |

**Line heights:** Body → 1.6 / Labels → 1.3 / Data → 1.4 / Headings → 1.15

---

### Jerarquía tipográfica en práctica

```
PÁGINA DE MÓDULO (ejemplo: Inventario)

"Inventario"                    H1 · 28px · 500 · #0d0d0d
"47 individuos registrados"     Body · 13px · 400 · #9a958f
                                                          ↑ margen 4px entre estos dos

DENTRO DE UNA CARD

"Individuo M-12"                H3 · 15px · 500 · #0d0d0d
"Macho · Leucístico · 2 años"   Label · 12px · 400 · #3c3a36

Temperatura:    18.4°C          Label 12px / Data 13px DM Mono
pH:              7.2            Label 12px / Data 13px DM Mono
Amonio:         0.8 ppm         Label 12px / Data 13px DM Mono [color warning]
```

---

## Espaciado

### Sistema base: 4px

Todo el espaciado usa múltiplos de 4. Sin excepciones.

```
2px   —  gap entre icono y label en el mismo componente
4px   —  gap entre elemento label y su valor
8px   —  gap entre elementos hermanos en fila / padding interno pequeño
12px  —  padding de chips, badges, inputs pequeños
14px  —  padding vertical de inputs estándar
16px  —  padding interno de cards, gap entre campos de form
20px  —  gap entre cards en grid
24px  —  padding de página (lateral + top)
32px  —  separación entre secciones dentro de una página
40px  —  separación entre bloques de contenido mayores
48px  —  padding de secciones en landing
64px  —  separación entre secciones grandes en landing
80px  —  padding de secciones hero
```

### Grid del app

```
Sidebar:         220px fijo
Contenido:       flexible, padding 24px
Max-width inner: 1200px (en pantallas muy anchas el contenido no se estira más)
Gutters:         24px
Columns:         12 columnas en el área de contenido
```

---

## Border radius

### Filosofía

Medianamente redondeado — ni cuadrado corporativo ni burbuja consumer. La curva es suficiente para sentirse moderna y accesible, sin perder la seriedad técnica de la herramienta.

| Contexto | Radius | Ejemplos |
|---|---|---|
| **xs** | `6px` | Chips, badges, tags, tooltips, checkboxes |
| **sm** | `8px` | Botones, inputs, dropdowns, selects |
| **md** | `10px` | Cards estándar, panels, popovers |
| **lg** | `14px` | Modales, drawers, cards hero |
| **xl** | `20px` | Ilustraciones contenedor, onboarding cards |
| **full** | `9999px` | Pills de estado (solo para badges tipo "vivo", "activo") |

**Regla de coherencia:** elementos anidados tienen border-radius menor que su contenedor. Si la card tiene `10px`, el elemento dentro tiene `6px` o `8px`.

---

## Bordes y profundidad

### Sin sombras — profundidad por color

```
✅ Correcto:  card #ffffff sobre fondo #f9f9f7  →  profundidad visual
❌ Incorrecto: box-shadow en cards de contenido regular
```

**Excepción única donde hay sombra:** modales y dropdowns flotantes.
```css
/* Solo para elementos que flotan sobre el contenido */
box-shadow: 0 4px 16px rgba(13, 13, 13, 0.06), 0 1px 4px rgba(13, 13, 13, 0.04);
```

### Grosor de bordes

```
0.5px  —  todo: cards, separadores, inputs, nav dividers
1px    —  elemento con énfasis: card featured en pricing, input en error
2px    —  nav item activo (border-left), card seleccionada
```

### Focus ring

```css
/* Siempre teal, nunca el azul por defecto del browser */
outline: 2px solid #e2f0ee;
outline-offset: 2px;
```

---

## Componentes

### Botón primario

```
bg:         #1a6560
texto:      #f9f9f7 · DM Sans 12px / 500
padding:    8px 18px
radius:     8px
border:     none
hover:      bg #144f4b · transition 150ms ease
active:     scale(0.98) · bg #144f4b
disabled:   bg #e5e2dc · texto #9a958f · cursor not-allowed
loading:    spinner teal 14px izquierda del texto
```

### Botón secundario

```
bg:         transparent
texto:      #0d0d0d · DM Sans 12px / 500
padding:    8px 18px
radius:     8px
border:     0.5px solid #e5e2dc
hover:      bg #f3f2ef · border-color #d4d0ca
active:     scale(0.98)
disabled:   texto #9a958f · cursor not-allowed
```

### Botón ghost / link

```
bg:         transparent · sin border
texto:      #1a6560 · DM Sans 12px / 500
padding:    4px 0
hover:      texto #144f4b · underline
```

### Input

```
bg:         #ffffff
border:     0.5px solid #e5e2dc
radius:     8px
padding:    9px 12px
font:       DM Sans 13px / 400 / #0d0d0d
placeholder:#9a958f

focus:
  border: 1.5px solid #1a6560
  outline: 2px solid #e2f0ee
  outline-offset: 0

error:
  border: 1px solid #fca5a5
  bg: #fff8f8
  texto de error debajo: DM Sans 11px / #991b1b

disabled:
  bg: #f3f2ef
  texto: #9a958f
  cursor: not-allowed
```

### Card estándar

```
bg:         #ffffff
border:     0.5px solid #e5e2dc
radius:     10px
padding:    16px
sombra:     ninguna

Header interno:
  H3 15px / 500 / #0d0d0d
  Badge de estado alineado a la derecha en el mismo flex row
  border-bottom: 0.5px solid #edeae4
  padding-bottom: 12px / margin-bottom: 12px

Divisor interno:
  border-top: 0.5px solid #edeae4
  margin: 12px 0
```

### Badge / Pill

```
font:    DM Sans 11px / 500
padding: 2px 8px
radius:  6px (estado) · 9999px (solo para estado vital: vivo/fallecido)

variantes:
  success:  bg #f0fdf4 · texto #15803d
  warning:  bg #fffbeb · texto #92400e
  error:    bg #fef2f2 · texto #991b1b
  info:     bg #eff6ff · texto #1e3a8a
  accent:   bg #e2f0ee · texto #1a6560
  neutral:  bg #f3f2ef · texto #3c3a36
```

### Sidebar

```
width:       220px
bg:          #f9f9f7 (mismo que app bg)
border-right: 0.5px solid #e5e2dc
padding:     0

Logo / Brand area:
  padding: 16px 18px 14px
  border-bottom: 0.5px solid #e5e2dc

Selector de refugio:
  padding: 10px 12px
  margin: 8px
  radius: 8px
  bg hover: #f3f2ef
  font: DM Sans 12px / 500 / #0d0d0d
  sub: DM Sans 10px / 400 / #9a958f (el rol)

Nav section label:
  font: DM Sans 10px / 500 / #9a958f / uppercase / letter-spacing 0.06em
  padding: 16px 18px 4px
  (primer label no tiene padding-top)

Nav item default:
  padding: 7px 12px
  margin: 0 8px
  radius: 8px
  font: DM Sans 12px / 400 / #3c3a36
  gap icono-label: 8px
  hover: bg #f3f2ef

Nav item activo:
  bg: #1a6560
  texto: #f9f9f7 · 500
  border-left: none (el bg ya comunica el estado)

Nav item Axo AI (especial, al fondo):
  separado del resto por border-top: 0.5px solid #e5e2dc
  font: DM Sans 12px / 500 / #1a6560
  pip: círculo 6px #1a6560 (indica "activo/vivo")
  bg hover: #e2f0ee

Nav item Configuración:
  ícono de engranaje + "Configuración"
  default / hover igual que nav items
```

### Topbar (dentro del app)

```
height:      52px
bg:          #f9f9f7 (o #ffffff — consistente con el fondo de la sección)
border-bottom: 0.5px solid #e5e2dc
padding:     0 24px
layout:      flex space-between align-center

Left:
  Título de sección: H2 20px / 500 / #0d0d0d
  Breadcrumb opcional: DM Sans 13px / #9a958f / separador "/"

Right:
  Fecha: DM Sans 12px / #9a958f / DM Mono para el valor de fecha
  Acciones contextuales de la sección (máx 2 botones)
```

### Tabla de datos

```
header:
  DM Sans 11px / 500 / #9a958f / uppercase / letter-spacing 0.04em
  padding: 10px 14px
  border-bottom: 0.5px solid #e5e2dc
  bg: #f9f9f7

row:
  border-bottom: 0.5px solid #edeae4
  padding: 12px 14px
  hover: bg #f9f9f7
  transition: 100ms

Valores de texto: DM Sans 13px / #3c3a36
Valores numéricos: DM Mono 13px / #0d0d0d
IDs / Códigos:     DM Mono 12px / #1a6560 (son links)

alternating: no usar (el hover es suficiente)
```

### Bar de parámetro (módulo Salud)

```
track:   height 4px · bg #e5e2dc · radius 2px
fill ok: bg #1a6560
fill warning: bg #d97706
fill error:   bg #dc2626

label:   DM Sans 11px / #9a958f · width 80px · flex-shrink 0
valor:   DM Mono 12px / 500 / color dinámico según rango · text-align right · width 56px
```

### Axo AI strip (dentro de cards)

```
bg:     #e2f0ee
radius: 8px
padding: 10px 12px
border-left: 2px solid #1a6560
layout: flex gap 8px align-start

label "Axo AI":
  DM Sans 10px / 500 / #1a6560
  flex-shrink 0
  padding-top: 1px

texto:
  DM Sans 12px / #0d3d3a / line-height 1.5
```

### Axo AI chat bubble (módulo Axo AI)

```
USUARIO (derecha):
  bg: #e2f0ee
  radius: 10px 10px 2px 10px
  padding: 10px 14px
  font: DM Sans 13px / #0d0d0d
  max-width: 65%

AXOLINE (izquierda — sin bubble):
  sin bg
  label "Axo AI": DM Sans 10px / 500 / #1a6560 · display block · margin-bottom 4px
  texto: DM Sans 13px / #3c3a36 · line-height 1.6
  max-width: 80%

TABLA dentro de respuesta de Axo AI:
  radius: 6px
  border: 0.5px solid #e5e2dc
  overflow: hidden
  header: bg #f9f9f7 · DM Sans 10px / 500 / #9a958f / uppercase
  valores: DM Mono 12px

BOTONES de confirmación (cuando Axo AI propone una acción):
  layout: flex gap 8px · margin-top 12px
  "Confirmar": botón primario compact (padding 6px 14px)
  "Cancelar":  botón secundario compact
```

### Toast / Notificación

```
posición: fixed bottom-right · padding 20px
width: 320px
bg: #ffffff
radius: 10px
sombra: 0 4px 16px rgba(13,13,13,0.08)
border-left: 3px solid [color según tipo]
padding: 14px 16px

título: DM Sans 13px / 500 / #0d0d0d
body:   DM Sans 12px / #3c3a36
botón cerrar: × · #9a958f · top-right

tipos:
  success: border #15803d
  warning: border #92400e
  error:   border #991b1b
  info:    border #1a6560

animación:
  enter: translateY(8px) opacity 0 → translateY(0) opacity 1 · 200ms ease
  exit:  translateY(0) opacity 1 → translateY(-4px) opacity 0 · 150ms ease
```

### Modal

```
overlay: rgba(13,13,13,0.32) · backdrop-filter blur(2px)
card:
  bg: #ffffff
  radius: 14px
  padding: 24px
  width: 480px (default) · 640px (large) · 380px (compact)
  sombra: 0 8px 32px rgba(13,13,13,0.12)

header:
  título: H2 20px / 500 / #0d0d0d
  sub:    DM Sans 13px / #9a958f · margin-top 4px
  botón × en top-right: 20px · #9a958f · hover #0d0d0d

footer:
  border-top: 0.5px solid #e5e2dc
  padding-top: 16px · margin-top: 24px
  layout: flex justify-end gap 8px

animación:
  overlay: opacity 0→1 · 150ms
  card:    scale 0.97 opacity 0 → scale 1 opacity 1 · 180ms ease-out
```

---

## Iconografía

Usar **Lucide Icons** exclusivamente. Stroke width: `1.5px`. Size estándar: `16px` en nav y labels, `14px` en tablas, `20px` en empty states.

No usar iconos filled salvo en estado activo del nav (el bg teal ya comunica el estado — preferir outlined en nav también).

---

## Micro interacciones y animaciones

### Principio: movimiento con propósito

Ninguna animación es decorativa. Cada una comunica un cambio de estado.

```
Duración estándar:   150ms  (feedback inmediato: hover, focus, active)
Duración media:      200ms  (aparecer/desaparecer elementos)
Duración larga:      300ms  (transiciones de página, modales)
Máximo absoluto:     400ms  (solo animaciones de entrada complejas)

Easing default:      ease   (para la mayoría)
Easing entrada:      ease-out (elementos que aparecen)
Easing salida:       ease-in  (elementos que desaparecen)
```

### Estados específicos

```
Botón hover:     bg cambia · transition 150ms ease
Botón active:    transform scale(0.98) · transition 80ms ease
Input focus:     border color + outline · transition 150ms ease
Card hover:      bg #f9f9f7 → ligero · transition 100ms ease
Nav item:        bg · transition 120ms ease
Badge aparecer:  opacity 0→1 + scale 0.95→1 · transition 150ms ease-out
Toast entrada:   translateY(8px) opacity 0 → 0 opacity 1 · 200ms ease-out
Modal:           scale(0.97) opacity 0 → 1 · 180ms ease-out
Loading spinner: rotate 360deg · 800ms linear infinite
Skeleton:        shimmer de izquierda a derecha · 1.5s ease infinite
```

---

## Estados de componentes

Todo componente tiene estos estados definidos. Sin excepción.

| Estado | Descripción |
|---|---|
| **Default** | Estado base de reposo |
| **Hover** | El cursor está sobre el elemento |
| **Focus** | El elemento tiene foco de teclado |
| **Active** | El elemento está siendo presionado |
| **Loading** | Esperando respuesta de red |
| **Disabled** | No interactuable |
| **Empty** | Sin datos que mostrar |
| **Error** | Algo salió mal |
| **Success** | Acción completada correctamente |

---

## Empty states

```
Layout: centrado vertical y horizontal en el área disponible
Ícono: Lucide icon outline · 32px · #e5e2dc
Título: DM Sans 15px / 500 / #0d0d0d · margin-top 16px
Desc:   DM Sans 13px / #9a958f · max-width 280px · text-align center · margin-top 6px
CTA:    botón primario o secundario · margin-top 20px

Sin ilustraciones elaboradas. Sin personajes. Sin color.
Solo el ícono outline, el texto y el CTA.
```

---

## Logo y marca en pantalla

```
WORDMARK COMPLETO
  Texto: "Axo" en DM Sans 500
  Color: #0d0d0d para "A" y "o"
  Color: #1a6560 para la X (los extremos superiores de los trazos)
  Tamaño en sidebar: 18px
  Tamaño en landing header: 22px
  Tamaño en auth/onboarding: 28px

VERSIÓN REDUCIDA (favicon, sidebar colapsado)
  Solo la letra X modificada con extremos en #1a6560
  Sobre fondo #f9f9f7 o #0d0d0d

VERSIÓN SOBRE OSCURO (footer, banners)
  Texto: #f9f9f7
  X: #1a6560 (igual — el teal funciona sobre oscuro)

ESPACIO MÍNIMO ALREDEDOR
  Equivalente a la altura de la "A" en todos los lados
```

---

## Responsive

### Breakpoints

```
mobile:   < 768px
tablet:   768px – 1024px
desktop:  > 1024px
wide:     > 1440px
```

### Comportamiento en mobile

```
Sidebar: colapsada por defecto → drawer desde la izquierda al tocar el menú
         El drawer tiene backdrop oscuro
Topbar: logo reducido (solo X) + título de sección + botón de menú

Módulo Salud (captura de parámetros):
  Inputs numéricos grandes (44px de alto mínimo para touch target)
  Teclado numérico activado automáticamente (inputmode="decimal")
  El CTA "Guardar" es ancho completo y sticky al fondo

Cards: full-width en mobile
Tablas: scroll horizontal con primera columna sticky
Modales: bottom sheet en mobile (sube desde abajo, radius 14px 14px 0 0)
```

---

## Dark mode

No se implementa en el MVP. El producto es 100% light mode con la paleta de fondos hueso definida. La decisión es deliberada: los datos científicos (mediciones, tablas, gráficas) son más legibles con alto contraste sobre fondo claro. Dark mode entra en v2 si los usuarios lo demandan.

---

## Variables CSS — referencia completa para desarrollo

```css
:root {
  /* Fondos */
  --bg-app:         #f9f9f7;
  --bg-card:        #ffffff;
  --bg-subtle:      #f3f2ef;
  --border:         #e5e2dc;
  --border-sub:     #edeae4;

  /* Textos */
  --text-primary:   #0d0d0d;
  --text-secondary: #3c3a36;
  --text-disabled:  #9a958f;

  /* Acento */
  --accent:         #1a6560;
  --accent-bg:      #e2f0ee;
  --accent-hover:   #144f4b;
  --accent-text:    #f9f9f7;

  /* System */
  --success:        #15803d;
  --success-bg:     #f0fdf4;
  --success-border: #bbf7d0;
  --warning:        #92400e;
  --warning-bg:     #fffbeb;
  --warning-border: #fde68a;
  --error:          #991b1b;
  --error-bg:       #fef2f2;
  --error-border:   #fecaca;
  --info:           #1e3a8a;
  --info-bg:        #eff6ff;
  --info-border:    #bfdbfe;

  /* Tipografía */
  --font-sans:      'DM Sans', sans-serif;
  --font-mono:      'DM Mono', monospace;

  /* Border radius */
  --radius-xs:      6px;
  --radius-sm:      8px;
  --radius-md:      10px;
  --radius-lg:      14px;
  --radius-xl:      20px;
  --radius-full:    9999px;

  /* Sombras (uso restringido) */
  --shadow-float:   0 4px 16px rgba(13,13,13,0.06), 0 1px 4px rgba(13,13,13,0.04);
  --shadow-modal:   0 8px 32px rgba(13,13,13,0.12);

  /* Transiciones */
  --transition-fast:   150ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   300ms ease;

  /* Espaciado (referencia) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

---

## Lo que nunca hacemos

```
✗  Gradientes de color (ni en botones, ni en fondos, ni en ilustraciones)
✗  Sombras en cards de contenido regular (solo en elementos flotantes)
✗  Más de un botón primario (teal) por pantalla
✗  Border radius diferente al definido en la escala
✗  Fuentes distintas a DM Sans y DM Mono
✗  Usar system colors (success/warning/error/info) para decoración
✗  Texto blanco puro (#ffffff) sobre fondo teal — usar #f9f9f7
✗  Animaciones decorativas o que duren más de 400ms
✗  Dark mode en MVP
✗  Tablas con filas alternas de color (el hover lo resuelve)
✗  Iconos filled en estado default
✗  Más de 3 niveles de jerarquía de texto en una sola card
✗  Centrar texto en componentes de datos (siempre left-aligned)
✗  DM Sans para valores numéricos medibles
✗  DM Mono para texto editorial o de interfaz
```

---

*AMOXTLI · Axo Design System v1.0 · Mayo 2026*
*Responsable: Salomón Martínez · CEO AMOXTLI*
*Este documento es la fuente de verdad para todas las decisiones de diseño de Axo.*
*Modificaciones requieren versionado explícito (v1.1, v2.0).*
