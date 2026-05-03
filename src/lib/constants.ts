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
