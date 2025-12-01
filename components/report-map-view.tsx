"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReportForm, type ReportFormValues } from "@/components/report-form"
import type { Map as LeafletMap } from "leaflet"
import { toast } from "@/hooks/use-toast"
import { apiCreateReport, apiUploadPhoto, type ApiReport } from "@/lib/api"
import { reverseGeocode } from "@/lib/geocoding"

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

// Dynamically import Leaflet CSS only on client
if (typeof window !== "undefined") {
  import("leaflet/dist/leaflet.css")
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

// Default center (Kigali, Rwanda)
const defaultCenter: [number, number] = [-1.9441, 30.0619]
const defaultZoom = 13

export function ReportMapView() {
  const [showReportForm, setShowReportForm] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState<[number, number] | null>(null)
  const [geocodedData, setGeocodedData] = useState<Partial<ReportFormValues & { addressText?: string }> | null>(null)
  const [loadingGeocode, setLoadingGeocode] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<[number, number] | null>(null)
  const [leafletMap, setLeafletMap] = useState<LeafletMap | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMapClick = async (lat: number, lng: number) => {
    setPendingLatLng([lat, lng])
    setSelectedMarker([lat, lng])
    setLoadingGeocode(true)
    setGeocodedData(null)
    
    try {
      // Reverse geocode the clicked location
      const geocodeResult = await reverseGeocode(lat, lng)
      console.log('Geocoding result:', geocodeResult)
      
      // Use the full addressText from backend (like mobile does)
      const addressText = geocodeResult.addressText || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      
      setGeocodedData({
        province: geocodeResult.province || '',
        district: geocodeResult.district || '',
        sector: geocodeResult.sector || '',
        addressText: addressText,
      })
      
      // Show the form after geocoding completes
      setShowReportForm(true)
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      toast({
        title: 'Geocoding failed',
        description: 'Could not determine location details. You can still submit the report.',
        variant: 'destructive',
      })
      // Still show the form even if geocoding fails
      setShowReportForm(true)
    } finally {
      setLoadingGeocode(false)
    }
  }

  const handleSubmitReport = async (values: ReportFormValues, photos: File[] = []) => {
    if (!pendingLatLng) return setShowReportForm(false)
    
    setIsSubmitting(true)
    try {
      // Create report via API
      const report = await apiCreateReport({
        title: values.title,
        description: values.description,
        type: mapIssueTypeToDbType(values.issueType),
        severity: values.severity,
        latitude: pendingLatLng[0],
        longitude: pendingLatLng[1],
        addressText: geocodedData?.addressText || undefined,
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

      toast({
        title: 'Success',
        description: `Report submitted successfully! Your report ID is ${report.id.substring(0, 8).toUpperCase()}.`,
        duration: 5000,
      })

      setShowReportForm(false)
      setPendingLatLng(null)
      setSelectedMarker(null)
      setGeocodedData(null)
    } catch (error: any) {
      console.error('Failed to submit report:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
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

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Report an Issue</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            Close
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <Card className="relative overflow-hidden h-full w-full">
          {/* Instruction overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card border rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {loadingGeocode ? 'Getting location details...' : 'Click on the map to place a report location'}
            </p>
          </div>

          {/* Interactive Map */}
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
              
              {/* Selected location marker */}
              {selectedMarker && (
                <Marker position={selectedMarker} />
              )}
            </MapContainer>
          )}
        </Card>

        {/* Report dialog */}
        <Dialog open={showReportForm} onOpenChange={(open) => {
          if (!isSubmitting) {
            setShowReportForm(open)
            if (!open) {
              setPendingLatLng(null)
              setSelectedMarker(null)
              setGeocodedData(null)
            }
          }
        }}>
          <DialogContent className="max-h-[95vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Report an Issue</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <ReportForm
                onSubmit={handleSubmitReport}
                onCancel={() => {
                  if (!isSubmitting) {
                    setShowReportForm(false)
                    setPendingLatLng(null)
                    setSelectedMarker(null)
                    setGeocodedData(null)
                  }
                }}
                defaultValues={geocodedData || undefined}
                isSubmitting={isSubmitting}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}





