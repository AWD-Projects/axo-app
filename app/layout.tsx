import type { Metadata } from "next"
import { DM_Sans, DM_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-mono",
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://axo.amoxtli.tech"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Axo — El sistema operativo de tu refugio de ajolote",
    template: "%s | Axo",
  },
  description:
    "La plataforma técnica diseñada para la preservación científica del Ambystoma mexicanum. Automatice bitácoras de la UMA, controle el coeficiente de endogamia y gestione la salud de su colonia.",
  keywords: [
    "refugio ajolote",
    "Ambystoma mexicanum",
    "gestión UMA",
    "SEMARNAT",
    "ajolote cautiverio",
    "bitácora UMA",
    "gestión colonia ajolote",
    "trazabilidad genealógica",
    "conservación axolote",
    "reportes SEMARNAT",
    "amoxtli",
    "axo app",
  ],
  authors: [{ name: "Amoxtli", url: BASE_URL }],
  creator: "Amoxtli",
  publisher: "Amoxtli",
  alternates: {
    canonical: BASE_URL,
    languages: { "es-MX": BASE_URL },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: BASE_URL,
    siteName: "Axo",
    title: "Axo — El sistema operativo de tu refugio de ajolote",
    description:
      "La plataforma técnica diseñada para la preservación científica del Ambystoma mexicanum. Registros operativos, trazabilidad genealógica y reportes regulatorios automatizados.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Axo — Gestión de refugios de ajolote",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axo — El sistema operativo de tu refugio de ajolote",
    description:
      "La plataforma técnica diseñada para la preservación científica del Ambystoma mexicanum.",
    images: ["/opengraph-image"],
    creator: "@amoxtlitech",
    site: "@amoxtlitech",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="font-sans antialiased bg-bg-app text-text-primary">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
              fontSize: "13px",
              background: "#ffffff",
              color: "#0d0d0d",
              border: "0.5px solid #e5e2dc",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(13,13,13,0.06), 0 1px 4px rgba(13,13,13,0.04)",
            },
          }}
        />
      </body>
    </html>
  )
}
