import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/lib/code-generation.ts",
    "app/api/refugios/[refugio_id]/usuarios/route.ts",
    "app/api/refugios/[refugio_id]/codigos/route.ts",
    "app/api/refugios/join-by-code/route.ts",
    "components/configuracion/generar-codigo-modal.tsx",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: { lines: 80 },
  },
}

export default createJestConfig(config)
