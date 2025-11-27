"use client"

import { Home, Info, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-primary text-primary-foreground border-b border-primary-foreground/20 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/Coat_of_Arms_Rwanda-01.png"
              alt="Rwanda Coat of Arms"
              className="w-10 h-10 rounded-full bg-white object-contain p-1"
            />
            <div>
              <h2 className="font-semibold text-sm leading-tight">Citizens Infrastructure Reporting</h2>
              
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="#about">
                <Info className="h-4 w-4 mr-2" />
                About
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" />
                Log in
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
