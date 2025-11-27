import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { reverseGeocode } from '../../lib/geocoding'

// Mock fetch for geocoding API calls
global.fetch = jest.fn()

describe('Geocoding Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('reverseGeocode', () => {
    it('should return address for valid coordinates', async () => {
      const mockResponse = {
        display_name: 'Kigali, Rwanda',
        address: {
          city: 'Kigali',
          country: 'Rwanda',
        },
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [mockResponse],
      })

      const result = await reverseGeocode(-1.9441, 30.0619)

      expect(result).toBeDefined()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org')
      )
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await reverseGeocode(-1.9441, 30.0619)

      expect(result).toEqual({})
    })

    it('should handle invalid coordinates', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      })

      const result = await reverseGeocode(999, 999)

      expect(result).toEqual({})
    })
  })
})




