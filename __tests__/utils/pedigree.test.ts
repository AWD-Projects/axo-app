import {
  COLONIA_EJEMPLO,
  crearCalculadora,
  describirRelacion,
  formatoCoeficiente,
  nivelRiesgo,
  type Pedigri,
} from "@/src/lib/pedigree"

const base: Pedigri = {
  p1: { id: "p1", sexo: "M", madre: null, padre: null },
  p2: { id: "p2", sexo: "F", madre: null, padre: null },
  p3: { id: "p3", sexo: "M", madre: null, padre: null },
  p4: { id: "p4", sexo: "F", madre: null, padre: null },
  // hermanos completos
  fs1: { id: "fs1", sexo: "M", madre: "p2", padre: "p1" },
  fs2: { id: "fs2", sexo: "F", madre: "p2", padre: "p1" },
  // medios hermanos (comparten padre p1)
  hs1: { id: "hs1", sexo: "F", madre: "p4", padre: "p1" },
  // no emparentado con los anteriores
  u1: { id: "u1", sexo: "M", madre: "p4", padre: "p3" },
}

describe("coeficiente de cruza", () => {
  const c = crearCalculadora(base)

  it("hermanos completos = 0.25", () => {
    expect(c.coeficienteCruza("fs1", "fs2")).toBeCloseTo(0.25)
  })
  it("medios hermanos = 0.125", () => {
    expect(c.coeficienteCruza("fs1", "hs1")).toBeCloseTo(0.125)
  })
  it("sin ancestros en común = 0", () => {
    expect(c.coeficienteCruza("fs1", "u1")).toBe(0)
  })
  it("es simétrico", () => {
    expect(c.coeficienteCruza("fs1", "hs1")).toBeCloseTo(c.coeficienteCruza("hs1", "fs1"))
  })
  it("primos hermanos = 0.0625", () => {
    const p: Pedigri = {
      ...base,
      c1: { id: "c1", sexo: "M", madre: "p4", padre: "fs1" },
      c2: { id: "c2", sexo: "F", madre: "p3", padre: "fs2" },
    }
    // c1 y c2 son hijos de dos hermanos completos (fs1, fs2) con parejas externas
    expect(crearCalculadora(p).coeficienteCruza("c1", "c2")).toBeCloseTo(0.0625)
  })
  it("padre con su cría = 0.25 si el padre no es endogámico y la madre no es pariente", () => {
    const p: Pedigri = {
      ...base,
      k: { id: "k", sexo: "F", madre: "p2", padre: "u1" },
    }
    expect(crearCalculadora(p).coeficienteCruza("u1", "k")).toBeCloseTo(0.25)
  })
  it("endogamia de la cría de hermanos completos = 0.25", () => {
    const p: Pedigri = {
      ...base,
      x: { id: "x", sexo: "F", madre: "fs2", padre: "fs1" },
    }
    expect(crearCalculadora(p).endogamia("x")).toBeCloseTo(0.25)
  })
})

describe("niveles de riesgo", () => {
  it("usa los umbrales de COEFICIENTE_UMBRAL con >=", () => {
    expect(nivelRiesgo(0)).toBe("bajo")
    expect(nivelRiesgo(0.0625)).toBe("bajo")
    expect(nivelRiesgo(0.125)).toBe("precaucion")
    expect(nivelRiesgo(0.2499)).toBe("precaucion")
    expect(nivelRiesgo(0.25)).toBe("alto")
    expect(nivelRiesgo(0.3125)).toBe("alto")
  })
  it("describe la relación a partir de la genealogía", () => {
    const P = COLONIA_EJEMPLO
    expect(describirRelacion(P, "A-11", "A-14", 0)).toMatch(/Sin ancestros/)
    expect(describirRelacion(P, "A-11", "A-12", 0.25)).toBe("Hermanos completos")
    expect(describirRelacion(P, "A-13", "A-12", 0.125)).toBe("Medios hermanos")
    expect(describirRelacion(P, "B-21", "A-12", 0.3125)).toBe("Progenitor y cría")
    expect(describirRelacion(P, "A-11", "B-22", 0.25)).toBe("Progenitor y cría")
  })
})

describe("colonia de ejemplo", () => {
  const c = crearCalculadora(COLONIA_EJEMPLO)
  it("cubre los tres niveles de riesgo", () => {
    const niveles = new Set<string>()
    const ids = Object.keys(COLONIA_EJEMPLO)
    for (const f of ids.filter((i) => COLONIA_EJEMPLO[i].sexo === "F")) {
      for (const m of ids.filter((i) => COLONIA_EJEMPLO[i].sexo === "M")) {
        niveles.add(nivelRiesgo(c.coeficienteCruza(f, m)))
      }
    }
    expect(niveles).toEqual(new Set(["bajo", "precaucion", "alto"]))
  })
  it("valores conocidos", () => {
    expect(c.coeficienteCruza("A-11", "A-12")).toBeCloseTo(0.25)
    expect(c.coeficienteCruza("A-13", "A-12")).toBeCloseTo(0.125)
    expect(c.coeficienteCruza("A-11", "A-14")).toBe(0)
    expect(c.coeficienteCruza("B-21", "A-12")).toBeCloseTo(0.3125)
  })
})

describe("formato", () => {
  it("conserva el cuarto decimal cuando hace falta", () => {
    expect(formatoCoeficiente(0)).toBe("0.000")
    expect(formatoCoeficiente(0.25)).toBe("0.250")
    expect(formatoCoeficiente(0.0625)).toBe("0.0625")
    expect(formatoCoeficiente(0.3125)).toBe("0.3125")
  })
})
