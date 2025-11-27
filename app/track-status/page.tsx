'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSearch, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Separate component that uses useSearchParams
function TrackStatusForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pre-fill from query parameter
    const idParam = searchParams.get('id')
    if (idParam) {
      setReportId(idParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reportId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a Report ID',
        variant: 'destructive',
      })
      return
    }

    const trimmedId = reportId.trim().toLowerCase()
    let fullReportId = trimmedId

    // Check if it's a short code (8 characters without dashes)
    if (trimmedId.length === 8 && !trimmedId.includes('-')) {
      // Try to find the full UUID from localStorage
      const storedMapping = localStorage.getItem(`report_${trimmedId.toUpperCase()}`)
      if (storedMapping) {
        fullReportId = storedMapping
      } else {
        // If not found in localStorage, show error
        toast({
          title: 'Report Not Found',
          description: 'Could not find a report with this short code. Please enter your full Report ID.',
          variant: 'destructive',
        })
        return
      }
    } else if (trimmedId.length === 36 && trimmedId.includes('-')) {
      // It's a full UUID, use it directly
      fullReportId = trimmedId
    } else {
      toast({
        title: 'Invalid Format',
        description: 'Please enter either an 8-character short code or the full Report ID',
        variant: 'destructive',
      })
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(fullReportId)) {
      toast({
        title: 'Invalid Report ID',
        description: 'The Report ID format is invalid. Please check and try again.',
        variant: 'destructive',
      })
      return
    }

    // Redirect to report detail page
    router.push(`/report/${fullReportId}`)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <FileSearch className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Track Report Status</CardTitle>
        <CardDescription>
          Enter your Report ID to view the current status and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reportId" className="text-sm font-medium">
              Report ID
            </label>
            <Input
              id="reportId"
              type="text"
              placeholder="Enter 8-character code or full Report ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="font-mono"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              You can use either the 8-character short code or the full Report ID you received when submitting your report.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Where to find your Report ID:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check the confirmation message after submitting your report</li>
                  <li>Look for an 8-character code (e.g., A1B2C3D4) or the full ID</li>
                  <li>The short code is easier to remember and share</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : 'Track Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Main page component with Suspense boundary
export default function TrackStatusPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Suspense fallback={
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <FileSearch className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Track Report Status</CardTitle>
              <CardDescription>
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        }>
          <TrackStatusForm />
        </Suspense>
      </div>
    </div>
  )
}

