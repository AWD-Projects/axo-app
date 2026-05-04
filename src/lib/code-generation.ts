// Unambiguous characters — excludes 0/O, 1/I/L to avoid confusion
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

const STOP_WORDS = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "o", "en", "a"])

export function toAbbreviation(nombre: string): string {
  const words = nombre.trim().toUpperCase().split(/\s+/).filter(Boolean)
  const significant = words.filter(w => !STOP_WORDS.has(w.toLowerCase()))
  if (significant.length === 0) return "REF"
  if (significant.length === 1) {
    const clean = significant[0].replace(/[^A-Z0-9]/g, "")
    return clean.slice(0, 4) || "REF"
  }
  const initials = significant.slice(0, 4).map(w => w.replace(/[^A-Z0-9]/g, "")[0]).filter(Boolean).join("")
  return initials || "REF"
}

// Generates a refuge access code: {ABR}-{4 random chars}
// Loops until unique against the provided existing list.
export function generateUniqueCode(nombre: string, existing: string[]): string {
  const abr = toAbbreviation(nombre)
  for (let i = 0; i < 50; i++) {
    const suffix = Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("")
    const code = `${abr}-${suffix}`
    if (!existing.includes(code)) return code
  }
  // Fallback: longer suffix virtually guarantees uniqueness
  const suffix = Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("")
  return `${abr}-${suffix}`
}

// Generates a sequential ajolote code: {ABR}-{zero-padded index}
export function generateAjoloteCode(nombre: string, index: number): string {
  return `${toAbbreviation(nombre)}-${String(index).padStart(3, "0")}`
}
