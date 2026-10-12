import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Axo — El sistema operativo de tu refugio de ajolote"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const pill = (label: string, active = false) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "56px",
      width: "132px",
      borderRadius: "28px",
      border: `2px solid ${active ? "#1a6560" : "#e5e2dc"}`,
      background: active ? "#e2f0ee" : "#ffffff",
      color: active ? "#1a6560" : "#3c3a36",
      fontSize: "26px",
    }}
  >
    {label}
  </div>
)

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f9f9f7",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "40px", fontWeight: 600, letterSpacing: "4px", color: "#0d0d0d" }}>
          AXO
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              lineHeight: 1.1,
              fontWeight: 600,
              color: "#0d0d0d",
              maxWidth: "980px",
            }}
          >
            Sabe qué tan emparentada está una cruza antes de hacerla.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "48px" }}>
            {pill("A-11", true)}
            <div style={{ display: "flex", fontSize: "30px", color: "#3c3a36" }}>×</div>
            {pill("A-12", true)}
            <div style={{ display: "flex", fontSize: "30px", color: "#3c3a36", marginLeft: "12px" }}>
              coeficiente 0.250
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
