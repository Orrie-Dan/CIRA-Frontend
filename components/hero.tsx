import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, FileSearch } from "lucide-react"

export function Hero() {
  return (
    <section
      className="relative text-primary-foreground overflow-hidden"
      style={{
        backgroundImage: "url('/Infrastructure.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Wave decoration at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-background"
        style={{
          clipPath: "ellipse(100% 100% at 50% 100%)",
          transform: "translateY(50%)",
        }}
      />

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Citizens Infrastructure Reporting Application
          </h1>
          <p className="text-lg md:text-xl mb-10 text-primary-foreground/90 text-pretty">
            Report infrastructure issues and view updates on an interactive map.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-background text-primary hover:bg-background/90 min-w-[200px]">
              <Link href="/report">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Report an Issue
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary min-w-[200px] bg-transparent"
            >
              <Link href="/track-status">
              <FileSearch className="mr-2 h-5 w-5" />
              Check Report Status
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
