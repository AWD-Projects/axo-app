import { NextResponse } from "next/server"

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockMembershipsChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn(),
}
const mockProfilesChain = {
  select: jest.fn().mockReturnThis(),
  in: jest.fn(),
}

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn(),
}
const mockAdmin = {
  from: jest.fn(),
}

jest.mock("@/src/lib/supabase/server", () => ({
  createClient: () => mockSupabase,
}))
jest.mock("@/src/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdmin,
}))

import { GET } from "@/app/api/refugios/[refugio_id]/usuarios/route"

const PARAMS = { params: { refugio_id: "refugio-123" } }

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest() {
  return new Request("http://localhost/api/refugios/refugio-123/usuarios")
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks()
  // Re-wire chainable methods after reset
  mockMembershipsChain.select.mockReturnThis()
  mockMembershipsChain.eq.mockReturnThis()
  mockProfilesChain.select.mockReturnThis()
  mockSupabase.from.mockReturnValue(mockMembershipsChain)
  mockAdmin.from.mockReturnValue(mockProfilesChain)
})

describe("GET /api/refugios/[id]/usuarios", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Not authenticated" } })

    const res = await GET(makeRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it("returns 401 when user is null even without error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await GET(makeRequest(), PARAMS)
    expect(res.status).toBe(401)
  })

  it("returns empty array when no active memberships exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    mockMembershipsChain.order.mockResolvedValue({ data: [], error: null })

    const res = await GET(makeRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it("returns merged membership + profile data", async () => {
    const memberships = [
      { id: "m1", rol: "admin",    activo: true, created_at: "2024-01-01T00:00:00Z", usuario_id: "u1" },
      { id: "m2", rol: "tecnico",  activo: true, created_at: "2024-01-02T00:00:00Z", usuario_id: "u2" },
    ]
    const profiles = [
      { id: "u1", nombre: "Ana",   apellido: "García",  email: "ana@test.com",  avatar_url: null },
      { id: "u2", nombre: "Luis",  apellido: "Martínez",email: "luis@test.com", avatar_url: null },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    mockMembershipsChain.order.mockResolvedValue({ data: memberships, error: null })
    mockProfilesChain.in.mockResolvedValue({ data: profiles, error: null })

    const res = await GET(makeRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].usuarios_perfil.nombre).toBe("Ana")
    expect(body.data[1].usuarios_perfil.nombre).toBe("Luis")
    expect(body.data[0].rol).toBe("admin")
  })

  it("fills in default profile when a user profile is missing", async () => {
    const memberships = [
      { id: "m1", rol: "tecnico", activo: true, created_at: "2024-01-01T00:00:00Z", usuario_id: "u-ghost" },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    mockMembershipsChain.order.mockResolvedValue({ data: memberships, error: null })
    mockProfilesChain.in.mockResolvedValue({ data: [], error: null }) // no profile returned

    const res = await GET(makeRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data[0].usuarios_perfil.id).toBe("u-ghost")
    expect(body.data[0].usuarios_perfil.nombre).toBeNull()
  })

  it("returns 500 when the memberships query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    mockMembershipsChain.order.mockResolvedValue({
      data: null,
      error: { message: "DB connection failed" },
    })

    const res = await GET(makeRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/DB connection failed/)
  })

  it("queries only activo=true memberships", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    mockMembershipsChain.order.mockResolvedValue({ data: [], error: null })

    await GET(makeRequest(), PARAMS)

    // eq("activo", true) must have been called on the chain
    expect(mockMembershipsChain.eq).toHaveBeenCalledWith("activo", true)
  })
})
