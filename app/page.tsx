import { Hero } from "@/components/hero"
import { Navigation } from "@/components/navigation"
import { MapSection } from "@/components/map-section"
import { HowToUse } from "@/components/how-to-use"
import { ImpactStats } from "@/components/impact-stats"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Navigation />
      <MapSection />
      <HowToUse />
      <ImpactStats />
      <Footer />
    </main>
  )
}
