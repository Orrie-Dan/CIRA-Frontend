'use client'

import { useState, useEffect } from 'react'
import { apiGetDetailedReport, apiAssignReport, apiAddComment, apiUpdateReportStatus, apiGetOrganizations, apiGetUsers, apiGetQcSlip, apiMe, type DetailedReport, type Organization, type User, type AssignReportPayload } from '@/lib/api'
import { QcSlipView } from '@/components/qc-slip-view'
import { QcSlipForm } from '@/components/qc-slip-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Calendar, MapPin, User as UserIcon, Building2, MessageSquare, Clock, CheckCircle2, XCircle, UserCheck, Send, X, FileText, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface ReportDetailViewProps {
  reportId: string
  onUpdate?: () => void
  onClose?: () => void
  userRole?: 'admin' | 'officer' | 'citizen'
}

// Helper function to format type display names
const getTypeDisplayName = (type: string): string => {
  const typeDisplayNames: Record<string, string> = {
    'pothole': 'Pothole',
    'streetlight': 'Streetlight',
    'sidewalk': 'Sidewalk',
    'drainage': 'Drainage',
    'other': 'Other',
    'roads': 'Roads',
    'bridges': 'Bridges',
    'water': 'Water',
    'power': 'Power',
    'sanitation': 'Sanitation',
    'telecom': 'Telecom',
    'public_building': 'Public Building',
  }
  return typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
}

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'new':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'triaged':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'assigned':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'in_progress':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    case 'resolved':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'rejected':
      return 'bg-red-600/10 text-red-500 border-red-600/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

// Helper function to get severity color
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'medium':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

export function ReportDetailView({ reportId, onUpdate, onClose, userRole = 'citizen' }: ReportDetailViewProps) {
  const [report, setReport] = useState<DetailedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assigning, setAssigning] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('details')

  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    assigneeId: '',
    organizationId: '',
    dueAt: '',
  })

  // Comment form state
  const [commentBody, setCommentBody] = useState('')

  // Status update form state
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    note: '',
  })

  // QC Slip state
  const [showQcSlipForm, setShowQcSlipForm] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  useEffect(() => {
    fetchReport()
    fetchOrganizations()
    fetchUsers()
    fetchCurrentUser()
  }, [reportId])

  const fetchCurrentUser = async () => {
    try {
      const { user } = await apiMe()
      setCurrentUserId(user.id)
    } catch (error) {
      // Not authenticated, that's okay
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const data = await apiGetDetailedReport(reportId)
      setReport(data)
      setStatusUpdate({ status: data.status, note: '' })
    } catch (error) {
      console.error('Failed to fetch report:', error)
      toast({
        title: 'Error',
        description: 'Failed to load report details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await apiGetOrganizations()
      setOrganizations(response.data)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await apiGetUsers('officer')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleAssign = async () => {
    // Check if at least one is selected (not empty string)
    const hasAssignee = assignmentData.assigneeId && assignmentData.assigneeId.trim() !== ''
    const hasOrganization = assignmentData.organizationId && assignmentData.organizationId.trim() !== ''
    
    if (!hasAssignee && !hasOrganization) {
      toast({
        title: 'Validation Error',
        description: 'Please select either an officer or organization',
        variant: 'destructive',
      })
      return
    }

    setAssigning(true)
    try {
      const payload: AssignReportPayload = {}
      
      if (hasAssignee) {
        payload.assigneeId = assignmentData.assigneeId
      }
      
      if (hasOrganization) {
        payload.organizationId = assignmentData.organizationId
      }
      
      if (assignmentData.dueAt && assignmentData.dueAt.trim() !== '') {
        // Convert datetime-local format to ISO string
        // datetime-local gives us "YYYY-MM-DDTHH:mm" format
        // We need to convert it to ISO datetime string
        const dateValue = new Date(assignmentData.dueAt)
        if (!isNaN(dateValue.getTime())) {
          payload.dueAt = dateValue.toISOString()
        }
      }

      console.log('Assigning report with payload:', payload)
      
      await apiAssignReport(reportId, payload)
      
      toast({
        title: 'Success',
        description: 'Report assigned successfully',
      })
      
      // Reset form
      setAssignmentData({ assigneeId: '', organizationId: '', dueAt: '' })
      
      // Refresh report data
      await fetchReport()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to assign report:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign report',
        variant: 'destructive',
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentBody.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a comment',
        variant: 'destructive',
      })
      return
    }

    setCommenting(true)
    try {
      await apiAddComment(reportId, { body: commentBody })
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      })
      setCommentBody('')
      fetchReport()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      })
    } finally {
      setCommenting(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!statusUpdate.status) {
      toast({
        title: 'Validation Error',
        description: 'Please select a status',
        variant: 'destructive',
      })
      return
    }

    setUpdatingStatus(true)
    try {
      await apiUpdateReportStatus(reportId, {
        status: statusUpdate.status as any,
        note: statusUpdate.note || undefined,
      })
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      })
      setStatusUpdate({ status: statusUpdate.status, note: '' })
      fetchReport()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500"></div>
          <p className="text-slate-400">Loading report details...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400" />
          <p className="text-slate-400">Report not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 bg-slate-950">
      {/* Enhanced Header Section */}
      <div className="relative border-b border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 backdrop-blur-sm px-4 md:px-6 py-5 md:py-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex-shrink-0 shadow-lg">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h1 className="text-xl md:text-3xl font-bold text-white leading-tight">{report.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-300 font-medium">{getTypeDisplayName(report.type)}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(report.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${getStatusColor(report.status)} border px-3 py-1 text-xs font-semibold shadow-sm`}>
                {report.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={`${getSeverityColor(report.severity)} border px-3 py-1 text-xs font-semibold shadow-sm`}>
                {report.severity.toUpperCase()} SEVERITY
              </Badge>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white flex-shrink-0 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Add Comment Button - Always visible, especially important on mobile */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab('comments')
              // Scroll to comment form after tab switch
              setTimeout(() => {
                const commentTextarea = document.querySelector('textarea[placeholder*="comment"]') as HTMLElement
                commentTextarea?.focus()
                commentTextarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 100)
            }}
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Comment</span>
            <span className="sm:hidden">Comment</span>
          </Button>
          {report.status === 'new' && (
            <Button
              size="sm"
              disabled={updatingStatus}
              onClick={async () => {
                setUpdatingStatus(true)
                try {
                  await apiUpdateReportStatus(reportId, { status: 'triaged', note: 'Report triaged' })
                  toast({
                    title: 'Success',
                    description: 'Report marked as triaged',
                  })
                  fetchReport()
                  onUpdate?.()
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to update status',
                    variant: 'destructive',
                  })
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {updatingStatus ? 'Updating...' : 'Mark as Triaged'}
            </Button>
          )}
          {(report.status === 'new' || report.status === 'triaged') && userRole === 'admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveTab('assign')
                // Auto-focus on assignee field if available
                setTimeout(() => {
                  const assigneeSelect = document.querySelector('[data-assignee-select]') as HTMLElement
                  assigneeSelect?.focus()
                }, 100)
              }}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500"
            >
              <Send className="h-4 w-4 mr-2" />
              Quick Assign
            </Button>
          )}
          {report.status !== 'resolved' && report.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              disabled={updatingStatus}
              onClick={async () => {
                setUpdatingStatus(true)
                try {
                  await apiUpdateReportStatus(reportId, { status: 'resolved', note: 'Report resolved' })
                  toast({
                    title: 'Success',
                    description: 'Report marked as resolved',
                  })
                  fetchReport()
                  onUpdate?.()
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to update status',
                    variant: 'destructive',
                  })
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {updatingStatus ? 'Updating...' : 'Mark as Resolved'}
            </Button>
          )}
          {userRole === 'admin' && (report.status === 'assigned' || report.status === 'in_progress') ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('assign')}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Assign Job
            </Button>
          ) : userRole !== 'admin' && report.status === 'assigned' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={updatingStatus}
              onClick={async () => {
                setUpdatingStatus(true)
                try {
                  await apiUpdateReportStatus(reportId, { status: 'in_progress', note: 'Work started on report' })
                  toast({
                    title: 'Success',
                    description: 'Status updated to in progress',
                  })
                  fetchReport()
                  onUpdate?.()
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to update status',
                    variant: 'destructive',
                  })
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4 mr-2" />
              {updatingStatus ? 'Updating...' : 'Start Work'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 md:px-6 pt-3 md:pt-4 border-b border-slate-800 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <TabsList className="bg-slate-800/50 border border-slate-700/50 w-full md:w-auto min-w-max">
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
              >
                Details
              </TabsTrigger>
              {userRole === 'admin' && (
                <TabsTrigger 
                  value="assign"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
                >
                  Assign
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="status"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
              >
                Status
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
              >
                Comments
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
              >
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <div className="p-4 md:p-6 space-y-6">
              <TabsContent value="details" className="space-y-6 mt-0">
                {/* Description Card */}
                <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="pb-3 border-b border-slate-700/50">
                    <CardTitle className="text-white text-lg font-semibold flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-700/30">
                      <p className="text-slate-200 leading-relaxed text-sm md:text-base">{report.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Location Card */}
                  <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-xl backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b border-slate-700/50">
                      <CardTitle className="text-white text-base font-semibold flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <MapPin className="h-4 w-4 text-blue-400" />
                        </div>
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="text-slate-200 text-sm font-medium leading-relaxed">
                          {report.addressText || `${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}`}
                        </p>
                        {report.province && (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/30">
                            <MapPin className="h-3.5 w-3.5 text-blue-400" />
                            <p className="text-xs text-blue-400 font-medium">
                              {[report.province, report.district, report.sector].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Created Date Card */}
                  <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-xl backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b border-slate-700/50">
                      <CardTitle className="text-white text-base font-semibold flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <Calendar className="h-4 w-4 text-purple-400" />
                        </div>
                        Created
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-1">
                        <p className="text-slate-200 text-sm font-semibold">
                          {format(new Date(report.createdAt), 'PPP')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(report.createdAt), 'p')}
                        </p>
                        <p className="text-xs text-slate-500 pt-1">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reporter & Assignment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Reporter Card */}
                  {report.reporter && (
                    <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-xl backdrop-blur-sm">
                      <CardHeader className="pb-3 border-b border-slate-700/50">
                        <CardTitle className="text-white text-base font-semibold flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <UserIcon className="h-4 w-4 text-green-400" />
                          </div>
                          Reporter
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-slate-200 text-sm font-medium">
                              {report.reporter.fullName || report.reporter.email}
                            </p>
                            {report.reporter.email && report.reporter.fullName && (
                              <p className="text-xs text-slate-400 mt-0.5">{report.reporter.email}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Current Assignment Card */}
                  {report.currentAssignment && (
                    <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-xl backdrop-blur-sm">
                      <CardHeader className="pb-3 border-b border-slate-700/50">
                        <CardTitle className="text-white text-base font-semibold flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <UserCheck className="h-4 w-4 text-orange-400" />
                          </div>
                          Assignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {report.currentAssignment.assignee && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30">
                            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <UserIcon className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-medium">Assigned Officer</p>
                              <p className="text-sm text-slate-200 font-semibold truncate">
                                {report.currentAssignment.assignee.fullName || report.currentAssignment.assignee.email}
                              </p>
                            </div>
                          </div>
                        )}
                        {report.currentAssignment.organization && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30">
                            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <Building2 className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-medium">Organization</p>
                              <p className="text-sm text-slate-200 font-semibold truncate">
                                {report.currentAssignment.organization.name}
                              </p>
                            </div>
                          </div>
                        )}
                        {report.currentAssignment.dueAt && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30">
                            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <Clock className="h-4 w-4 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-medium">Due Date</p>
                              <p className="text-sm text-slate-200 font-semibold">
                                {format(new Date(report.currentAssignment.dueAt), 'PPP')}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Photos Gallery */}
                {report.photos.length > 0 && (
                  <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-xl backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b border-slate-700/50">
                      <CardTitle className="text-white text-base font-semibold flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                          <ImageIcon className="h-4 w-4 text-pink-400" />
                        </div>
                        Photos
                        <Badge variant="outline" className="ml-2 border-slate-600 text-slate-300">
                          {report.photos.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {report.photos.map((photo) => {
                          const photoUrl = photo.url.startsWith('http') 
                            ? photo.url 
                            : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'}${photo.url}`
                          return (
                            <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 hover:border-slate-600/50 transition-all cursor-pointer">
                              <div className="aspect-square overflow-hidden">
                                <img
                                  src={photoUrl}
                                  alt={photo.caption || 'Report photo'}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                              </div>
                              {photo.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
                                  <p className="text-xs text-white font-medium line-clamp-2">{photo.caption}</p>
                                </div>
                              )}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
                                  <ImageIcon className="h-3.5 w-3.5 text-white" />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {userRole === 'admin' && (
                <TabsContent value="assign" className="space-y-6 mt-0">
                  <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                    <CardHeader className="pb-4 border-b border-slate-700/50">
                      <CardTitle className="text-white text-base md:text-lg flex items-center gap-2">
                        <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                        Assign Report
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-2">Assign this report to an officer or organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-orange-400" />
                        Assign to Officer
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={assignmentData.assigneeId || undefined}
                          onValueChange={(value) => {
                            setAssignmentData((prev) => ({ 
                              ...prev, 
                              assigneeId: value,
                              organizationId: value ? '' : prev.organizationId // Clear org only if assignee is selected
                            }))
                          }}
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white flex-1 h-11" data-assignee-select>
                            <SelectValue placeholder="Select an officer" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.length === 0 ? (
                              <SelectItem value="__none__" disabled>No officers available</SelectItem>
                            ) : (
                              users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.fullName || user.email}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {assignmentData.assigneeId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAssignmentData((prev) => ({ ...prev, assigneeId: '' }))
                            }}
                            className="h-11 w-11 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full border-slate-700/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-900 px-3 py-1 text-slate-400 rounded-full border border-slate-700/50">Or</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-400" />
                        Assign to Organization
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={assignmentData.organizationId || undefined}
                          onValueChange={(value) => {
                            setAssignmentData((prev) => ({ 
                              ...prev, 
                              organizationId: value,
                              assigneeId: value ? '' : prev.assigneeId // Clear assignee only if org is selected
                            }))
                          }}
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white flex-1 h-11">
                            <SelectValue placeholder="Select an organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.length === 0 ? (
                              <SelectItem value="__none__" disabled>No organizations available</SelectItem>
                            ) : (
                              organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {assignmentData.organizationId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAssignmentData((prev) => ({ ...prev, organizationId: '' }))
                            }}
                            className="h-11 w-11 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-400" />
                        Due Date (Optional)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={assignmentData.dueAt}
                        onChange={(e) => setAssignmentData((prev) => ({ ...prev, dueAt: e.target.value }))}
                        className="bg-slate-900/50 border-slate-700/50 text-white h-11"
                      />
                    </div>

                    <Button 
                      onClick={handleAssign} 
                      disabled={
                        assigning || 
                        (!assignmentData.assigneeId?.trim() && !assignmentData.organizationId?.trim())
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assigning ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Assigning...
                        </>
                      ) : (
                        'Assign Report'
                      )}
                    </Button>
                  </CardContent>
                </Card>
                </TabsContent>
              )}

              <TabsContent value="status" className="space-y-6 mt-0">
                <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="pb-4 border-b border-slate-700/50">
                    <CardTitle className="text-white text-base md:text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                      Update Status
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">Change the status of this report</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-purple-400" />
                        New Status
                      </Label>
                      <Select
                        value={statusUpdate.status}
                        onValueChange={(value) => setStatusUpdate((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white h-11">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-400" />
                        Note (Optional)
                      </Label>
                      <Textarea
                        placeholder="Add a note about this status change..."
                        value={statusUpdate.note}
                        onChange={(e) => setStatusUpdate((prev) => ({ ...prev, note: e.target.value }))}
                        rows={3}
                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <Button 
                      onClick={handleUpdateStatus}
                      disabled={updatingStatus || !statusUpdate.status}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="space-y-6 mt-0">
                <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="pb-4 border-b border-slate-700/50">
                    <CardTitle className="text-white text-base md:text-lg flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                      Comments
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">Add comments and communicate about this report</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        Add Comment
                      </Label>
                      <Textarea
                        placeholder="Type your comment here..."
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        rows={3}
                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500"
                      />
                      <Button 
                        onClick={handleAddComment} 
                        disabled={commenting || !commentBody.trim()} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {commenting ? 'Adding...' : 'Add Comment'}
                      </Button>
                    </div>

                    <Separator className="bg-slate-700/50" />

                    <div className="space-y-4">
                      {report.comments.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">No comments yet</p>
                        </div>
                      ) : (
                        report.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:bg-slate-900/70 transition-colors">
                            <Avatar className="h-10 w-10 border border-slate-700/50">
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                                {comment.author?.fullName?.[0] || comment.author?.email?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-white">
                                  {comment.author?.fullName || comment.author?.email || 'Anonymous'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-slate-200 leading-relaxed">{comment.body}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qc-slip" className="space-y-6 mt-0">
                {showQcSlipForm ? (
                  <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Create QC Slip</CardTitle>
                      <CardDescription>Document the completed work for this report</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QcSlipForm
                        reportId={reportId}
                        onSuccess={() => {
                          setShowQcSlipForm(false)
                          fetchReport()
                          onUpdate?.()
                        }}
                        onCancel={() => setShowQcSlipForm(false)}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {userRole === 'officer' && report.status === 'resolved' && (
                      <div className="mb-4">
                        <Button onClick={() => setShowQcSlipForm(true)}>
                          Create QC Slip
                        </Button>
                      </div>
                    )}
                    <QcSlipView
                      reportId={reportId}
                      userRole={userRole}
                      reporterId={report.reporterId || undefined}
                      currentUserId={currentUserId}
                      onUpdate={() => {
                        fetchReport()
                        onUpdate?.()
                      }}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-6 mt-0">
                <Card className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="pb-4 border-b border-slate-700/50">
                    <CardTitle className="text-white text-base md:text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                      Status History
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">Track all status changes for this report</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {report.statusHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">No status history</p>
                        </div>
                      ) : (
                        report.statusHistory.map((history, index) => (
                          <div key={history.id} className="flex gap-4 relative p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:bg-slate-900/70 transition-colors">
                            <div className="flex flex-col items-center">
                              <div className={`rounded-full p-2.5 ${
                                history.toStatus === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                history.toStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {history.toStatus === 'resolved' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : history.toStatus === 'rejected' ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </div>
                              {index < report.statusHistory.length - 1 && (
                                <div className="w-0.5 h-full bg-slate-700/50 mt-2" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${getStatusColor(history.toStatus)} border px-2 py-0.5 text-xs`}>
                                  {history.toStatus.replace('_', ' ').toUpperCase()}
                                </Badge>
                                {history.fromStatus && (
                                  <span className="text-xs text-slate-400">
                                    from {history.fromStatus}
                                  </span>
                                )}
                              </div>
                              {history.note && (
                                <p className="text-sm text-slate-300 leading-relaxed">{history.note}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                {format(new Date(history.createdAt), 'PPP p')}
                                {history.changedBy && (
                                  <>
                                    <span>•</span>
                                    <span>by {history.changedBy.fullName || history.changedBy.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Floating Action Button for Mobile - Add Comment */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          size="lg"
          onClick={() => {
            setActiveTab('comments')
            // Scroll to comment form after tab switch
            setTimeout(() => {
              const commentTextarea = document.querySelector('textarea[placeholder*="comment"]') as HTMLElement
              commentTextarea?.focus()
              commentTextarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 100)
          }}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/50 flex items-center justify-center p-0"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
