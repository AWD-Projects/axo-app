import type { Metadata } from "next"
import { DM_Sans, DM_Mono } from "next/font/google"
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

export const metadata: Metadata = {
  title: "Axo — El sistema operativo de tu refugio de ajolote",
  description:
    "La plataforma técnica diseñada para la preservación científica. Automatice sus bitácoras de la UMA, controle el coeficiente de endogamia y gestione la salud de su colonia.",
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
      </body>
    </html>
  )
}
