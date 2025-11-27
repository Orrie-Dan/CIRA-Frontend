"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import type { Map as LeafletMap } from "leaflet"

interface MarkerClusterProps {
  markers: Array<{ id: string; position: [number, number] }>
}

// Simple marker clustering component
export function MarkerCluster({ markers }: MarkerClusterProps) {
  const map = useMap()

  useEffect(() => {
    if (typeof window === "undefined" || markers.length === 0) return

    // Only cluster if we have many markers (performance optimization)
    if (markers.length < 50) return

    // Simple clustering: group nearby markers
    // For production, consider using leaflet.markercluster plugin
    const clusters = new Map<string, typeof markers>()
    
    markers.forEach((marker) => {
      const clusterKey = `${Math.floor(marker.position[0] * 10) / 10},${Math.floor(marker.position[1] * 10) / 10}`
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, [])
      }
      clusters.get(clusterKey)!.push(marker)
    })

    // You can add visual cluster indicators here
    console.log(`Clustered ${markers.length} markers into ${clusters.size} clusters`)
  }, [map, markers])

  return null
}










