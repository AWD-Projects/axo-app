// ── Mock factories ─────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq     = jest.fn(() => chain)
  chain.update = jest.fn(() => chain)
  chain.single = jest.fn()
  chain.upsert = jest.fn().mockResolvedValue({ data: null, error: null })
  return { ...chain, ...overrides }
}

// Separate instances to route by call order inside each test
let codeChain:         ReturnType<typeof makeChain>
let activeMemberChain: ReturnType<typeof makeChain>
let upsertChain:       ReturnType<typeof makeChain>
let countUpdateChain:  ReturnType<typeof makeChain>

const mockServerClient = { auth: { getUser: mockGetUser } }
const mockAdminClient  = { from: jest.fn() }

jest.mock("@/src/lib/supabase/server", () => ({ createClient:      () => mockServerClient }))
jest.mock("@/src/lib/supabase/admin",  () => ({ createAdminClient: () => mockAdminClient  }))

import { GET, POST } from "@/app/api/refugios/join-by-code/route"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_CODE = {
  id: "code-id-1",
  refugio_id: "refugio-abc",
  rol: "tecnico",
  activo: true,
  usos: 0,
  max_usos: null,
  expires_at: null,
  refugios: { nombre: "Lab UNAM", tipo: "laboratorio", ciudad: "CDMX", estado_republica: "CDMX" },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGetReq(code: string) {
  return new Request(`http://localhost/api/refugios/join-by-code?code=${code}`)
}
function makePostReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/refugios/join-by-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // resetAllMocks flushes the mockReturnValueOnce queue so unconsumed once-values
  // from a prior test don't bleed into the next one.
  jest.resetAllMocks()
  codeChain         = makeChain()
  activeMemberChain = makeChain()
  upsertChain       = makeChain()
  countUpdateChain  = makeChain()

  // GET handler: only one from() call (codigos_refugio lookup)
  // POST handler: 4 from() calls in order:
  //   1 → code lookup (codigos_refugio)
  //   2 → active-member check (refugio_usuarios select)
  //   3 → upsert (refugio_usuarios upsert)
  //   4 → usage counter update (codigos_refugio update)
  mockAdminClient.from
    .mockReturnValueOnce(codeChain)
    .mockReturnValueOnce(activeMemberChain)
    .mockReturnValueOnce(upsertChain)
    .mockReturnValueOnce(countUpdateChain)
})

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/refugios/join-by-code", () => {
  it("returns 400 when no code param is provided", async () => {
    const res = await GET(new Request("http://localhost/api/refugios/join-by-code"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when code does not exist", async () => {
    codeChain.single.mockResolvedValue({ data: null, error: null })

    const res = await GET(makeGetReq("INVALID"))
    expect(res.status).toBe(404)
  })

  it("returns 400 when code is inactive", async () => {
    codeChain.single.mockResolvedValue({ data: { ...VALID_CODE, activo: false }, error: null })

    const res = await GET(makeGetReq("INACT-CODE"))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/inactivo/i)
  })

  it("returns 400 when code is expired", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    codeChain.single.mockResolvedValue({ data: { ...VALID_CODE, expires_at: yesterday }, error: null })

    const res = await GET(makeGetReq("EXPD-CODE"))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/expir/i)
  })

  it("returns 400 when code has reached max_usos", async () => {
    codeChain.single.mockResolvedValue({ data: { ...VALID_CODE, usos: 10, max_usos: 10 }, error: null })

    const res = await GET(makeGetReq("FULL-CODE"))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/usos/i)
  })

  it("returns refuge preview data for a valid code", async () => {
    codeChain.single.mockResolvedValue({ data: VALID_CODE, error: null })

    const res = await GET(makeGetReq("LAB-K7M3"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.nombre).toBe("Lab UNAM")
    expect(body.data.rol).toBe("tecnico")
  })

  it("normalizes code to uppercase before querying", async () => {
    codeChain.single.mockResolvedValue({ data: VALID_CODE, error: null })

    await GET(makeGetReq("lab-k7m3"))

    expect(codeChain.eq).toHaveBeenCalledWith("codigo", "LAB-K7M3")
  })
})

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/refugios/join-by-code", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Unauthorized" } })

    const res = await POST(makePostReq({ codigo: "LAB-K7M3" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when no codigo in body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })

    const res = await POST(makePostReq({}))
    expect(res.status).toBe(400)
  })

  it("returns 404 when code does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({ data: null, error: null })

    const res = await POST(makePostReq({ codigo: "WRONG" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when code is expired", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({
      data: { ...VALID_CODE, expires_at: new Date(0).toISOString() },
      error: null,
    })

    const res = await POST(makePostReq({ codigo: "EXPD-CODE" }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/expir/i)
  })

  it("returns 409 when user is already an active member", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({ data: VALID_CODE, error: null })
    activeMemberChain.single.mockResolvedValue({ data: { rol: "tecnico" }, error: null })

    const res = await POST(makePostReq({ codigo: "LAB-K7M3" }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toMatch(/miembro/i)
  })

  it("calls upsert (not insert) to handle previously-removed users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({ data: VALID_CODE, error: null })
    activeMemberChain.single.mockResolvedValue({ data: null, error: null }) // not active

    await POST(makePostReq({ codigo: "LAB-K7M3" }))

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ activo: true, refugio_id: "refugio-abc", rol: "tecnico" }),
      expect.objectContaining({ onConflict: "refugio_id,usuario_id" })
    )
  })

  it("increments usos after a successful join", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({ data: { ...VALID_CODE, usos: 3 }, error: null })
    activeMemberChain.single.mockResolvedValue({ data: null, error: null })

    await POST(makePostReq({ codigo: "LAB-K7M3" }))

    expect(countUpdateChain.update).toHaveBeenCalledWith({ usos: 4 })
  })

  it("returns success payload with refugio_id and rol", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    codeChain.single.mockResolvedValue({ data: VALID_CODE, error: null })
    activeMemberChain.single.mockResolvedValue({ data: null, error: null })

    const res = await POST(makePostReq({ codigo: "LAB-K7M3" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.refugio_id).toBe("refugio-abc")
    expect(body.data.rol).toBe("tecnico")
    expect(body.data.success).toBe(true)
  })
})
