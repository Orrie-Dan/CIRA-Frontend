"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, CheckCircle2, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { apiGetAllReports, type ApiReport } from "@/lib/api"

export function ImpactStats() {
  const [stats, setStats] = useState({ total: 0, resolved: 0, districts: 0, resolutionRate: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const allReports = await apiGetAllReports()
        
        const uniqueDistricts = new Set(
          allReports
            .map(r => r.district)
            .filter(Boolean)
        ).size

        const resolved = allReports.filter(r => r.status === 'resolved').length
        const resolutionRate = allReports.length > 0 
          ? Math.round((resolved / allReports.length) * 100) 
          : 0

        setStats({
          total: allReports.length,
          resolved,
          districts: uniqueDistricts,
          resolutionRate,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Impact</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Together, we're making our community safer and better maintained.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
              {loading ? '...' : `${stats.total}+`}
            </div>
            <div className="text-sm font-semibold mb-2">Cases reported</div>
            <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500" 
                style={{ width: loading ? '0%' : `${Math.min(stats.total / 10, 100)}%` }} 
              />
            </div>
          </Card>

          <Card className="p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-accent mb-2">
              {loading ? '...' : `${stats.resolutionRate}%`}
            </div>
            <div className="text-sm font-semibold mb-2">Resolution rate</div>
            <div className="w-full h-2 bg-accent/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-500" 
                style={{ width: loading ? '0%' : `${stats.resolutionRate}%` }} 
              />
            </div>
          </Card>

          <Card className="p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-secondary" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">
              {loading ? '...' : stats.districts}
            </div>
            <div className="text-sm font-semibold mb-2">Districts covered</div>
            <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-500" 
                style={{ width: loading ? '0%' : `${Math.min((stats.districts / 50) * 100, 100)}%` }} 
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
