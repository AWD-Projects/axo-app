import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Axo — El sistema operativo de tu refugio de ajolote"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

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
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "80px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#1a1a1a",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#f9f9f7", fontSize: "20px", fontWeight: "700" }}>A</span>
          </div>
          <span style={{ fontSize: "22px", fontWeight: "600", color: "#1a1a1a" }}>axo</span>
        </div>

        {/* Decorative axolotl silhouette area */}
        <div
          style={{
            position: "absolute",
            right: "80px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "380px",
            height: "380px",
            background: "linear-gradient(135deg, #e8f4f0 0%, #d4ede6 100%)",
            borderRadius: "50%",
            opacity: 0.6,
          }}
        />

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "640px", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              background: "#e8f4f0",
              borderRadius: "8px",
              padding: "6px 14px",
              width: "fit-content",
            }}
          >
            <span style={{ fontSize: "14px", color: "#2d7a5f", fontWeight: "600" }}>
              Ambystoma mexicanum · Gestión UMA
            </span>
          </div>
          <span
            style={{
              fontSize: "52px",
              fontWeight: "700",
              color: "#0d0d0d",
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            El sistema operativo de tu refugio de ajolote
          </span>
          <span style={{ fontSize: "20px", color: "#555", lineHeight: 1.5 }}>
            Registros operativos · Trazabilidad genealógica · Reportes SEMARNAT
          </span>
        </div>

        {/* Bottom brand */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            right: "80px",
            fontSize: "15px",
            color: "#999",
          }}
        >
          axo.amoxtli.tech
        </div>
      </div>
    ),
    { ...size }
  )
}
