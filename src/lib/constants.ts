// Rangos basados en literatura científica peer-reviewed (WSAVA 2015, Frontiers-UNAM 2025,
// Ambystoma Genetic Stock Center UKy 2024, PMC10000224, PMC10948202).
// "min/max" son los límites del rango óptimo de operación, no umbrales de alerta.
export const RANGOS_SEGUROS = {
  temperatura: { min: 16,   max: 18   },  // °C — óptimo reproductivo; tolerado 14–22 °C
  ph:          { min: 7.0,  max: 7.8  },  // objetivo operativo; >8.0 amplifica toxicidad de NH3
  amonio:      { min: 0,    max: 0.25 },  // mg/L TAN — inicio de daño crónico a branquias
  nitrito:     { min: 0,    max: 0.2  },  // mg/L NO2⁻ — inicio de methemoglobinemia
  oxigeno:     { min: 6.0,  max: 10.0 },  // mg/L — mínimo seguro >6.0; saturación óptima 80–100%
} as const

export const COEFICIENTE_UMBRAL = {
  warning: 0.125,  // primo hermano
  danger:  0.25,   // hermano completo
} as const
