# Axo — Producto

> Contexto de producto para diseño. Creado en el rediseño de landing y acceso (v1.1).
> Lo que aquí figura como **supuesto** debe confirmarse con Salomón Martínez antes de tratarse como definitivo.

## Qué es
Axo es el sistema de gestión operativa de refugios de *Ambystoma mexicanum* (ajolote) en cautiverio: bitácora diaria (agua, alimentación, observaciones), trazabilidad genealógica con coeficiente de endogamia, y reportes de UMA. Incluye un asistente (Axo AI) que consulta los registros del refugio y pide confirmación antes de escribir.

## Para quién
Investigadores y laboratorios, operadores de UMAs, proyectos de rescate y criaderos. Personas que cuidan animales y que hoy llevan libreta y hoja de cálculo. Usuarias y usuarios no necesariamente técnicos; leen en español de México.

## Qué hace distinto
El cálculo de parentesco ocurre **antes** de decidir una cruza, sobre el linaje real de cada ejemplar. La landing lo demuestra con un simulador sobre una colonia de ejemplo (ficticia).

## Tono
Directo, técnico y cálido. Tuteo. Frases cortas, sin superlativos ni promesas que el producto no pueda sostener. Sin "líder", "#1", "certificado" ni logotipos de instituciones salvo que exista una relación documentada.

## Reglas de contenido (landing y acceso)
- Ninguna cifra, cita, logotipo o testimonio sin fuente verificable. Los datos de ejemplo se etiquetan como ejemplo.
- Los rangos de agua salen de `RANGOS_SEGUROS` y los umbrales de riesgo de `COEFICIENTE_UMBRAL` (`src/lib/constants.ts`). No se duplican a mano.
- El cálculo de la landing (`src/lib/pedigree.ts`) usa kinship de Wright y está cubierto por pruebas.

## Supuestos pendientes de confirmar
1. Precios en MXN, por mes (Esencial 890, Estándar 1,800, Avanzado 3,500) tal como estaban en la landing anterior.
2. No existe plan gratuito (se retiró "Crear cuenta gratis" y `price: 0` del JSON-LD).
3. Contacto público: `hello@amoxtli.tech` (la landing anterior usaba `hola@`).
4. Páginas legales (`/terminos`, `/privacidad`), `/about` y `/auth/reset-password` no existen todavía; el registro y el login siguen enlazándolas.
5. No hay testimonios ni casos publicables. Si el Dr. Zambrano u otra persona autoriza una cita, puede volver como sección.

## Dirección visual (ver DESIGN.md v1.1)
Cuaderno de laboratorio: fondo hueso, teal como único acento, DM Sans y DM Mono, bordes de 0.5px, cero gradientes. La pieza protagonista es el diagrama de pedigrí.
