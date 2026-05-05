import type { Metadata } from "next"
import { Navbar } from "./(landing)/components/Navbar"
import { Hero } from "./(landing)/components/Hero"
import { LogosBar } from "./(landing)/components/LogosBar"
import { Features } from "./(landing)/components/Features"
import { Problem } from "./(landing)/components/Problem"
import { AISection } from "./(landing)/components/AISection"
import { CaseStudy } from "./(landing)/components/CaseStudy"
import { Audience } from "./(landing)/components/Audience"
import { Pricing } from "./(landing)/components/Pricing"
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
      description:
        "Sistema de gestión operativa para refugios de Ambystoma mexicanum (ajolote) en cautiverio. Automatiza bitácoras de UMA, trazabilidad genealógica y reportes SEMARNAT.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "MXN",
        description: "Plan gratuito disponible",
      },
      publisher: {
        "@type": "Organization",
        name: "Amoxtli",
        url: BASE_URL,
      },
    },
    {
      "@type": "Organization",
      name: "Amoxtli",
      url: BASE_URL,
      description: "Tecnología para la conservación del Ambystoma mexicanum.",
    },
    {
      "@type": "WebSite",
      name: "Axo",
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/auth/login`,
      },
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
      <main className="bg-bg-app min-h-screen">
        <Navbar />
        {/* Hero + LogosBar fill exactly 100vh */}
        <div className="h-screen pt-[68px] flex flex-col">
          <Hero />
          <LogosBar />
        </div>
        <Features />
        <Problem />
        <AISection />
        <CaseStudy />
        <Audience />
        <Pricing />
        <CTA />
        <Footer />
      </main>
    </>
  )
}
