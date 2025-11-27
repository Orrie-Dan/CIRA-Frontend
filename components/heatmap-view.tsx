'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGetHeatmapData, type HeatmapDataPoint } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Loader2, Filter, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface HeatmapViewProps {
  center?: [number, number]
  zoom?: number
}

export function HeatmapView({ center = [-1.9441, 30.0619], zoom = 11 }: HeatmapViewProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (mapReady) {
      fetchHeatmapData()
    }
  }, [mapReady, filters])

  const fetchHeatmapData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filters.type && filters.type !== 'all') params.type = filters.type
      if (filters.status && filters.status !== 'all') params.status = filters.status
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      console.log('Fetching heatmap data with params:', params)
      const response = await apiGetHeatmapData(params)
      console.log('Heatmap response:', response)
      setHeatmapData(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch heatmap data:', error)
      setHeatmapData([])
      if (error.message?.includes('Unauthorized') || error.message?.includes('Not authenticated') || error.message?.includes('401')) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view the heatmap',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load heatmap data',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get color based on intensity
  const getColor = (intensity: number): string => {
    if (intensity < 0.2) return '#3b82f6' // blue
    if (intensity < 0.4) return '#06b6d4' // cyan
    if (intensity < 0.6) return '#10b981' // green
    if (intensity < 0.8) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Report Heatmap</CardTitle>
            <CardDescription className="text-slate-400">
              Visualize report density across locations
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchHeatmapData}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pothole">Pothole</SelectItem>
                <SelectItem value="streetlight">Streetlight</SelectItem>
                <SelectItem value="sidewalk">Sidewalk</SelectItem>
                <SelectItem value="drainage">Drainage</SelectItem>
                <SelectItem value="roads">Roads</SelectItem>
                <SelectItem value="bridges">Bridges</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="sanitation">Sanitation</SelectItem>
                <SelectItem value="telecom">Telecom</SelectItem>
                <SelectItem value="public_building">Public Building</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triaged">Triaged</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Start Date</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">End Date</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[600px] rounded-lg overflow-hidden border border-slate-700">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-[1000]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-slate-300">Loading heatmap data...</p>
              </div>
            </div>
          )}

          {typeof window !== 'undefined' && (
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
              whenReady={() => setMapReady(true)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {heatmapData.map((point, index) => (
                <CircleMarker
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={Math.max(5, Math.min(30, point.count * 2))}
                  pathOptions={{
                    fillColor: getColor(point.intensity),
                    color: getColor(point.intensity),
                    fillOpacity: 0.6,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Reports: {point.count}</strong>
                      <br />
                      <span className="text-xs text-gray-600">
                        Lat: {point.lat.toFixed(4)}, Lng: {point.lng.toFixed(4)}
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {heatmapData.length > 0 && (
          <div className="text-sm text-slate-400 text-center">
            Showing {heatmapData.length} heatmap points
          </div>
        )}
      </CardContent>
    </Card>
  )
}

