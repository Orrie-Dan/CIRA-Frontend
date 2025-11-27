'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportDetailView } from '@/components/report-detail-view'
import { Search, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiGetReport } from '@/lib/api'

// Get API base URL (same pattern as lib/api.ts)
const getApiBase = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'
}

export default function TrackStatusPage() {
  const [reportId, setReportId] = useState('')
  const [searchId, setSearchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async () => {
    setError(null)
    const trimmedId = reportId.trim()
    
    if (!trimmedId) {
      setError('Please enter a report ID')
      return
    }

    // Validate UUID format (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const shortIdPattern = /^[0-9a-f]{8}$/i
    
    if (uuidPattern.test(trimmedId)) {
      // Full UUID provided - verify it exists
      setLoading(true)
      try {
        await apiGetReport(trimmedId)
        setSearchId(trimmedId)
      } catch (err: any) {
        setError(err.message || 'Report not found. Please check your report ID.')
      } finally {
        setLoading(false)
      }
    } else if (shortIdPattern.test(trimmedId)) {
      // Short ID provided - try to search by short ID
      setLoading(true)
      try {
        const API_BASE = getApiBase()
        const res = await fetch(`${API_BASE}/reports/search/${trimmedId}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: 'Report not found' } }))
          throw new Error(err.error?.message || 'Report not found')
        }
        const report = await res.json()
        setSearchId(report.id)
      } catch (err: any) {
        setError(err.message || 'Report not found. Please check your report ID.')
      } finally {
        setLoading(false)
      }
    } else {
      setError('Invalid report ID format. Please enter a valid report ID (8 characters or full UUID).')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Report Status</h1>
          <p className="text-muted-foreground">
            Enter your report ID to view the current status and updates
          </p>
        </div>

        {!searchId ? (
          <Card>
            <CardHeader>
              <CardTitle>Enter Report ID</CardTitle>
              <CardDescription>
                You can find your report ID in the confirmation message after submitting a report.
                You can enter either the short ID (8 characters like <code className="bg-muted px-1 rounded">a1b2c3d4</code>) or the full UUID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your report ID (e.g., a1b2c3d4 or full UUID)"
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={loading}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Don't have your report ID?</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Check your email confirmation (if you were logged in)</li>
                  <li>Look for the confirmation message after submitting your report</li>
                  <li>The report ID is shown in the success message (first 8 characters)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchId(null)
                setReportId('')
                setError(null)
              }}
            >
              ← Search Another Report
            </Button>
            <ReportDetailView 
              reportId={searchId}
              userRole="citizen"
              onClose={() => {
                setSearchId(null)
                setReportId('')
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

