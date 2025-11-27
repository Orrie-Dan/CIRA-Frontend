/**
 * Reverse geocoding utility to get address components from coordinates
 * Uses OpenStreetMap Nominatim API for reverse geocoding
 */

export interface GeocodingResult {
  province?: string
  district?: string
  sector?: string
  cell?: string
  village?: string
  addressText?: string
}

/**
 * Reverse geocode coordinates to get administrative boundaries
 * Uses the backend API proxy to avoid CORS issues with Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  try {
    // Use the backend API proxy endpoint to avoid CORS issues
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'
    const url = `${API_BASE}/geocoding/reverse?lat=${lat}&lon=${lng}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Reverse geocoding failed:', response.status, response.statusText)
      return {}
    }

    const data = await response.json()
    
    // Log the result for debugging
    console.log('Geocoding result:', data)
    
    return {
      addressText: data.addressText,
      province: data.province,
      district: data.district,
      sector: data.sector,
      cell: data.cell,
      village: data.village,
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return {}
  }
}

/**
 * Rwanda-specific reverse geocoding helper
 * Since Nominatim may not have perfect Rwanda admin boundaries,
 * this is a placeholder for a Rwanda-specific geocoding service
 */
export async function reverseGeocodeRwanda(lat: number, lng: number): Promise<GeocodingResult> {
  // TODO: Implement Rwanda-specific geocoding if available
  // For now, fall back to Nominatim
  return reverseGeocode(lat, lng)
}

/**
 * Get sectors by district name
 * Returns list of sectors for a given district in Rwanda
 */
export async function getSectorsByDistrict(district: string): Promise<{ sectors: string[]; count: number; district: string }> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'
    const url = `${API_BASE}/geocoding/sectors?district=${encodeURIComponent(district)}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Failed to fetch sectors:', response.status, response.statusText)
      return { sectors: [], count: 0, district }
    }

    const data = await response.json()
    return {
      sectors: data.sectors || [],
      count: data.count || 0,
      district: data.district || district,
    }
  } catch (error) {
    console.error('Error fetching sectors:', error)
    return { sectors: [], count: 0, district }
  }
}

