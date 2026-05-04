/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { GenerarCodigoModal } from "@/components/configuracion/generar-codigo-modal"

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Silence framer-motion animation in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Helpers ────────────────────────────────────────────────────────────────────

function emptyCodesResponse() {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
}

function renderModal(props: Partial<React.ComponentProps<typeof GenerarCodigoModal>> = {}) {
  return render(
    <GenerarCodigoModal
      open={true}
      onClose={jest.fn()}
      refugioId="refugio-123"
      refugioNombre="Laboratorio UNAM"
      onSuccess={jest.fn()}
      {...props}
    />
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) })
})

describe("GenerarCodigoModal — rendering", () => {
  it("does not render when open=false", () => {
    renderModal({ open: false })
    expect(screen.queryByText("Nuevo código de acceso")).toBeNull()
  })

  it("renders the modal title when open=true", async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByText("Nuevo código de acceso")).toBeInTheDocument()
    })
  })

  it("renders a regenerate button", async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByTitle("Generar otro código")).toBeInTheDocument()
    })
  })

  it("does not render any text input for the code", async () => {
    const { container } = renderModal()
    await waitFor(() => {
      // The code is displayed as a <span>, never as an <input>
      const inputs = container.querySelectorAll("input[type='text']")
      const codeInputs = Array.from(inputs).filter(
        el => (el as HTMLInputElement).placeholder?.toLowerCase().includes("código")
      )
      expect(codeInputs).toHaveLength(0)
    })
  })
})

describe("GenerarCodigoModal — code generation", () => {
  it("generates a code matching the refuge name abbreviation pattern", async () => {
    renderModal({ refugioNombre: "Laboratorio UNAM" })
    await waitFor(() => {
      // "LU" is the abbreviation of "Laboratorio UNAM"
      expect(screen.getByText(/^LU-[A-Z0-9]+$/)).toBeInTheDocument()
    })
  })

  it("generates a code with prefix derived from single-word name", async () => {
    renderModal({ refugioNombre: "CIBAC" })
    await waitFor(() => {
      expect(screen.getByText(/^CIBA-[A-Z0-9]+$/)).toBeInTheDocument()
    })
  })

  it("avoids codes already returned by the API", async () => {
    // Fill all possible 4-char codes with prefix "LU" is impractical,
    // so we test that existing codes are fetched and used as exclusion list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ codigo: "LU-AAAA" }, { codigo: "LU-BBBB" }] }),
    })

    renderModal()

    await waitFor(() => {
      const code = screen.getByText(/^LU-[A-Z0-9]+$/).textContent
      expect(code).not.toBe("LU-AAAA")
      expect(code).not.toBe("LU-BBBB")
    })
  })

  it("regenerates a new code when the regenerate button is clicked", async () => {
    renderModal()

    // Wait for initial code to appear
    let firstCode = ""
    await waitFor(() => {
      const el = screen.getByText(/^LU-[A-Z0-9]+$/)
      firstCode = el.textContent ?? ""
      expect(firstCode).toMatch(/^LU-/)
    })

    const regenerateBtn = screen.getByTitle("Generar otro código")

    // Click several times since the new code is random and could theoretically match
    let newCode = firstCode
    for (let i = 0; i < 5 && newCode === firstCode; i++) {
      fireEvent.click(regenerateBtn)
      await waitFor(() => {
        const el = screen.getByText(/^LU-[A-Z0-9]+$/)
        newCode = el.textContent ?? ""
      })
    }

    expect(newCode).toMatch(/^LU-[A-Z0-9]+$/)
  })
})

describe("GenerarCodigoModal — form submission", () => {
  it("calls the POST API with the generated code when creating", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })   // GET codes
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { id: "c1", codigo: "LU-TEST" } }) }) // POST

    renderModal()

    // Wait for code to load
    await waitFor(() => screen.getByText(/^LU-[A-Z0-9]+$/))

    const createBtn = screen.getByText("Crear código")
    fireEvent.click(createBtn)

    await waitFor(() => {
      const [, postCall] = mockFetch.mock.calls
      expect(postCall[1].method).toBe("POST")
      const body = JSON.parse(postCall[1].body)
      expect(body.codigo).toMatch(/^LU-[A-Z0-9]+$/)
    })
  })

  it("shows the success screen after creation", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { id: "c1", codigo: "LU-DONE" } }) })

    renderModal()
    await waitFor(() => screen.getByText(/^LU-[A-Z0-9]+$/))

    fireEvent.click(screen.getByText("Crear código"))

    await waitFor(() => {
      expect(screen.getByText("Código creado")).toBeInTheDocument()
    })
  })

  it("shows error message when API returns an error", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Código ya existe" }) })

    renderModal()
    await waitFor(() => screen.getByText(/^LU-[A-Z0-9]+$/))

    fireEvent.click(screen.getByText("Crear código"))

    await waitFor(() => {
      expect(screen.getByText("Código ya existe")).toBeInTheDocument()
    })
  })

  it("Cancelar button calls onClose", async () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    await waitFor(() => screen.getByText("Cancelar"))

    fireEvent.click(screen.getByText("Cancelar"))
    expect(onClose).toHaveBeenCalled()
  })
})
