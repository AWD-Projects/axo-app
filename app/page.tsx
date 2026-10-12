import type { Metadata } from "next"
import { Navbar } from "./(landing)/components/Navbar"
import { Hero } from "./(landing)/components/Hero"
import { Cambio } from "./(landing)/components/Cambio"
import { Bitacora } from "./(landing)/components/Bitacora"
import { AISection } from "./(landing)/components/AISection"
import { Audience } from "./(landing)/components/Audience"
import { Pricing, PLANES } from "./(landing)/components/Pricing"
import { CTA } from "./(landing)/components/CTA"
import { Footer } from "./(landing)/components/Footer"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://axo.amoxtli.tech"

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Axo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      inLanguage: "es-MX",
      description:
        "Sistema de gestión operativa para refugios de Ambystoma mexicanum (ajolote) en cautiverio. Bitácora diaria, trazabilidad genealógica con coeficiente de endogamia y reportes de UMA.",
      offers: PLANES.map((p) => ({
        "@type": "Offer",
        name: p.nombre,
        priceCurrency: "MXN",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: p.precio,
          priceCurrency: "MXN",
          billingDuration: 1,
          unitCode: "MON",
        },
      })),
      publisher: { "@id": `${BASE_URL}/#amoxtli` },
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#amoxtli`,
      name: "AMOXTLI",
      url: "https://amoxtli.tech",
    },
    {
      "@type": "WebSite",
      name: "Axo",
      url: BASE_URL,
      inLanguage: "es-MX",
    },
  ],
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-bg-card focus:px-4 focus:py-2 focus:text-[13px] focus:text-text-primary focus:ring-2 focus:ring-accent"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="min-h-screen bg-bg-app">
        <Hero />
        <Cambio />
        <Bitacora />
        <AISection />
        <Audience />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
