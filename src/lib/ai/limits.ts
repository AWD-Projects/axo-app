export const LIMITES_AI = {
  pionero:       50,       // consultas por mes
  estandar:      Infinity,
  academico:     Infinity,
  institucional: Infinity,
  regulador:     0,        // sin acceso
} as const

export type Plan = keyof typeof LIMITES_AI
