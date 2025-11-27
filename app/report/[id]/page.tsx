'use client'

import { useParams, useRouter } from 'next/navigation'
import { ReportDetailView } from '@/components/report-detail-view'
import { useEffect, useState } from 'react'
import { apiMe } from '@/lib/api'

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const reportId = params?.id as string

  useEffect(() => {
    // Try to get current user
    apiMe()
      .then((response) => {
        setUser(response.user)
      })
      .catch(() => {
        // Not authenticated, that's okay
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (!reportId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Report ID is required</p>
        </div>
      </div>
    )
  }

  // Determine user role
  const userRole = user?.role === 'admin' ? 'admin' : user?.role === 'officer' ? 'officer' : 'citizen'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <ReportDetailView 
          reportId={reportId}
          userRole={userRole}
          onClose={() => router.back()}
        />
      </div>
    </div>
  )
}

