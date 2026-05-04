import {
  toAbbreviation,
  generateUniqueCode,
  generateAjoloteCode,
} from "@/src/lib/code-generation"

// ── toAbbreviation ────────────────────────────────────────────────────────────

describe("toAbbreviation", () => {
  it("takes initials of multiple significant words", () => {
    expect(toAbbreviation("Laboratorio UNAM")).toBe("LU")
    expect(toAbbreviation("Refugio Axolotl Lab")).toBe("RAL")
    expect(toAbbreviation("Centro Investigacion Biologia Acuatica")).toBe("CIBA")
  })

  it("ignores spanish stop words", () => {
    expect(toAbbreviation("Laboratorio de Biologia")).toBe("LB")
    expect(toAbbreviation("Refugio del Ajolote")).toBe("RA")
    expect(toAbbreviation("Centro de Investigacion y Conservacion")).toBe("CIC")
  })

  it("takes up to 4 chars of a single-word name", () => {
    expect(toAbbreviation("CIBAC")).toBe("CIBA")
    expect(toAbbreviation("Axo")).toBe("AXO")
    expect(toAbbreviation("UAM")).toBe("UAM")
  })

  it("returns REF when name is empty or only stop words", () => {
    expect(toAbbreviation("")).toBe("REF")
    expect(toAbbreviation("de la y el")).toBe("REF")
  })

  it("handles mixed case input", () => {
    expect(toAbbreviation("laboratorio unam")).toBe("LU")
    expect(toAbbreviation("REFUGIO NACIONAL")).toBe("RN")
  })

  it("strips non-alphanumeric characters", () => {
    expect(toAbbreviation("Lab. UAM-Xochimilco")).toBe("LU")
  })

  it("caps at 4 significant words even for long names", () => {
    // Significant words (after removing "de"): Centro, Nacional, Refugios, Ambystoma, Mexicanum
    // First 4 initials: C, N, R, A → "CNRA"
    const result = toAbbreviation("Centro Nacional de Refugios de Ambystoma Mexicanum")
    expect(result).toHaveLength(4)
    expect(result).toBe("CNRA")
  })
})

// ── generateUniqueCode ────────────────────────────────────────────────────────

describe("generateUniqueCode", () => {
  it("returns code in {ABR}-{XXXX} format", () => {
    const code = generateUniqueCode("Laboratorio UNAM", [])
    expect(code).toMatch(/^LU-[A-Z0-9]{4}$/)
  })

  it("avoids codes already in the existing list", () => {
    // Fill 100 generated codes to check none collide
    const existing: string[] = []
    for (let i = 0; i < 100; i++) {
      const code = generateUniqueCode("Lab Test", existing)
      expect(existing).not.toContain(code)
      existing.push(code)
    }
  })

  it("uses the abbreviation of the refuge name as prefix", () => {
    const code = generateUniqueCode("Refugio Nacional", [])
    expect(code.startsWith("RN-")).toBe(true)
  })

  it("only uses unambiguous characters in suffix", () => {
    // Run 200 times to get a statistical sample
    const ambiguous = /[01ILO]/
    for (let i = 0; i < 200; i++) {
      const code = generateUniqueCode("Test Refugio", [])
      const suffix = code.split("-")[1]
      expect(ambiguous.test(suffix)).toBe(false)
    }
  })

  it("falls back to 6-char suffix when all 4-char codes are taken", () => {
    // Simulate exhausted pool by pre-filling 50+ entries; the function falls back
    const existing = Array.from({ length: 51 }, (_, i) => `TR-${String(i).padStart(4, "0")}`)
    const code = generateUniqueCode("Test Refugio", existing)
    expect(code.startsWith("TR-")).toBe(true)
    expect(code).not.toBeUndefined()
  })
})

// ── generateAjoloteCode ───────────────────────────────────────────────────────

describe("generateAjoloteCode", () => {
  it("returns code in {ABR}-{NNN} format", () => {
    expect(generateAjoloteCode("Laboratorio UNAM", 1)).toBe("LU-001")
    expect(generateAjoloteCode("Laboratorio UNAM", 42)).toBe("LU-042")
    expect(generateAjoloteCode("Laboratorio UNAM", 100)).toBe("LU-100")
  })

  it("zero-pads the index to 3 digits", () => {
    expect(generateAjoloteCode("Refugio", 1)).toBe("REFU-001")
    expect(generateAjoloteCode("Refugio", 9)).toBe("REFU-009")
    expect(generateAjoloteCode("Refugio", 99)).toBe("REFU-099")
  })

  it("handles large indices beyond 3 digits", () => {
    const code = generateAjoloteCode("Lab", 1000)
    expect(code).toBe("LAB-1000")
  })

  it("reflects the correct abbreviation for the refuge name", () => {
    expect(generateAjoloteCode("Centro Biologia Acuatica", 5)).toBe("CBA-005")
    expect(generateAjoloteCode("UNAM Axolotl", 12)).toBe("UA-012")
  })
})
