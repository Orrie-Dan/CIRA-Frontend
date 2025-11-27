"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGetQcSlip, apiApproveQcSlip, type QcSlip } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, Calendar, User, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface QcSlipViewProps {
  reportId: string
  userRole?: 'admin' | 'officer' | 'citizen'
  reporterId?: string
  currentUserId?: string
  onUpdate?: () => void
}

export function QcSlipView({ reportId, userRole = 'citizen', reporterId, currentUserId, onUpdate }: QcSlipViewProps) {
  const [qcSlip, setQcSlip] = useState<QcSlip | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    fetchQcSlip()
  }, [reportId])

  const fetchQcSlip = async () => {
    try {
      const { qcSlip: data } = await apiGetQcSlip(reportId)
      setQcSlip(data)
    } catch (error: any) {
      // QC slip might not exist yet, that's okay
      if (error.message?.includes('not found')) {
        setQcSlip(null)
      } else {
        console.error('Failed to fetch QC slip:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!qcSlip) return

    setApproving(true)
    try {
      await apiApproveQcSlip(qcSlip.id, approved)
      toast({
        title: 'Success',
        description: approved ? 'QC slip approved successfully' : 'QC slip rejected',
      })
      fetchQcSlip()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update QC slip',
        variant: 'destructive',
      })
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!qcSlip) {
    return null // No QC slip yet
  }

  const canApprove = userRole === 'citizen' && reporterId === currentUserId && !qcSlip.approvedBy

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quality Control Slip</CardTitle>
            <CardDescription>Work completion documentation</CardDescription>
          </div>
          <Badge variant={qcSlip.approved ? 'default' : qcSlip.approvedBy ? 'destructive' : 'secondary'}>
            {qcSlip.approved ? 'Approved' : qcSlip.approvedBy ? 'Rejected' : 'Pending Approval'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Officer Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Officer:</span>
          <span className="font-medium">{qcSlip.officer?.fullName || qcSlip.officer?.email || 'Unknown'}</span>
        </div>

        {/* Created Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Created:</span>
          <span>{format(new Date(qcSlip.createdAt), 'PPp')}</span>
        </div>

        {/* Work Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Work Summary</span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{qcSlip.workSummary}</p>
        </div>

        {/* Photos */}
        {qcSlip.photos && qcSlip.photos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Completion Photos ({qcSlip.photos.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {qcSlip.photos.map((photoUrl, index) => (
                <a
                  key={index}
                  href={photoUrl.startsWith('http') ? photoUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'}${photoUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <img
                    src={photoUrl.startsWith('http') ? photoUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'}${photoUrl}`}
                    alt={`Completion photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded border hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Approval Info */}
        {qcSlip.approvedBy && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {qcSlip.approved ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-muted-foreground">
                {qcSlip.approved ? 'Approved' : 'Rejected'} by:
              </span>
              <span className="font-medium">
                {qcSlip.approver?.fullName || qcSlip.approver?.email || 'Unknown'}
              </span>
            </div>
            {qcSlip.approvedAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(qcSlip.approvedAt), 'PPp')}
              </p>
            )}
          </div>
        )}

        {/* Approval Actions */}
        {canApprove && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleApprove(false)}
              disabled={approving}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleApprove(true)}
              disabled={approving}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


