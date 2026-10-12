import { COEFICIENTE_UMBRAL } from "@/src/lib/constants"

/**
 * Cálculo de parentesco (kinship) de Wright sobre un pedigrí.
 * El coeficiente de endogamia de una cría hipotética de A × B es igual
 * al parentesco φ(A, B) entre sus progenitores.
 *
 * Valores de referencia (progenitores sin endogamia previa):
 *   hermanos completos 0.25 · medios hermanos 0.125 · primos hermanos 0.0625
 *
 * Se usa en la landing (simulador con colonia de ejemplo). No sustituye al
 * cálculo del panel, que corre en la base de datos sobre datos reales.
 */

export type Sexo = "F" | "M"

export interface Individuo {
  id: string
  sexo: Sexo
  madre: string | null
  padre: string | null
}

export type Nivel = "bajo" | "precaucion" | "alto"

export type Pedigri = Record<string, Individuo>

function profundidad(pedigri: Pedigri): Record<string, number> {
  const memo: Record<string, number> = {}
  const visita = (id: string): number => {
    if (memo[id] !== undefined) return memo[id]
    const ind = pedigri[id]
    const m = ind.madre ? visita(ind.madre) : -1
    const p = ind.padre ? visita(ind.padre) : -1
    memo[id] = Math.max(m, p) + 1
    return memo[id]
  }
  Object.keys(pedigri).forEach(visita)
  return memo
}

export function crearCalculadora(pedigri: Pedigri) {
  const prof = profundidad(pedigri)
  const cache = new Map<string, number>()

  const phi = (a: string | null, b: string | null): number => {
    if (!a || !b) return 0
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit

    let valor: number
    if (a === b) {
      const ind = pedigri[a]
      valor = (1 + phi(ind.madre, ind.padre)) / 2
    } else {
      // Se expande el individuo más "joven" (mayor profundidad): ninguno
      // de sus descendientes puede ser ancestro del otro.
      const [x, y] = prof[a] >= prof[b] ? [a, b] : [b, a]
      const ind = pedigri[x]
      valor = (phi(ind.madre, y) + phi(ind.padre, y)) / 2
    }
    cache.set(key, valor)
    return valor
  }

  return {
    /** Coeficiente de endogamia esperado de la cría de A × B. */
    coeficienteCruza: (a: string, b: string) => phi(a, b),
    /** Coeficiente de endogamia del individuo. */
    endogamia: (id: string) => phi(pedigri[id].madre, pedigri[id].padre),
  }
}

export function nivelRiesgo(coeficiente: number): Nivel {
  if (coeficiente >= COEFICIENTE_UMBRAL.danger) return "alto"
  if (coeficiente >= COEFICIENTE_UMBRAL.warning) return "precaucion"
  return "bajo"
}

/** Parentesco entre los dos progenitores, descrito a partir de la genealogía. */
export function describirRelacion(
  pedigri: Pedigri,
  a: string,
  b: string,
  coeficiente: number
): string {
  const ia = pedigri[a]
  const ib = pedigri[b]
  if (ia.madre === b || ia.padre === b || ib.madre === a || ib.padre === a) {
    return "Progenitor y cría"
  }
  const padresA = [ia.madre, ia.padre].filter(Boolean) as string[]
  const padresB = [ib.madre, ib.padre].filter(Boolean) as string[]
  const comunes = padresA.filter((p) => padresB.includes(p)).length
  if (comunes === 2) return "Hermanos completos"
  if (comunes === 1) return "Medios hermanos"
  if (coeficiente === 0) return "Sin ancestros en común"
  return "Ancestros en común más atrás en el linaje"
}

/** Colonia de ejemplo (ficticia) usada por el simulador de la landing. */
export const COLONIA_EJEMPLO: Pedigri = {
  "F-01": { id: "F-01", sexo: "M", madre: null, padre: null },
  "F-02": { id: "F-02", sexo: "F", madre: null, padre: null },
  "F-03": { id: "F-03", sexo: "M", madre: null, padre: null },
  "F-04": { id: "F-04", sexo: "F", madre: null, padre: null },
  "A-11": { id: "A-11", sexo: "F", madre: "F-02", padre: "F-01" },
  "A-12": { id: "A-12", sexo: "M", madre: "F-02", padre: "F-01" },
  "A-13": { id: "A-13", sexo: "F", madre: "F-04", padre: "F-01" },
  "A-14": { id: "A-14", sexo: "M", madre: "F-04", padre: "F-03" },
  "B-21": { id: "B-21", sexo: "F", madre: "A-13", padre: "A-12" },
  "B-22": { id: "B-22", sexo: "M", madre: "A-11", padre: "A-14" },
}

/** 3 decimales, o 4 cuando hacen falta (0.0625, 0.3125). */
export function formatoCoeficiente(c: number): string {
  return c.toFixed(4).replace(/0$/, "")
}
