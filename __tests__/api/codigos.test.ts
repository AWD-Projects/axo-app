// ── Mock factories ─────────────────────────────────────────────────────────────
// Arrow functions survive jest.clearAllMocks() because clearAllMocks only wipes
// calls/results — it does not remove implementations set with mockImplementation.

const mockGetUser = jest.fn()

// We rebuild the chains before each test so they have fresh terminal mocks
// while keeping chainable methods wired to the same chain object.
function makeMembershipChain() {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq     = jest.fn(() => chain)
  chain.single = jest.fn()
  return chain
}

function makeCodigosChain() {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq     = jest.fn(() => chain)
  chain.order  = jest.fn()
  chain.insert = jest.fn(() => chain)
  chain.single = jest.fn()
  return chain
}

let membershipChain: ReturnType<typeof makeMembershipChain>
let codigosChain: ReturnType<typeof makeCodigosChain>

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn(),
}

jest.mock("@/src/lib/supabase/server", () => ({ createClient: () => mockSupabase }))
jest.mock("@/src/lib/supabase/admin",  () => ({ createAdminClient: () => mockSupabase }))

import { GET, POST } from "@/app/api/refugios/[refugio_id]/codigos/route"

const PARAMS     = { params: { refugio_id: "refugio-123" } }
const ADMIN_USER = { id: "admin-user-id" }

function makeGetRequest()  { return new Request("http://localhost/api/refugios/refugio-123/codigos") }
function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/refugios/refugio-123/codigos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  // resetAllMocks flushes mockReturnValueOnce queues AND implementations,
  // preventing unconsumed once-values from leaking into subsequent tests.
  jest.resetAllMocks()
  membershipChain = makeMembershipChain()
  codigosChain    = makeCodigosChain()
  // First from() → membership check; subsequent calls → codigos table
  mockSupabase.from
    .mockReturnValueOnce(membershipChain)
    .mockReturnValue(codigosChain)
})

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/refugios/[id]/codigos", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Unauthorized" } })

    const res = await GET(makeGetRequest(), PARAMS)
    expect(res.status).toBe(401)
  })

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "tecnico" }, error: null })

    const res = await GET(makeGetRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/admin/i)
  })

  it("returns 403 when user has no membership", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: null, error: null })

    const res = await GET(makeGetRequest(), PARAMS)
    expect(res.status).toBe(403)
  })

  it("returns list of codes for admin", async () => {
    const codes = [
      { id: "c1", codigo: "LAB-X7K2", rol: "tecnico", activo: true,
        usos_actuales: 0, max_usos: null, expires_at: null, created_at: "2024-01-01T00:00:00Z" },
    ]
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })
    codigosChain.order.mockResolvedValue({ data: codes, error: null })

    const res = await GET(makeGetRequest(), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].codigo).toBe("LAB-X7K2")
  })

  it("returns 500 when codigos query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })
    codigosChain.order.mockResolvedValue({ data: null, error: { message: "DB error" } })

    const res = await GET(makeGetRequest(), PARAMS)
    expect(res.status).toBe(500)
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/refugios/[id]/codigos", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await POST(makePostRequest({ codigo: "TEST-1234", rol: "tecnico" }), PARAMS)
    expect(res.status).toBe(401)
  })

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "investigador" }, error: null })

    const res = await POST(makePostRequest({ codigo: "TEST-1234", rol: "tecnico" }), PARAMS)
    expect(res.status).toBe(403)
  })

  it("returns 400 when codigo is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })

    const res = await POST(makePostRequest({ rol: "tecnico" }), PARAMS)
    expect(res.status).toBe(400)
  })

  it("returns 400 when rol is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })

    const res = await POST(makePostRequest({ codigo: "TEST-1234" }), PARAMS)
    expect(res.status).toBe(400)
  })

  it("returns 400 when trying to create an admin-role code", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })

    const res = await POST(makePostRequest({ codigo: "ADMIN-XXXX", rol: "admin" }), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/admin/i)
  })

  it("creates code and returns 201", async () => {
    const created = { id: "c1", codigo: "LAB-K7M3", rol: "tecnico",
                      refugio_id: "refugio-123", activo: true }
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })
    codigosChain.single.mockResolvedValue({ data: created, error: null })

    const res = await POST(makePostRequest({ codigo: "lab-k7m3", rol: "tecnico" }), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.codigo).toBe("LAB-K7M3")
  })

  it("uppercases the codigo before inserting", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })
    codigosChain.single.mockResolvedValue({
      data: { id: "c1", codigo: "LAB-XXXX", rol: "tecnico" },
      error: null,
    })

    await POST(makePostRequest({ codigo: "lab-xxxx", rol: "tecnico" }), PARAMS)

    expect(codigosChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "LAB-XXXX" })
    )
  })

  it("returns 409 when codigo already exists (unique constraint)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null })
    membershipChain.single.mockResolvedValue({ data: { rol: "admin" }, error: null })
    codigosChain.single.mockResolvedValue({
      data: null,
      error: { message: "duplicate key value", code: "23505" },
    })

    const res = await POST(makePostRequest({ codigo: "DUPE-CODE", rol: "tecnico" }), PARAMS)
    expect(res.status).toBe(409)
  })
})
