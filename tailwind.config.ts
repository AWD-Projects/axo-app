import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        // Fondos
        "bg-app":    "#f9f9f7",
        "bg-card":   "#ffffff",
        "bg-subtle": "#f3f2ef",
        border:      "#e5e2dc",
        "border-sub":"#edeae4",
        // Textos
        "text-primary":   "#0d0d0d",
        "text-secondary": "#3c3a36",
        "text-disabled":  "#9a958f",
        // Acento
        accent:        "#1a6560",
        "accent-bg":   "#e2f0ee",
        "accent-hover":"#144f4b",
        "accent-text": "#f9f9f7",
        // Sistema
        success:        "#15803d",
        "success-bg":   "#f0fdf4",
        warning:        "#92400e",
        "warning-bg":   "#fffbeb",
        error:          "#991b1b",
        "error-bg":     "#fef2f2",
        info:           "#1e3a8a",
        "info-bg":      "#eff6ff",
        // shadcn compat
        background: "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT: "#1a6560",
          foreground: "#f9f9f7",
        },
        muted: {
          DEFAULT: "#f3f2ef",
          foreground: "#9a958f",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0d0d0d",
        },
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        float: "0 4px 16px rgba(13,13,13,0.06), 0 1px 4px rgba(13,13,13,0.04)",
        modal: "0 8px 32px rgba(13,13,13,0.12)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      fontSize: {
        display: ["40px", { lineHeight: "1.15", fontWeight: "500" }],
        h1:      ["28px", { lineHeight: "1.15", fontWeight: "500" }],
        h2:      ["20px", { lineHeight: "1.15", fontWeight: "500" }],
        h3:      ["15px", { lineHeight: "1.3",  fontWeight: "500" }],
        "body-l":["14px", { lineHeight: "1.6",  fontWeight: "400" }],
        body:    ["13px", { lineHeight: "1.6",  fontWeight: "400" }],
        label:   ["12px", { lineHeight: "1.3",  fontWeight: "500" }],
        small:   ["11px", { lineHeight: "1.4",  fontWeight: "400" }],
        micro:   ["10px", { lineHeight: "1.3",  fontWeight: "500" }],
      },
      maxWidth: {
        inner: "1200px",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
