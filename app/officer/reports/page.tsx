'use client'

import { useState, useEffect } from 'react'
import { apiGetAdminReports, apiMe, type AdminReport } from '@/lib/api'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ReportDetailView } from '@/components/report-detail-view'
import { FileText, RefreshCw, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'

function getTypeDisplayName(type: string): string {
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

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'new': return 'default'
    case 'triaged': return 'secondary'
    case 'assigned': return 'outline'
    case 'in_progress': return 'default'
    case 'resolved': return 'default'
    case 'rejected': return 'destructive'
    default: return 'default'
  }
}

function getSeverityBadgeClassName(severity: string) {
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

function getStatusBadgeClassName(status: string) {
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

export default function OfficerReportsPage() {
  const [currentOfficerId, setCurrentOfficerId] = useState<string>('')
  const [currentOfficerName, setCurrentOfficerName] = useState<string>('')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentOfficerId) {
      fetchReports()
    }
  }, [currentOfficerId])

  const fetchCurrentUser = async () => {
    try {
      const { user } = await apiMe()
      if (user.role === 'officer' || user.role === 'admin') {
        setCurrentOfficerId(user.id)
        setCurrentOfficerName(user.fullName || user.email)
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      // Only fetch if we have an officer ID, otherwise show empty
      if (!currentOfficerId) {
        setReports([])
        setLoading(false)
        return
      }

      // Filter by assigneeId - API will return reports assigned to this officer
      const response = await apiGetAdminReports({
        assigneeId: currentOfficerId,
        limit: 1000,
      })
      // Double-check: Filter to only show reports assigned to the current officer
      // This ensures we only show reports where the current assignment is to this officer
      const assignedReports = response.data.filter(
        r => r.currentAssignment?.assignee?.id === currentOfficerId
      )
      setReports(assignedReports)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reports'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = (report: AdminReport) => {
    setSelectedReport(report)
    setIsDetailOpen(true)
  }

  const handleReportUpdated = () => {
    fetchReports()
    setIsDetailOpen(false)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const filteredReports = reports.filter(report => {
    if (filterStatus && report.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!report.title.toLowerCase().includes(query) && 
          !report.description.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortColumn) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'severity':
        const severityOrder = { low: 1, medium: 2, high: 3 }
        aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0
        bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0
        break
      case 'createdAt':
      default:
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedReports.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedReports = sortedReports.slice(startIndex, startIndex + pageSize)

  const stats = {
    total: reports.length,
    new: reports.filter(r => r.status === 'new').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="officer" userName={currentOfficerName || "Officer"} userRole="officer" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  My Reports
                </h1>
                <p className="text-sm text-slate-400">View and manage reports assigned to you</p>
              </div>
            </div>
            <Button 
              onClick={fetchReports} 
              variant="outline" 
              size="sm" 
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {error && (
            <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 mb-6">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-slate-400 mt-1">Total Assigned</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-white">{stats.new}</div>
                <p className="text-xs text-slate-400 mt-1">New</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
                <p className="text-xs text-slate-400 mt-1">In Progress</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-white">{stats.resolved}</div>
                <p className="text-xs text-slate-400 mt-1">Resolved</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg">Reports ({filteredReports.length})</CardTitle>
                  <CardDescription className="text-slate-400">Reports assigned to you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 flex-wrap p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
                  />
                </div>
                <Select value={filterStatus || undefined} onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white hover:border-slate-600">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="triaged">Triaged</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-300">
                        <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-white">
                          Title
                          {sortColumn === 'title' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-500" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
                      <TableHead className="text-slate-300">
                        <button onClick={() => handleSort('severity')} className="flex items-center gap-1 hover:text-white">
                          Severity
                          {sortColumn === 'severity' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-500" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">
                        <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-white">
                          Status
                          {sortColumn === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-500" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">
                        <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-white">
                          Created
                          {sortColumn === 'createdAt' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-500" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : paginatedReports.length === 0 ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          No reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReports.map((report) => (
                        <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell className="font-medium text-white max-w-xs truncate">{report.title}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="border-slate-700 text-slate-300 whitespace-nowrap px-2 py-1 min-w-[80px] text-center inline-block">
                              {getTypeDisplayName(report.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getSeverityBadgeClassName(report.severity)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                              {report.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeClassName(report.status)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {format(new Date(report.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedReports.length)} of {sortedReports.length} reports
                    </span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[100px] h-8 bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-400">per page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="text-slate-400 hover:text-white"
                    >
                      First
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="text-slate-400 hover:text-white"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-400 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="text-slate-400 hover:text-white"
                    >
                      Next
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="text-slate-400 hover:text-white"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
          {selectedReport && (
            <ReportDetailView
              reportId={selectedReport.id}
              onUpdate={handleReportUpdated}
              onClose={() => setIsDetailOpen(false)}
              userRole="officer"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
