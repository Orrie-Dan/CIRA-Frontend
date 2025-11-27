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
import { 
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'

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

export default function OfficerDashboard() {
  const [currentOfficerId, setCurrentOfficerId] = useState<string>('')
  const [currentOfficerName, setCurrentOfficerName] = useState<string>('')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    severity: '',
  })
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentOfficerId) {
      fetchReports()
    }
  }, [filters, currentOfficerId])

  const fetchCurrentUser = async () => {
    try {
      const { user } = await apiMe()
      if (user.role === 'officer' || user.role === 'admin') {
        setCurrentOfficerId(user.id)
        setCurrentOfficerName(user.fullName || user.email)
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      // If not authenticated, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      // Only fetch if we have an officer ID, otherwise show empty
      if (!currentOfficerId) {
        setReports([])
        setLoading(false)
        return
      }

      const response = await apiGetAdminReports({
        ...filters,
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
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleViewReport = (report: AdminReport) => {
    setSelectedReport(report)
    setIsDetailOpen(true)
  }

  const handleReportUpdated = () => {
    fetchReports()
    setIsDetailOpen(false)
  }

  // Calculate statistics
  const stats = {
    assigned: reports.filter(r => r.status === 'assigned').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    urgent: reports.filter(r => r.severity === 'high' && r.status !== 'resolved').length,
  }

  // Reports by status
  const statusData = [
    { name: 'Assigned', value: reports.filter(r => r.status === 'assigned').length, color: '#f59e0b' },
    { name: 'In Progress', value: reports.filter(r => r.status === 'in_progress').length, color: '#10b981' },
    { name: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: '#06b6d4' },
  ].filter(item => item.value > 0)

  // Reports by type - dynamically count all unique types
  const typeData = (() => {
    const typeCounts = new Map<string, number>()
    
    reports.forEach(report => {
      const count = typeCounts.get(report.type) || 0
      typeCounts.set(report.type, count + 1)
    })
    
    // Map type values to display names
    const typeDisplayNames: Record<string, string> = {
      'pothole': 'Pothole',
      'streetlight': 'Streetlight',
      'sidewalk': 'Sidewalk',
      'drainage': 'Drainage',
      'other': 'Other',
      // Add any other types that might exist
      'roads': 'Roads',
      'bridges': 'Bridges',
      'water': 'Water',
      'power': 'Power',
      'sanitation': 'Sanitation',
      'telecom': 'Telecom',
      'public_building': 'Public Building',
    }
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        name: typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
        value: count,
      }))
      .sort((a, b) => b.value - a.value) // Sort by count descending
      .filter(item => item.value > 0)
  })()

  // Urgent reports
  const urgentReports = reports
    .filter(r => r.severity === 'high' && r.status !== 'resolved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Recent reports
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  const getStatusBadgeVariant = (status: string) => {
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

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getSeverityBadgeClassName = (severity: string) => {
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

  const getStatusBadgeClassName = (status: string) => {
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

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="officer" userName={currentOfficerName || "Officer"} userRole="officer" />
      
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Officer Dashboard</h1>
              <p className="text-sm text-slate-400">Your assigned reports and tasks</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={fetchReports} variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Assigned</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.assigned}</div>
                <p className="text-xs text-slate-400 mt-1">Reports assigned to you</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
                <p className="text-xs text-slate-400 mt-1">Currently working on</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.resolved}</div>
                <p className="text-xs text-slate-400 mt-1">Completed reports</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Urgent</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{stats.urgent}</div>
                <p className="text-xs text-slate-400 mt-1">High priority reports</p>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Reports and Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Urgent Reports */}
            {urgentReports.length > 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Urgent Reports</CardTitle>
                  <CardDescription className="text-slate-400">High priority reports requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {urgentReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 border border-slate-800 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => handleViewReport(report)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{report.title}</p>
                          <p className="text-sm text-slate-400">{report.type}</p>
                        </div>
                        <Badge variant="destructive">High</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reports by Status */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Reports by Status</CardTitle>
                <CardDescription className="text-slate-400">Distribution of your assigned reports</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Reports by Type and Recent Reports */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reports by Type */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white font-bold">Reports by Type</CardTitle>
                <CardDescription className="text-slate-400">Infrastructure issue categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsBarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradientOfficer" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tick={{ fill: '#9ca3af' }}
                      tickLine={{ stroke: '#4b5563' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#9ca3af" 
                      fontSize={12}
                      width={100}
                      tick={{ fill: '#e5e7eb' }}
                      tickLine={{ stroke: '#4b5563' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                      }}
                      labelStyle={{ color: '#e5e7eb', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#10b981', fontWeight: '600' }}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientOfficer)" 
                      radius={[0, 8, 8, 0]}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Reports Table */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">My Reports</CardTitle>
                <CardDescription className="text-slate-400">Your assigned reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-slate-800/50">
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Title</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow className="border-slate-800">
                          <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : recentReports.length === 0 ? (
                        <TableRow className="border-slate-800">
                          <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                            {currentOfficerId ? 'No reports assigned to you yet' : 'No officer ID found. Please set your officer ID to view assigned reports.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentReports.map((report) => (
                          <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className="border-slate-700 text-slate-300 whitespace-nowrap">
                                {getTypeDisplayName(report.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-white">{report.title}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusBadgeClassName(report.status)} border text-xs`}>
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
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
