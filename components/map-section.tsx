"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { MapPin, Eye } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReportForm, type ReportFormValues } from "@/components/report-form"
import type { Map as LeafletMap } from "leaflet"
import { toast } from "@/hooks/use-toast"
import { apiGetAllReports, apiCreateReport, apiUploadPhoto, type ApiReport } from "@/lib/api"

// Dynamically import Leaflet components with loading optimization
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[600px] bg-muted animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Dynamically import Leaflet CSS only on client
if (typeof window !== "undefined") {
  import("leaflet/dist/leaflet.css")
}

interface MapMarker {
  id: string
  position: [number, number]
  type: "destructive" | "accent" | "primary"
  title: string
  description: string
}

// Component to handle map clicks (client-side only)
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void
}) {
  if (typeof window === "undefined") return null
  
  const { useMapEvents } = require("react-leaflet")
  useMapEvents({
    click: (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// LocateControl component (client-side only)
function LocateControlComponent() {
  if (typeof window === "undefined") return null
  
  const { useMap } = require("react-leaflet")
  const map = useMap()
  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute top-4 right-4 z-[1000]"
      onClick={() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            map.flyTo([latitude, longitude], 15)
          },
          (err) => {
            toast({
              title: "Location unavailable",
              description: err.message || "Please allow location access.",
            })
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      }}
    >
      Locate me
    </Button>
  )
}

// Icon cache to avoid recreating icons
const iconCache = new Map<string, any>()

// Custom marker icon component (client-side only, memoized)
function createCustomIcon(color: string) {
  if (typeof window === "undefined") return null
  
  // Return cached icon if available
  if (iconCache.has(color)) {
    return iconCache.get(color)
  }
  
  const L = require("leaflet")
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div class="marker-dot" style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
  
  iconCache.set(color, icon)
  return icon
}

export function MapSection() {
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [reports, setReports] = useState<ApiReport[]>([])
  const [stats, setStats] = useState({ total: 0, resolved: 0, districts: 0 })
  const [loading, setLoading] = useState(true)
  const [showReportForm, setShowReportForm] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState<[number, number] | null>(null)
  const [leafletMap, setLeafletMap] = useState<LeafletMap | null>(null)

  const getMarkerColor = useCallback((type: string) => {
    switch (type) {
      case "destructive":
        return "#ef4444" // Red for high severity
      case "accent":
        return "#f59e0b" // Orange/amber for medium severity
      case "primary":
      default:
        return "#3b82f6" // Blue for low severity
    }
  }, [])

  // Memoize markers to avoid recreating on every render
  const memoizedMarkers = useMemo(() => {
    return markers.map((marker) => ({
      ...marker,
      icon: createCustomIcon(getMarkerColor(marker.type)),
    }))
  }, [markers, getMarkerColor])

  // Fetch real reports from API
  useEffect(() => {
    let cancelled = false
    
    async function fetchReports() {
      try {
        setLoading(true)
        const allReports = await apiGetAllReports()
        
        if (cancelled) return
        
        setReports(allReports)
        
        // Convert reports to markers (optimized)
        const reportMarkers: MapMarker[] = allReports
          .filter(r => r.latitude && r.longitude)
          .map((report) => ({
            id: report.id,
            position: [report.latitude, report.longitude] as [number, number],
            type: report.severity === 'high' ? 'destructive' : report.severity === 'medium' ? 'accent' : 'primary',
            title: report.title,
            description: report.description,
          }))
        setMarkers(reportMarkers)

        // Calculate stats
        const uniqueDistricts = new Set(
          allReports
            .map(r => r.district)
            .filter(Boolean)
        ).size

        setStats({
          total: allReports.length,
          resolved: allReports.filter(r => r.status === 'resolved').length,
          districts: uniqueDistricts,
        })
      } catch (error) {
        if (cancelled) return
        console.error('Failed to fetch reports:', error)
        toast({
          title: 'Error',
          description: 'Failed to load reports from the database.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchReports()
    
    return () => {
      cancelled = true
    }
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    setPendingLatLng([lat, lng])
    setShowReportForm(true)
  }

  const handleSubmitReport = async (values: ReportFormValues, photos: File[] = []) => {
    if (!pendingLatLng) return setShowReportForm(false)
    
    try {
      // Create report via API
      const report = await apiCreateReport({
        title: values.title,
        description: values.description,
        type: mapIssueTypeToDbType(values.issueType),
        severity: values.severity,
        latitude: pendingLatLng[0],
        longitude: pendingLatLng[1],
        province: values.province || undefined,
        district: values.district || undefined,
        sector: values.sector || undefined,
      })

      // Upload photos if any
      if (photos.length > 0) {
        for (const photo of photos) {
          try {
            await apiUploadPhoto(report.id, photo)
          } catch (error) {
            console.error('Failed to upload photo:', error)
          }
        }
      }

      // Add new marker to map
      const newMarker: MapMarker = {
        id: report.id,
        position: pendingLatLng,
        type: values.severity === "high" ? "destructive" : values.severity === "medium" ? "accent" : "primary",
        title: report.title,
        description: report.description,
      }
      setMarkers((prev) => [...prev, newMarker])
      setReports((prev) => [...prev, report])
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
      }))

      toast({
        title: 'Success',
        description: 'Report submitted successfully!',
      })

      setShowReportForm(false)
      setPendingLatLng(null)
    } catch (error: any) {
      console.error('Failed to submit report:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive',
      })
    }
  }

  // Helper function to map form issue type to DB type
  function mapIssueTypeToDbType(issueType: string): ApiReport['type'] {
    const mapping: Record<string, ApiReport['type']> = {
      'roads': 'roads',
      'bridges': 'bridges',
      'water': 'water',
      'power': 'power',
      'sanitation': 'sanitation',
      'telecom': 'telecom',
      'public_building': 'public_building',
      'pothole': 'pothole',
      'streetlight': 'streetlight',
      'sidewalk': 'sidewalk',
      'drainage': 'drainage',
      'other': 'other',
    }
    return mapping[issueType] || 'other'
  }


  // Default center (Kigali, Rwanda)
  const defaultCenter: [number, number] = [-1.95, 30.06]
  const defaultZoom = 12

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-[350px_1fr] gap-6">
          {/* Global locate-me listener */}
          {leafletMap ? (
            <Listener map={leafletMap} />
          ) : null}
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">How to use the map</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Click on the map</h4>
                    <p className="text-sm text-muted-foreground">
                      Tap where the infrastructure issue occurred to place a point.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Fill the form</h4>
                    <p className="text-sm text-muted-foreground">
                      Provide key details to help maintenance crews respond.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Submit your report</h4>
                    <p className="text-sm text-muted-foreground">We'll add it to the public map layer for tracking.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                At a glance
              </h3>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {loading ? '...' : stats.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Reports</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">
                    {loading ? '...' : stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Resolved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">
                    {loading ? '...' : stats.districts}
                  </div>
                  <div className="text-xs text-muted-foreground">Districts</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Map Area */}
          <Card className="relative overflow-hidden min-h-[600px]">
            {/* Report Button */}
            <div className="absolute bottom-4 right-4 z-10">
              <Button asChild size="lg" className="shadow-lg">
                <Link href="/report">
                  <MapPin className="h-5 w-5 mr-2" />
                  Report an Issue
                </Link>
              </Button>
            </div>

            {/* Interactive Map */}
            <div className="w-full h-full min-h-[600px] relative" style={{ zIndex: 0 }}>
              {typeof window !== "undefined" && (
                <MapContainer
                  center={defaultCenter}
                  zoom={defaultZoom}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                  scrollWheelZoom={true}
                  whenCreated={setLeafletMap}
                  preferCanvas={true}
                  zoomControl={true}
                  doubleClickZoom={true}
                  closePopupOnClick={true}
                  fadeAnimation={false}
                  zoomAnimation={true}
                >
                  <LocateControlComponent />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                    minZoom={2}
                    updateWhenZooming={false}
                    updateWhenIdle={true}
                    keepBuffer={2}
                    maxNativeZoom={18}
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {/* Only render markers that are visible or nearby */}
                  {memoizedMarkers.slice(0, 500).map((marker) => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      icon={marker.icon || undefined}
                      interactive={true}
                    >
                      <Popup maxWidth={200} className="custom-popup">
                        <div className="p-2">
                          <h4 className="font-semibold mb-1 text-sm">{marker.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{marker.description}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {memoizedMarkers.length > 500 && (
                    <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm shadow-lg z-[1000]">
                      Showing 500 of {memoizedMarkers.length} markers
                    </div>
                  )}
                </MapContainer>
              )}
            </div>

            {/* Instruction overlay */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-card border rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Click on the map to place a report location, then fill the form.
              </p>
            </div>
          </Card>

          {/* Report dialog */}
          <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
            <DialogContent className="max-h-[95vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Report an Issue</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <ReportForm
                  onSubmit={handleSubmitReport}
                  onCancel={() => setShowReportForm(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  )
}

function Listener({ map }: { map: LeafletMap }) {
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const handler = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          map.flyTo([latitude, longitude], 15)
        },
        () => {
          toast({ title: "Location unavailable", description: "Please allow location access." })
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
    window.addEventListener("cira:locate-me", handler as EventListener)
    return () => window.removeEventListener("cira:locate-me", handler as EventListener)
  }, [map])
  return null
}
