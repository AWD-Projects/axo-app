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

export default function LandingPage() {
  return (
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
  )
}
