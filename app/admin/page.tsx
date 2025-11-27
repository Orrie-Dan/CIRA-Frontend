'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { apiGetAdminReports, apiUpdateReportStatus, apiAssignReport, apiGetUsers, apiGetOrganizations, apiGetOfficerMetrics, apiAutoAssignReports, apiGetGeographicData, type AdminReport, type OfficerMetrics, type GeographicData } from '@/lib/api'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ReportDetailView } from '@/components/report-detail-view'
import { GaugeChart } from '@/components/gauge-chart'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  BarChart, 
  PieChart, 
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  MapPin,
  UserCheck,
  Send,
  CheckCircle,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  CheckSquare,
  Square,
  Settings,
  Save,
  Columns,
  Camera,
  MoreVertical
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
  Cell,
  Sector,
  LineChart,
  Line
} from 'recharts'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'

// Rwanda's 5 provinces (constant for all calculations)
const RWANDA_PROVINCES = [
  'Kigali City',
  'Eastern Province',
  'Northern Province',
  'Southern Province',
  'Western Province'
] as const
const TOTAL_RWANDA_PROVINCES = 5

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })

// Create custom icons based on severity - lazy load Leaflet only on client
let leafletLoaded = false
let L: any = null

async function loadLeaflet() {
  if (typeof window === 'undefined' || leafletLoaded) return L
  
  L = await import('leaflet')
  // @ts-ignore - CSS import doesn't have type declarations
  await import('leaflet/dist/leaflet.css')
  
  // Fix for default Leaflet icons when bundling
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
  
  leafletLoaded = true
  return L
}

function createSeverityIcon(severity: string) {
  if (typeof window === 'undefined') {
    // Return a placeholder during SSR
    return null as any
  }
  
  // Load Leaflet synchronously if not already loaded (for client-side)
  if (!L && typeof window !== 'undefined') {
    // This will be called during render, so we'll handle it in useEffect
    return null as any
  }
  
  if (!L) return null as any
  
  const color = severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f97316' : '#2563eb'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export default function AdminDashboard() {
  const [reports, setReports] = useState<AdminReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null)
  const [reportDetailKey, setReportDetailKey] = useState(0)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [filterProvince, setFilterProvince] = useState<string | null>(null)
  const [filterDistrict, setFilterDistrict] = useState<string | null>(null)
  const [filterSector, setFilterSector] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [sortColumn, setSortColumn] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(5)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assigningReport, setAssigningReport] = useState<AdminReport | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['title', 'type', 'severity', 'status', 'location', 'assignedTo', 'photos', 'createdAt', 'actions']))
  const [filterPresets, setFilterPresets] = useState<Array<{name: string, filters: any}>>([])
  const [searchReporter, setSearchReporter] = useState<string>('')
  const [searchAssignee, setSearchAssignee] = useState<string>('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showColumnToggle, setShowColumnToggle] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [geographicData, setGeographicData] = useState<GeographicData | null>(null)
  const [geographicLoading, setGeographicLoading] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [assignData, setAssignData] = useState({ assigneeId: '', organizationId: '', dueAt: '' })
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [officerMetrics, setOfficerMetrics] = useState<OfficerMetrics[]>([])
  const [officerMetricsLoading, setOfficerMetricsLoading] = useState(false)
  const [officerMetricsPage, setOfficerMetricsPage] = useState<number>(1)
  const [officerMetricsPageSize, setOfficerMetricsPageSize] = useState<number>(10)
  const [officerMetricsSort, setOfficerMetricsSort] = useState<'highest' | 'lowest'>('highest')
  const [statusPieActiveIndex, setStatusPieActiveIndex] = useState<number | undefined>(undefined)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const reportsTableRef = useRef<HTMLDivElement>(null)

  // Load Leaflet on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadLeaflet().then(() => {
        setMapReady(true)
      })
    }
  }, [])

  useEffect(() => {
    fetchReports()
    fetchUsersAndOrgs()
    fetchOfficerMetrics()
    fetchGeographicData()
  }, [])

  // Debug: Log users state changes
  useEffect(() => {
    console.log('Users state changed:', { count: users.length, users })
  }, [users])

  const fetchUsersAndOrgs = async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      console.log('Fetching users and organizations...')
      const [usersRes, orgsRes] = await Promise.all([
        apiGetUsers('officer'),
        apiGetOrganizations()
      ])
      console.log('Users response:', usersRes)
      console.log('Organizations response:', orgsRes)
      
      const usersData = usersRes.data || []
      const orgsData = orgsRes.data || []
      
      console.log('Setting users state:', { count: usersData.length, users: usersData })
      setUsers(usersData)
      setOrganizations(orgsData)
      
      if (usersData.length === 0) {
        setUsersError('No officers found. Please create officers first.')
        console.warn('No officers returned from API')
      } else {
        console.log(`Successfully loaded ${usersData.length} officers into state`)
      }
    } catch (error) {
      console.error('Failed to fetch users/organizations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch officers'
      setUsersError(errorMessage)
      toast({
        title: 'Failed to load officers',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchGeographicData = async () => {
    setGeographicLoading(true)
    try {
      const data = await apiGetGeographicData()
      setGeographicData(data)
    } catch (error) {
      console.error('Failed to fetch geographic data:', error)
      setGeographicData(null)
    } finally {
      setGeographicLoading(false)
    }
  }

  // Compute filtered geographic data based on selections
  const filteredGeographicData = useMemo(() => {
    if (!geographicData) return null
    
    let filteredDistricts = geographicData.districts
    let filteredSectors = geographicData.sectors
    
    // Filter districts by selected province
    if (selectedProvince) {
      filteredDistricts = geographicData.districts.filter(d => d.province === selectedProvince)
      // Also filter sectors by province
      filteredSectors = geographicData.sectors.filter(s => s.province === selectedProvince)
    }
    
    // Filter sectors by selected district (only if district is selected)
    if (selectedDistrict) {
      filteredSectors = filteredSectors.filter(s => s.district === selectedDistrict)
    }
    
    return {
      provinces: geographicData.provinces,
      districts: filteredDistricts,
      sectors: filteredSectors,
    }
  }, [geographicData, selectedProvince, selectedDistrict])

  const fetchOfficerMetrics = async () => {
    setOfficerMetricsLoading(true)
    try {
      const response = await apiGetOfficerMetrics()
      setOfficerMetrics(response.data)
    } catch (error) {
      console.error('Failed to fetch officer metrics:', error)
    } finally {
      setOfficerMetricsLoading(false)
    }
  }

  const fetchReports = async (): Promise<AdminReport[]> => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching reports from API...')
      const response = await apiGetAdminReports({ limit: 1000 })
      console.log('Reports fetched:', response.data.length, 'reports')
      if (response.data.length > 0) {
        console.log('Sample report:', response.data[0])
      }
      setReports(response.data)
      return response.data
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reports. Please check your API connection.'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = async (report: AdminReport) => {
    // Always fetch fresh data when opening a report to ensure we have the latest assignment status
    // This is especially important for reports that were auto-assigned previously
    try {
      const updatedReports = await fetchReports()
      const freshReport = updatedReports.find(r => r.id === report.id) || report
      setSelectedReport(freshReport)
      setIsDetailOpen(true)
      // Reset the detail key to ensure fresh fetch in ReportDetailView
      setReportDetailKey(prev => prev + 1)
    } catch (error) {
      // If fetch fails, still open with the report from the list
      console.error('Failed to refresh reports before viewing:', error)
      setSelectedReport(report)
      setIsDetailOpen(true)
    }
  }

  const handleReportUpdated = () => {
    fetchReports()
    setIsDetailOpen(false)
  }

  // Calculate statistics
  const stats = {
    total: reports.length,
    new: reports.filter(r => r.status === 'new').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    high: reports.filter(r => r.severity === 'high').length,
  }

  // Urgent reports (high severity, unresolved)
  const urgentReports = reports
    .filter(r => r.severity === 'high' && r.status !== 'resolved' && r.status !== 'rejected')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  // Performance metrics
  const performanceMetrics = (() => {
    const resolvedReports = reports.filter(r => r.status === 'resolved' && r.createdAt && r.updatedAt)
    
    // Calculate average resolution time
    const resolutionTimes = resolvedReports.map(r => {
      const created = new Date(r.createdAt).getTime()
      const updated = new Date(r.updatedAt).getTime()
      return (updated - created) / (1000 * 60 * 60) // hours
    })
    
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0

    // Calculate overdue assignments (assigned more than 7 days ago, not resolved)
    const overdueReports = reports.filter(r => {
      if (r.status === 'resolved' || r.status === 'rejected') return false
      if (!r.currentAssignment?.createdAt) return false
      const assignedDate = new Date(r.currentAssignment.createdAt)
      const daysSinceAssignment = (Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceAssignment > 7
    })

    // SLA compliance (assuming 7-day SLA)
    // Calculate from assignment date, include all assigned reports
    const slaTarget = 7 * 24 // 7 days in hours
    
    // Get all reports that have been assigned (have a currentAssignment with createdAt)
    const assignedReports = reports.filter(r => {
      // Check if report has an assignment with createdAt
      const hasAssignment = r.currentAssignment?.createdAt
      if (!hasAssignment && r.currentAssignment) {
        // Debug: log reports with assignment but no createdAt
        console.log('Report with assignment but no createdAt:', {
          id: r.id,
          title: r.title,
          currentAssignment: r.currentAssignment
        })
      }
      return hasAssignment && r.status !== 'rejected'
    })
    
    // Debug logging
    if (reports.length > 0) {
      console.log('SLA Debug:', {
        totalReports: reports.length,
        assignedReportsCount: assignedReports.length,
        reportsWithAssignment: reports.filter(r => r.currentAssignment).length,
        reportsWithAssignmentCreatedAt: reports.filter(r => r.currentAssignment?.createdAt).length,
        sampleReport: reports.find(r => r.currentAssignment)?.currentAssignment
      })
    }
    
    // For each assigned report, check if it's SLA compliant
    const slaCompliant = assignedReports.filter(r => {
      const createdAt = r.currentAssignment?.createdAt
      if (!createdAt) return false
      
      const assignedDate = new Date(createdAt).getTime()
      
      if (r.status === 'resolved') {
        // For resolved reports: check if resolved within SLA from assignment
        const resolvedDate = new Date(r.updatedAt).getTime()
        const hoursToResolve = (resolvedDate - assignedDate) / (1000 * 60 * 60)
        return hoursToResolve <= slaTarget
      } else {
        // For unresolved reports: check if still within SLA (not overdue)
        const now = Date.now()
        const hoursSinceAssignment = (now - assignedDate) / (1000 * 60 * 60)
        return hoursSinceAssignment <= slaTarget
      }
    }).length
    
    // Calculate compliance rate, or return null if no assigned reports
    const slaComplianceRate = assignedReports.length > 0
      ? (slaCompliant / assignedReports.length) * 100
      : null

    // Category-specific resolution times
    const categoryResolutionTimes = new Map<string, { total: number; hours: number }>()
    resolvedReports.forEach(r => {
      if (!categoryResolutionTimes.has(r.type)) {
        categoryResolutionTimes.set(r.type, { total: 0, hours: 0 })
      }
      const created = new Date(r.createdAt).getTime()
      const updated = new Date(r.updatedAt).getTime()
      const hours = (updated - created) / (1000 * 60 * 60)
      const cat = categoryResolutionTimes.get(r.type)!
      cat.total++
      cat.hours += hours
    })
    
    const categoryAvgTimes = Array.from(categoryResolutionTimes.entries()).map(([type, data]) => ({
      type,
      avgHours: data.hours / data.total,
      count: data.total,
    }))

    // Overdue percentage
    const totalAssigned = reports.filter(r => 
      r.currentAssignment?.createdAt && r.status !== 'rejected'
    ).length
    const overduePercentage = totalAssigned > 0
      ? (overdueReports.length / totalAssigned) * 100
      : 0

    return {
      avgResolutionTime,
      overdueCount: overdueReports.length,
      overduePercentage,
      slaComplianceRate,
      categoryAvgTimes,
    }
  })()

  // Reports by province
  const provinceData = (() => {
    const provinceMap = new Map<string, number>()
    reports.forEach(report => {
      const province = report.province?.trim()
      if (province && province.length > 0) {
        provinceMap.set(province, (provinceMap.get(province) || 0) + 1)
      }
    })
    return Array.from(provinceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  })()

  // Reports by district (filtered by province if selected)
  const districtData = (() => {
    const districtMap = new Map<string, number>()
    const reportsToUse = filterProvince 
      ? reports.filter(report => report.province?.trim() === filterProvince)
      : reports
    reportsToUse.forEach(report => {
      const district = report.district?.trim()
      if (district && district.length > 0) {
        districtMap.set(district, (districtMap.get(district) || 0) + 1)
      }
    })
    return Array.from(districtMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 districts
  })()

  // Reports by sector (filtered by district and province if selected)
  const sectorData = (() => {
    const sectorMap = new Map<string, number>()
    let reportsToUse = reports
    if (filterProvince) {
      reportsToUse = reportsToUse.filter(report => report.province?.trim() === filterProvince)
    }
    if (filterDistrict) {
      reportsToUse = reportsToUse.filter(report => report.district?.trim() === filterDistrict)
    }
    reportsToUse.forEach(report => {
      const sector = report.sector?.trim()
      if (sector && sector.length > 0) {
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1)
      }
    })
    return Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 sectors
  })()

  // Debug: Log data availability
  useEffect(() => {
    if (reports.length > 0) {
      console.log('Dashboard Statistics:', stats)
      console.log('Total reports:', reports.length)
      console.log('Reports with district:', reports.filter(r => r.district).length)
      console.log('Reports with sector:', reports.filter(r => r.sector).length)
      console.log('Reports with province:', reports.filter(r => r.province).length)
      
      // Log sample reports to see what fields are available
      if (reports.length > 0) {
        console.log('Sample report fields:', {
          id: reports[0].id,
          district: reports[0].district,
          sector: reports[0].sector,
          province: reports[0].province,
          hasDistrict: !!reports[0].district,
          hasSector: !!reports[0].sector,
        })
      }
      
      const districts = [...new Set(reports.filter(r => r.district && r.district.trim()).map(r => r.district))].slice(0, 5)
      const sectors = [...new Set(reports.filter(r => r.sector && r.sector.trim()).map(r => r.sector))].slice(0, 5)
      console.log('Sample districts:', districts)
      console.log('Sample sectors:', sectors)
      console.log('Province data for chart:', provinceData)
      console.log('District data for chart:', districtData)
      console.log('Sector data for chart:', sectorData)
    }
  }, [reports, stats, provinceData, districtData, sectorData])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterProvince, filterDistrict, filterSector, filterStatus, filterType, filterSeverity, searchQuery, dateRange])

  // Reports by status
  const statusData = [
    { name: 'New', value: reports.filter(r => r.status === 'new').length, color: '#3b82f6' },
    { name: 'Triaged', value: reports.filter(r => r.status === 'triaged').length, color: '#8b5cf6' },
    { name: 'Assigned', value: reports.filter(r => r.status === 'assigned').length, color: '#f59e0b' },
    { name: 'In Progress', value: reports.filter(r => r.status === 'in_progress').length, color: '#10b981' },
    { name: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: '#06b6d4' },
    { name: 'Rejected', value: reports.filter(r => r.status === 'rejected').length, color: '#ef4444' },
  ].filter(item => item.value > 0)

  // Helper function to format type display names
  const getTypeDisplayName = (type: string): string => {
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
    return typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
  }

  // Reports by type - dynamically count all unique types
  const typeData = (() => {
    const typeCounts = new Map<string, number>()
    
    reports.forEach(report => {
      const count = typeCounts.get(report.type) || 0
      typeCounts.set(report.type, count + 1)
    })
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        name: getTypeDisplayName(type),
        value: count,
      }))
      .sort((a, b) => b.value - a.value) // Sort by count descending
      .filter(item => item.value > 0)
  })()

  // Reports by hour of day
  const hourlyData = (() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      reports: 0,
    }))
    
    reports.forEach(report => {
      const reportDate = new Date(report.createdAt)
      const hour = reportDate.getHours()
      hours[hour].reports += 1
    })
    
    return hours
  })()

  // Monthly reports (last 12 months)
  const monthlyData = (() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (11 - i))
      return {
        month: format(date, 'MMM'),
        reports: 0,
      }
    })
    
    reports.forEach(report => {
      const reportDate = new Date(report.createdAt)
      const monthIndex = reportDate.getMonth()
      const monthDiff = new Date().getMonth() - monthIndex
      if (monthDiff >= 0 && monthDiff < 12) {
        months[11 - monthDiff].reports += 1
      }
    })
    
    return months
  })()

  // Weekly reports data (last 8 weeks)
  const weeklyData = (() => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (7 - i) * 7)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      return {
        week: `Week ${8 - i}`,
        label: format(weekStart, 'MMM d'),
        weekStart: weekStart,
        reports: 0,
      }
    })

    reports.forEach(report => {
      const reportDate = new Date(report.createdAt)
      const weekStart = new Date(reportDate)
      weekStart.setDate(reportDate.getDate() - reportDate.getDay())
      
      // Find which week this report belongs to
      for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i]
        const weekEnd = new Date(week.weekStart)
        weekEnd.setDate(week.weekStart.getDate() + 6)
        
        if (reportDate >= week.weekStart && reportDate <= weekEnd) {
          week.reports++
          break
        }
      }
    })

    return weeks
  })()

  // Daily reports data (last 30 days)
  const dailyData = (() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return {
        day: format(date, 'MMM d'),
        date: new Date(date),
        reports: 0,
      }
    })

    reports.forEach(report => {
      const reportDate = new Date(report.createdAt)
      reportDate.setHours(0, 0, 0, 0)
      
      const dayData = days.find(d => {
        const dayDate = new Date(d.date)
        dayDate.setHours(0, 0, 0, 0)
        return dayDate.getTime() === reportDate.getTime()
      })
      
      if (dayData) {
        dayData.reports++
      }
    })

    return days
  })()

  // Filter reports based on all filters
  const filteredReports = reports.filter(report => {
    if (filterProvince && report.province?.trim() !== filterProvince) return false
    if (filterDistrict && report.district?.trim() !== filterDistrict) return false
    if (filterSector && report.sector?.trim() !== filterSector) return false
    if (filterStatus && report.status !== filterStatus) return false
    if (filterType && report.type !== filterType) return false
    if (filterSeverity && report.severity !== filterSeverity) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!report.title.toLowerCase().includes(query) && 
          !report.description.toLowerCase().includes(query)) {
        return false
      }
    }
    // Advanced search: Reporter
    if (searchReporter) {
      const query = searchReporter.toLowerCase()
      if (!report.reporter?.email?.toLowerCase().includes(query) &&
          !report.reporter?.fullName?.toLowerCase().includes(query)) {
        return false
      }
    }
    // Advanced search: Assignee
    if (searchAssignee) {
      const query = searchAssignee.toLowerCase()
      const assigneeEmail = report.currentAssignment?.assignee?.email?.toLowerCase() || ''
      const assigneeName = report.currentAssignment?.assignee?.fullName?.toLowerCase() || ''
      const orgName = report.currentAssignment?.organization?.name?.toLowerCase() || ''
      if (!assigneeEmail.includes(query) && !assigneeName.includes(query) && !orgName.includes(query)) {
        return false
      }
    }
    // Date range filter
    if (dateRange.from || dateRange.to) {
      const reportDate = new Date(report.createdAt)
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        if (reportDate < fromDate) return false
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        if (reportDate > toDate) return false
      }
    }
    return true
  })

  // Calculate map bounds from filtered reports
  const mapCenterAndBounds = useMemo(() => {
    const reportsWithLocation = filteredReports.filter(r => r.latitude && r.longitude)
    if (reportsWithLocation.length === 0) {
      return { center: [-1.9441, 30.0619] as [number, number], zoom: 11 } // Default to Kigali
    }
    
    const lats = reportsWithLocation.map(r => r.latitude!)
    const lngs = reportsWithLocation.map(r => r.longitude!)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    
    // Calculate zoom level based on bounds
    const latDiff = maxLat - minLat
    const lngDiff = maxLng - minLng
    const maxDiff = Math.max(latDiff, lngDiff)
    
    let zoom = 11
    if (maxDiff > 0.5) zoom = 8
    else if (maxDiff > 0.2) zoom = 9
    else if (maxDiff > 0.1) zoom = 10
    else if (maxDiff > 0.05) zoom = 11
    else if (maxDiff > 0.02) zoom = 12
    else zoom = 13
    
    return {
      center: [centerLat, centerLng] as [number, number],
      zoom,
      bounds: [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]]
    }
  }, [filteredReports])

  // Helper function to format time ago
  const formatTimeAgo = (date: string): string => {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  // Helper function to check if report is overdue
  const isOverdue = (report: AdminReport): boolean => {
    if (!report.currentAssignment?.createdAt) return false
    if (report.status === 'resolved' || report.status === 'rejected') return false
    
    const assignedDate = new Date(report.currentAssignment.createdAt)
    const daysSinceAssignment = (Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceAssignment > 7
  }

  // Helper function to get days until/since due date
  const getDueDateInfo = (report: AdminReport): { text: string; isOverdue: boolean } | null => {
    if (!report.currentAssignment?.dueAt) return null
    
    const dueDate = new Date(report.currentAssignment.dueAt)
    const now = new Date()
    const diffMs = dueDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true }
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false }
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', isOverdue: false }
    } else {
      return { text: `Due in ${diffDays}d`, isOverdue: false }
    }
  }

  // Helper function to get assignment age
  const getAssignmentAge = (report: AdminReport): string | null => {
    if (!report.currentAssignment?.createdAt) return null
    return formatTimeAgo(report.currentAssignment.createdAt)
  }

  // Helper function to get photo count
  const getPhotoCount = (report: AdminReport): number => {
    return report.photos?.length || 0
  }

  // Helper function to format location
  const formatLocation = (report: AdminReport): string => {
    const parts: string[] = []
    if (report.district) parts.push(report.district)
    if (report.province && !parts.includes(report.province)) {
      parts.push(report.province)
    }
    return parts.length > 0 ? parts.join(', ') : 'Unknown'
  }

  // Sort filtered reports
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
      case 'type':
        aValue = a.type
        bValue = b.type
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

  // Pagination
  const totalPages = Math.ceil(sortedReports.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedReports = sortedReports.slice(startIndex, startIndex + pageSize)
  
  const recentReports = paginatedReports

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleProvinceClick = (province: string) => {
    setFilterProvince(province)
    setFilterDistrict(null) // Clear district filter when province is selected
    setFilterSector(null) // Clear sector filter when province is selected
    
    // Scroll to reports table after a short delay to ensure filtering is complete
    setTimeout(() => {
      reportsTableRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const handleDistrictClick = (district: string) => {
    setFilterDistrict(district)
    setFilterSector(null) // Clear sector filter when district is selected
    
    // Scroll to reports table after a short delay to ensure filtering is complete
    setTimeout(() => {
      reportsTableRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const handleSectorClick = (sector: string) => {
    setFilterSector(sector)
    setFilterDistrict(null) // Clear district filter when sector is selected
    
    // Scroll to reports table after a short delay to ensure filtering is complete
    setTimeout(() => {
      reportsTableRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const clearFilters = () => {
    setFilterProvince(null)
    setFilterDistrict(null)
    setFilterSector(null)
    setFilterStatus('')
    setFilterType('')
    setFilterSeverity('')
    setSearchQuery('')
    setDateRange({ from: '', to: '' })
    // Also clear chart selections
    setSelectedProvince(null)
    setSelectedDistrict(null)
    setSelectedReports(new Set())
    setCurrentPage(1)
    setSearchReporter('')
    setSearchAssignee('')
  }

  const handleAutoAssign = async () => {
    setAutoAssigning(true)
    try {
      const response = await apiAutoAssignReports()
      toast({
        title: 'Success',
        description: `Successfully assigned ${response.assigned || 0} reports to officers`,
      })
      // Refresh reports to show updated assignments
      const updatedReports = await fetchReports()
      await fetchOfficerMetrics()
      
      // If a report detail view is open, update the selected report with fresh data
      if (selectedReport) {
        // Find the updated report from the refreshed reports list
        const updatedReport = updatedReports.find(r => r.id === selectedReport.id)
        if (updatedReport) {
          setSelectedReport(updatedReport)
          // Force ReportDetailView to refresh by updating the key
          setReportDetailKey(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Failed to auto-assign reports:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to auto-assign reports',
        variant: 'destructive',
      })
    } finally {
      setAutoAssigning(false)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Title', 'Type', 'Severity', 'Status', 'Province', 'District', 'Sector', 'Assigned To', 'Created At']
    const rows = sortedReports.map(report => [
      report.title,
      getTypeDisplayName(report.type),
      report.severity,
      report.status,
      report.province || '',
      report.district || '',
      report.sector || '',
      report.currentAssignment?.assignee?.fullName || report.currentAssignment?.organization?.name || 'Unassigned',
      format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm:ss')
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reports_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: 'Success',
      description: `Exported ${sortedReports.length} reports to CSV`,
    })
  }

  // Bulk actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedReports.size === 0) return
    
    try {
      const promises = Array.from(selectedReports).map(id => 
        apiUpdateReportStatus(id, { status: status as any, note: 'Bulk status update' })
      )
      await Promise.all(promises)
      
      toast({
        title: 'Success',
        description: `Updated ${selectedReports.size} report(s) to ${status}`,
      })
      
      setSelectedReports(new Set())
      fetchReports()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update reports',
        variant: 'destructive',
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedReports.size === paginatedReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(paginatedReports.map(r => r.id)))
    }
  }

  const handleSelectReport = (reportId: string) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  const handleQuickTriage = async (report: AdminReport) => {
    setUpdatingStatus(report.id)
    try {
      await apiUpdateReportStatus(report.id, {
        status: 'triaged',
        note: 'Report triaged by admin'
      })
      toast({
        title: 'Success',
        description: 'Report marked as triaged',
      })
      fetchReports()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleQuickResolve = async (report: AdminReport) => {
    setUpdatingStatus(report.id)
    try {
      await apiUpdateReportStatus(report.id, {
        status: 'resolved',
        note: 'Report resolved by admin'
      })
      toast({
        title: 'Success',
        description: 'Report marked as resolved',
      })
      fetchReports()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleQuickAssign = async (report: AdminReport) => {
    setAssigningReport(report)
    setAssignData({ assigneeId: '', organizationId: '', dueAt: '' })
    
    // Always refresh users/orgs when opening dialog to ensure we have latest data
    if (users.length === 0 || !usersLoading) {
      console.log('Fetching users before opening dialog, current users count:', users.length)
      await fetchUsersAndOrgs()
    }
    
    console.log('Opening assign dialog, users available:', users.length)
    setIsAssignDialogOpen(true)
  }

  const handleAssignSubmit = async () => {
    if (!assigningReport) {
      console.error('No report selected for assignment')
      return
    }
    
    if (!assignData.assigneeId && !assignData.organizationId) {
      toast({
        title: 'Validation Error',
        description: 'Please select either an officer or organization',
        variant: 'destructive',
      })
      return
    }

    console.log('Submitting assignment:', {
      reportId: assigningReport.id,
      assignData,
    })

    try {
      const payload: {
        assigneeId?: string
        organizationId?: string
        dueAt?: string
      } = {}
      
      if (assignData.assigneeId) {
        payload.assigneeId = assignData.assigneeId
      }
      
      if (assignData.organizationId) {
        payload.organizationId = assignData.organizationId
      }
      
      if (assignData.dueAt && assignData.dueAt.trim() !== '') {
        // Convert datetime-local format to ISO string
        const dateValue = new Date(assignData.dueAt)
        if (!isNaN(dateValue.getTime())) {
          payload.dueAt = dateValue.toISOString()
        }
      }
      
      console.log('Assignment payload:', payload)
      const result = await apiAssignReport(assigningReport.id, payload)
      console.log('Assignment result:', result)
      
      toast({
        title: 'Success',
        description: 'Report assigned successfully',
      })
      setIsAssignDialogOpen(false)
      setAssigningReport(null)
      setAssignData({ assigneeId: '', organizationId: '', dueAt: '' })
      fetchReports()
    } catch (error: any) {
      console.error('Assignment error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign report',
        variant: 'destructive',
      })
    }
  }

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
      <AdminSidebar variant="admin" userName="Admin User" userRole="admin" />
      
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-slate-400">Overview of all infrastructure reports</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  fetchReports()
                  fetchOfficerMetrics()
                }} 
                variant="outline" 
                size="sm" 
                className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 lg:p-8 space-y-8">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500 bg-red-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-400">Error Loading Data</h3>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
                <Button
                  onClick={fetchReports}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-400 hover:bg-red-500/20"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Urgent Reports Alert Section */}
          {!loading && urgentReports.length > 0 && (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 border-b-0 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-white" />
                    <CardTitle className="text-white text-base font-semibold">Urgent Reports</CardTitle>
                  </div>
                  <Badge className="bg-red-800/90 text-white border-red-600 px-2 py-0.5 text-xs font-medium">
                    {urgentReports.length} urgent
                  </Badge>
                </div>
                <CardDescription className="text-red-100/90 text-xs mt-1">
                  High-severity reports requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {urgentReports.map((report) => (
                    <div
                      key={report.id}
                      className="group flex items-center justify-between gap-3 p-2.5 rounded-md border border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/70 transition-all cursor-pointer"
                      onClick={() => handleViewReport(report)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                              {report.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs px-1.5 py-0.5">
                                High
                              </Badge>
                              <Badge className={`${getStatusBadgeClassName(report.status)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                                {report.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(report.createdAt), 'MMM d, yyyy')}
                            </span>
                            {report.district && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {report.district}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewReport(report)
                        }}
                        className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-blue-500/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">Total Reports</CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
                <p className="text-xs text-slate-400">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-yellow-500/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">New Reports</CardTitle>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{stats.new}</div>
                <p className="text-xs text-slate-400">Requires attention</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-orange-500/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">In Progress</CardTitle>
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{stats.inProgress}</div>
                <p className="text-xs text-slate-400">Active work</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-green-500/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">Resolved</CardTitle>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{stats.resolved}</div>
                <p className="text-xs text-slate-400">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Cards */}
          {!loading && reports.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-blue-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">Avg Resolution Time</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    {performanceMetrics.avgResolutionTime > 0
                      ? `${Math.round(performanceMetrics.avgResolutionTime / 24 * 10) / 10} days`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-400">Average time to resolve</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-green-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">SLA Compliance</CardTitle>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    {performanceMetrics.slaComplianceRate !== null
                      ? `${Math.round(performanceMetrics.slaComplianceRate)}%`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {performanceMetrics.slaComplianceRate !== null
                      ? `Assigned reports within 7-day SLA`
                      : 'No assigned reports yet'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-red-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">Overdue Assignments</CardTitle>
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">{performanceMetrics.overdueCount}</div>
                  <p className="text-xs text-slate-400">
                    {performanceMetrics.overduePercentage !== undefined && performanceMetrics.overduePercentage > 0
                      ? `${Math.round(performanceMetrics.overduePercentage)}% of assigned reports`
                      : 'Assigned &gt; 7 days ago'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category-Specific Resolution Times */}
          {!loading && reports.length > 0 && performanceMetrics.categoryAvgTimes && performanceMetrics.categoryAvgTimes.length > 0 && (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all mt-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">Resolution Time by Category</CardTitle>
                <CardDescription className="text-slate-400">Average resolution time for each report category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {performanceMetrics.categoryAvgTimes
                    .sort((a, b) => b.avgHours - a.avgHours)
                    .map((cat) => (
                      <div
                        key={cat.type}
                        className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300 capitalize">
                            {cat.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400">({cat.count} reports)</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {(cat.avgHours / 24).toFixed(1)} days
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {cat.avgHours < 168 ? 'Within SLA' : 'Over SLA'}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Officer Metrics Section */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-xl flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-400" />
                      Officer Performance Metrics
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Case statistics and success rates for all officers
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fetchOfficerMetrics}
                    variant="outline"
                    size="sm"
                    disabled={officerMetricsLoading}
                    className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${officerMetricsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {officerMetricsLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading officer metrics...</div>
                ) : officerMetrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No officer metrics available</div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid gap-4 sm:grid-cols-3 mb-6">
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-300">Total Officers</CardTitle>
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <UserCheck className="h-4 w-4 text-blue-400" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">{officerMetrics.length}</div>
                          <p className="text-xs text-slate-400 mt-1">Active officers</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-300">Total Cases</CardTitle>
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <FileText className="h-4 w-4 text-purple-400" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {officerMetrics.reduce((sum, m) => sum + m.totalCases, 0)}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Across all officers</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-300">Avg Success Rate</CardTitle>
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {officerMetrics.length > 0
                              ? Math.round(
                                  officerMetrics.reduce((sum, m) => sum + m.successRate, 0) / officerMetrics.length
                                )
                              : 0}
                            %
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Average across all officers</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Gauge Charts Visualization */}
                    {officerMetrics.length > 0 && (() => {
                      // Calculate current active assignments for each officer
                      const officerAssignments = new Map<string, { count: number; tasks: Array<{ id: string; title: string; status: string }> }>()
                      
                      // Initialize all officers with 0 assignments
                      officerMetrics.forEach(officer => {
                        officerAssignments.set(officer.officerId, { count: 0, tasks: [] })
                      })
                      
                      // Count active assignments from reports
                      reports.forEach(report => {
                        const assigneeId = report.currentAssignment?.assignee?.id
                        if (assigneeId && officerAssignments.has(assigneeId)) {
                          // Only count non-resolved, non-rejected reports as active assignments
                          if (report.status !== 'resolved' && report.status !== 'rejected') {
                            const current = officerAssignments.get(assigneeId)!
                            current.count++
                            current.tasks.push({
                              id: report.id,
                              title: report.title,
                              status: report.status
                            })
                            officerAssignments.set(assigneeId, current)
                          }
                        }
                      })
                      
                      // Enrich officer metrics with assignment data
                      const officersWithAssignments = officerMetrics.map(officer => ({
                        ...officer,
                        currentAssignments: officerAssignments.get(officer.officerId) || { count: 0, tasks: [] },
                        isFree: (officerAssignments.get(officer.officerId)?.count || 0) === 0
                      }))
                      
                      // Sort officers based on selected sort option
                      const sortedOfficers = [...officersWithAssignments].sort((a, b) => {
                        if (officerMetricsSort === 'highest') {
                          return b.successRate - a.successRate
                        } else {
                          return a.successRate - b.successRate
                        }
                      })

                      // Calculate pagination
                      const totalOfficerPages = Math.ceil(sortedOfficers.length / officerMetricsPageSize)
                      const startOfficerIndex = (officerMetricsPage - 1) * officerMetricsPageSize
                      const paginatedOfficers = sortedOfficers.slice(
                        startOfficerIndex,
                        startOfficerIndex + officerMetricsPageSize
                      )

                      return (
                        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 mb-6">
                          <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div>
                                <CardTitle className="text-white text-lg">Success Rate by Officer</CardTitle>
                                <CardDescription className="text-slate-400">Individual officer performance metrics</CardDescription>
                              </div>
                              <div className="flex items-center gap-3">
                                <Select
                                  value={officerMetricsSort}
                                  onValueChange={(value: 'highest' | 'lowest') => {
                                    setOfficerMetricsSort(value)
                                    setOfficerMetricsPage(1)
                                  }}
                                >
                                  <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-slate-300">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="highest">Highest First</SelectItem>
                                    <SelectItem value="lowest">Lowest First</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={String(officerMetricsPageSize)}
                                  onValueChange={(value) => {
                                    setOfficerMetricsPageSize(Number(value))
                                    setOfficerMetricsPage(1)
                                  }}
                                >
                                  <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 text-slate-300">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10">10 per page</SelectItem>
                                    <SelectItem value="20">20 per page</SelectItem>
                                    <SelectItem value="30">30 per page</SelectItem>
                                    <SelectItem value="50">50 per page</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                              {paginatedOfficers.map((officer: any) => (
                                <div
                                  key={officer.officerId}
                                  className="flex flex-col p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h3 className="text-sm font-semibold text-white mb-1">{officer.officerName}</h3>
                                      <p className="text-xs text-slate-400">{officer.officerEmail}</p>
                                    </div>
                                    <Badge 
                                      className={`${
                                        officer.isFree 
                                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                      } text-xs px-2 py-1 min-w-[60px] text-center inline-block`}
                                    >
                                      {officer.isFree ? 'Free' : 'Busy'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-center mb-3">
                                    <GaugeChart
                                      value={officer.successRate}
                                      label=""
                                      size={120}
                                      strokeWidth={12}
                                    />
                                  </div>
                                  
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span>Resolved:</span>
                                      <span className="font-medium">{officer.resolvedCases} / {officer.totalCases}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span>Current Tasks:</span>
                                      <span className={`font-medium ${
                                        officer.currentAssignments?.count > 0 ? 'text-orange-400' : 'text-green-400'
                                      }`}>
                                        {officer.currentAssignments?.count || 0}
                                      </span>
                                    </div>
                                    {officer.currentAssignments?.count > 0 && (
                                      <div className="mt-2 pt-2 border-t border-slate-700">
                                        <p className="text-slate-400 mb-1">Active Tasks:</p>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                          {officer.currentAssignments.tasks.slice(0, 3).map((task: any) => (
                                            <div key={task.id} className="text-slate-300 truncate" title={task.title}>
                                              • {task.title}
                                            </div>
                                          ))}
                                          {officer.currentAssignments.tasks.length > 3 && (
                                            <div className="text-slate-400 text-xs">
                                              +{officer.currentAssignments.tasks.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalOfficerPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-700">
                                <div className="text-sm text-slate-400">
                                  Showing {startOfficerIndex + 1} to {Math.min(startOfficerIndex + officerMetricsPageSize, sortedOfficers.length)} of {sortedOfficers.length} officers
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOfficerMetricsPage(1)}
                                    disabled={officerMetricsPage === 1}
                                    className="text-slate-400 hover:text-white"
                                  >
                                    First
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOfficerMetricsPage(prev => Math.max(1, prev - 1))}
                                    disabled={officerMetricsPage === 1}
                                    className="text-slate-400 hover:text-white"
                                  >
                                    Previous
                                  </Button>
                                  <span className="text-sm text-slate-400 px-2">
                                    Page {officerMetricsPage} of {totalOfficerPages}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOfficerMetricsPage(prev => Math.min(totalOfficerPages, prev + 1))}
                                    disabled={officerMetricsPage === totalOfficerPages}
                                    className="text-slate-400 hover:text-white"
                                  >
                                    Next
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOfficerMetricsPage(totalOfficerPages)}
                                    disabled={officerMetricsPage === totalOfficerPages}
                                    className="text-slate-400 hover:text-white"
                                  >
                                    Last
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Time-based Charts Row */}
          {!loading && reports.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-semibold text-white">Time-Based Analytics</h2>
              </div>
              
              {/* Monthly and Weekly Charts - Top Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Monthly Reports Chart */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Monthly Reports</CardTitle>
                    <CardDescription className="text-slate-400">Reports created over the last 12 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={monthlyData}>
                        <defs>
                          <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#60a5fa', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />
                        <Bar dataKey="reports" fill="url(#monthlyGradient)" radius={[8, 8, 0, 0]} animationDuration={600} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly Reports Chart */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Weekly Reports</CardTitle>
                    <CardDescription className="text-slate-400">Reports created over the last 8 weeks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={weeklyData}>
                        <defs>
                          <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="label" 
                          stroke="#94a3b8" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#fbbf24', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                        />
                        <Bar dataKey="reports" fill="url(#weeklyGradient)" radius={[8, 8, 0, 0]} animationDuration={600} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Daily and Hourly Reports Charts - Bottom Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Daily Reports Chart */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Daily Reports</CardTitle>
                    <CardDescription className="text-slate-400">Reports created over the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={dailyData}>
                        <defs>
                          <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="day" 
                          stroke="#94a3b8" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={4}
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#34d399', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                        />
                        <Bar dataKey="reports" fill="url(#dailyGradient)" radius={[8, 8, 0, 0]} animationDuration={600} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Reports by Hour of Day */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Reports by Hour of Day</CardTitle>
                    <CardDescription className="text-slate-400">Distribution of reports throughout the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={hourlyData}>
                        <defs>
                          <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="label" 
                          stroke="#94a3b8" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={2}
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#a78bfa', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                        />
                        <Bar dataKey="reports" fill="url(#hourlyGradient)" radius={[8, 8, 0, 0]} animationDuration={600} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Charts Row */}
          {!loading && reports.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-semibold text-white">Distribution Analytics</h2>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Reports by Status (Pie Chart) */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Reports by Status</CardTitle>
                    <CardDescription className="text-slate-400">Distribution of report statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : statusData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <PieChartIcon className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-slate-400 text-sm">No status data available</p>
                        <p className="text-slate-500 text-xs mt-1">Reports will appear here once data is available</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart role="img" aria-label="Reports by status distribution chart">
                          <defs>
                            {statusData.map((entry, index) => (
                              <linearGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                                <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                              const RADIAN = Math.PI / 180
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              
                              // Show labels for segments >3% to include more segments
                              if (percent < 0.03) return null
                              
                              // Adjust font size for small segments
                              const fontSize = percent < 0.05 ? (isMobile ? 9 : 10) : (isMobile ? 10 : 11)
                              
                              return (
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="#e2e8f0" 
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize={fontSize}
                                  fontWeight="500"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              )
                            }}
                            outerRadius={isMobile ? 70 : 90}
                            innerRadius={isMobile ? 25 : 30}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                            activeIndex={statusPieActiveIndex}
                            activeShape={(props: any) => {
                              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                              return (
                                <Sector
                                  cx={cx}
                                  cy={cy}
                                  innerRadius={innerRadius}
                                  outerRadius={outerRadius + 5}
                                  startAngle={startAngle}
                                  endAngle={endAngle}
                                  fill={fill}
                                  opacity={0.9}
                                />
                              )
                            }}
                            onMouseEnter={(_, index) => setStatusPieActiveIndex(index)}
                            onMouseLeave={() => setStatusPieActiveIndex(undefined)}
                            animationBegin={0}
                            animationDuration={600}
                            animationEasing="ease-out"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`url(#pieGradient-${index})`} stroke="#1e293b" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              border: '1px solid #1e293b', 
                              borderRadius: '10px',
                              padding: '12px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                            }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                            itemStyle={{ color: '#cbd5e1', fontWeight: '500' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ color: '#cbd5e1', fontSize: isMobile ? '11px' : '12px' }}
                            formatter={(value) => {
                              const entry = statusData.find(d => d.name === value)
                              return (
                                <span style={{ color: entry?.color || '#cbd5e1', fontWeight: '500' }}>
                                  {value}: {entry?.value || 0}
                                </span>
                              )
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Reports by Type */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg font-bold">Reports by Type</CardTitle>
                    <CardDescription className="text-slate-400">Infrastructure issue categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <RechartsBarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
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
                          fill="url(#barGradient)" 
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
              </div>
            </div>
          )}

          {/* Geographic Distribution Charts */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-white">Geographic Distribution</h2>
            </div>
            {geographicLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : geographicData ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* Province Distribution */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Province Distribution</CardTitle>
                        <CardDescription className="text-slate-400">
                          {selectedProvince ? `Filtered: ${selectedProvince}` : 'Reports by province - Click to filter districts'}
                        </CardDescription>
                      </div>
                      {selectedProvince && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvince(null)
                            setFilterProvince(null) // Clear report filter
                            setSelectedDistrict(null)
                            setFilterDistrict(null) // Clear report filter
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {geographicLoading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : !geographicData || !geographicData.provinces || geographicData.provinces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <MapPin className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-slate-400 text-sm">No geographic data available</p>
                        <p className="text-slate-500 text-xs mt-1">Province data will appear here once reports are available</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart role="img" aria-label="Geographic province distribution chart">
                          <defs>
                            {geographicData.provinces.map((entry, index) => {
                              const colors = [
                                '#6366f1', // Indigo
                                '#10b981', // Emerald
                                '#f59e0b', // Amber
                                '#ef4444', // Red
                                '#8b5cf6', // Purple
                                '#06b6d4', // Cyan
                                '#ec4899', // Pink
                                '#14b8a6', // Teal
                              ]
                              return (
                                <linearGradient key={`provinceGradient-${index}`} id={`provinceGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity={1} />
                                  <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity={0.7} />
                                </linearGradient>
                              )
                            })}
                          </defs>
                          <Pie
                            data={geographicData.provinces}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={isMobile ? 70 : 90}
                            innerRadius={isMobile ? 30 : 40}
                            label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                              const RADIAN = Math.PI / 180
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              
                              // Show labels for segments >3% to prevent too many labels
                              if (percent < 0.03) return null
                              
                              // Adjust font size for small segments
                              const fontSize = percent < 0.05 ? (isMobile ? 9 : 10) : (isMobile ? 11 : 12)
                              
                              return (
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="#e2e8f0" 
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize={fontSize}
                                  fontWeight="600"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              )
                            }}
                            labelLine={false}
                            paddingAngle={3}
                            onClick={(data: any) => {
                              if (data && data.name) {
                                setSelectedProvince(data.name)
                                setFilterProvince(data.name) // Also filter reports
                                setSelectedDistrict(null) // Reset district when province changes
                                setFilterDistrict(null) // Also clear district filter
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                            animationBegin={0}
                            animationDuration={600}
                            animationEasing="ease-out"
                            tabIndex={0}
                            onKeyDown={(e: any) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                const data = e.target?.__data__
                                if (data && data.name) {
                                  setSelectedProvince(data.name)
                                  setFilterProvince(data.name)
                                  setSelectedDistrict(null)
                                  setFilterDistrict(null)
                                }
                              }
                            }}
                          >
                            {geographicData.provinces.map((entry, index) => {
                              const colors = [
                                '#6366f1', // Indigo
                                '#10b981', // Emerald
                                '#f59e0b', // Amber
                                '#ef4444', // Red
                                '#8b5cf6', // Purple
                                '#06b6d4', // Cyan
                                '#ec4899', // Pink
                                '#14b8a6', // Teal
                              ]
                              const isSelected = selectedProvince === entry.name
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`url(#provinceGradient-${index})`}
                                  stroke="#1e293b"
                                  strokeWidth={2}
                                  style={{ 
                                    opacity: selectedProvince && !isSelected ? 0.3 : 1,
                                    stroke: isSelected ? '#fff' : '#1e293b',
                                    strokeWidth: isSelected ? 3 : 2,
                                    filter: isSelected ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                                    transition: 'all 0.2s ease',
                                  }}
                                />
                              )
                            })}
                          </Pie>
                          {/* Center display */}
                          {selectedProvince ? (
                            <>
                              <text 
                                x="50%" 
                                y="45%" 
                                textAnchor="middle" 
                                fill="#e2e8f0" 
                                fontSize={isMobile ? 18 : 20} 
                                fontWeight="bold"
                              >
                                {geographicData.provinces.find(p => p.name === selectedProvince)?.count || 0}
                              </text>
                              <text 
                                x="50%" 
                                y="55%" 
                                textAnchor="middle" 
                                fill="#94a3b8" 
                                fontSize={isMobile ? 10 : 11}
                              >
                                {selectedProvince}
                              </text>
                            </>
                          ) : (
                            <>
                              <text 
                                x="50%" 
                                y="45%" 
                                textAnchor="middle" 
                                fill="#e2e8f0" 
                                fontSize={isMobile ? 20 : 22} 
                                fontWeight="bold"
                              >
                                {geographicData.provinces.reduce((sum, p) => sum + p.count, 0)}
                              </text>
                              <text 
                                x="50%" 
                                y="55%" 
                                textAnchor="middle" 
                                fill="#94a3b8" 
                                fontSize={isMobile ? 10 : 11}
                              >
                                Total Reports
                              </text>
                            </>
                          )}
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              border: '1px solid #1e293b', 
                              borderRadius: '10px',
                              padding: '12px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                            }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                            itemStyle={{ color: '#cbd5e1', fontWeight: '500' }}
                            formatter={(value: any, name: any) => {
                              const total = geographicData.provinces.reduce((sum, p) => sum + p.count, 0)
                              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                              return [`${value} (${percent}%)`, name]
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ color: '#cbd5e1', fontSize: isMobile ? '10px' : '11px' }}
                            formatter={(value) => {
                              const province = geographicData.provinces.find(p => p.name === value)
                              const colors = [
                                '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
                                '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'
                              ]
                              const index = geographicData.provinces.findIndex(p => p.name === value)
                              return (
                                <span style={{ color: index >= 0 ? colors[index % colors.length] : '#cbd5e1' }}>
                                  {value}: {province?.count || 0}
                                </span>
                              )
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* District Distribution */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">
                          {selectedProvince ? `Districts in ${selectedProvince}` : 'Top Districts'}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {selectedDistrict ? `Filtered: ${selectedDistrict}` : selectedProvince ? 'Click a district to filter sectors' : 'Top 10 districts by report count'}
                        </CardDescription>
                      </div>
                      {selectedDistrict && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDistrict(null)
                            setFilterDistrict(null) // Clear report filter
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart
                        data={(filteredGeographicData?.districts || [])
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 10)
                          .map((d) => ({ name: d.name, count: d.count, district: d.name }))}
                      >
                        <defs>
                          <linearGradient id="districtGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          fontSize={12}
                          tick={{ fill: '#cbd5e1', fontSize: 12 }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#818cf8', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#districtGradient)" 
                          radius={[8, 8, 0, 0]}
                          animationDuration={600}
                          onClick={(data: any) => {
                            if (data && data.district) {
                              setSelectedDistrict(data.district)
                              setFilterDistrict(data.district) // Also filter reports
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Sector Distribution */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">
                          {selectedDistrict ? `Sectors in ${selectedDistrict}` : selectedProvince ? `Sectors in ${selectedProvince}` : 'Top Sectors'}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {selectedDistrict || selectedProvince 
                            ? `${(filteredGeographicData?.sectors || []).length} sectors shown` 
                            : 'Top 10 sectors by report count'}
                        </CardDescription>
                      </div>
                      {(selectedDistrict || selectedProvince) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvince(null)
                            setFilterProvince(null) // Clear report filter
                            setSelectedDistrict(null)
                            setFilterDistrict(null) // Clear report filter
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart
                        data={(filteredGeographicData?.sectors || [])
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 10)
                          .map((d) => ({ name: d.name, count: d.count }))}
                      >
                        <defs>
                          <linearGradient id="sectorGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          fontSize={12}
                          tick={{ fill: '#cbd5e1', fontSize: 12 }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tick={{ fill: '#cbd5e1' }}
                          tickLine={{ stroke: '#475569' }}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}
                          itemStyle={{ color: '#a78bfa', fontWeight: '500' }}
                          cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                        />
                        <Bar dataKey="count" fill="url(#sectorGradient)" radius={[8, 8, 0, 0]} animationDuration={600} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Reports Concentration Index */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-white">Distribution Analysis</CardTitle>
                    <CardDescription className="text-slate-400">How reports are spread across provinces</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto max-h-[300px] pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
                    {(() => {
                      const totalReports = geographicData.provinces.reduce((sum, p) => sum + p.count, 0)
                      
                      // Create a map of province counts (including 0 for provinces with no reports)
                      const provinceCountMap = new Map<string, number>()
                      RWANDA_PROVINCES.forEach(province => {
                        provinceCountMap.set(province, 0)
                      })
                      geographicData.provinces.forEach(p => {
                        provinceCountMap.set(p.name, p.count)
                      })
                      
                      // Calculate average using all 5 provinces
                      const avgReportsPerProvince = totalReports > 0 ? (totalReports / TOTAL_RWANDA_PROVINCES).toFixed(1) : '0'
                      
                      // Calculate concentration
                      const provinceCounts = Array.from(provinceCountMap.values())
                      const mean = provinceCounts.reduce((a, b) => a + b, 0) / TOTAL_RWANDA_PROVINCES
                      const variance = provinceCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / TOTAL_RWANDA_PROVINCES
                      const stdDev = Math.sqrt(variance)
                      const coefficientOfVariation = mean > 0 ? ((stdDev / mean) * 100).toFixed(1) : '0'
                      
                      // Most concentrated (highest count)
                      const sortedProvinces = Array.from(provinceCountMap.entries())
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                      const mostConcentrated = sortedProvinces[0]
                      const concentrationRatio = totalReports > 0 
                        ? ((mostConcentrated.count / totalReports) * 100).toFixed(1) 
                        : '0'
                      
                      // Most dispersed (lowest count, including 0)
                      const mostDispersed = sortedProvinces[sortedProvinces.length - 1]
                      
                      // Diversity index (how many provinces have significant share >= 10%)
                      const significantShare = sortedProvinces.filter(p => totalReports > 0 && (p.count / totalReports) >= 0.1).length
                      const diversityIndex = ((significantShare / TOTAL_RWANDA_PROVINCES) * 100).toFixed(0)

                      // Determine distribution status
                      const isEvenlyDistributed = parseFloat(coefficientOfVariation) < 50
                      const isModeratelyConcentrated = parseFloat(coefficientOfVariation) >= 50 && parseFloat(coefficientOfVariation) < 100
                      const isHighlyConcentrated = parseFloat(coefficientOfVariation) >= 100

                      return (
                        <div className="space-y-5 pb-2">
                          {/* Summary Status */}
                          <div className={`rounded-lg p-4 border-2 ${
                            isEvenlyDistributed 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : isModeratelyConcentrated
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : 'bg-orange-500/10 border-orange-500/30'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {isEvenlyDistributed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                              ) : isModeratelyConcentrated ? (
                                <AlertCircle className="h-5 w-5 text-yellow-400" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-orange-400" />
                              )}
                              <span className={`text-sm font-semibold ${
                                isEvenlyDistributed 
                                  ? 'text-green-400' 
                                  : isModeratelyConcentrated
                                  ? 'text-yellow-400'
                                  : 'text-orange-400'
                              }`}>
                                {isEvenlyDistributed 
                                  ? 'Evenly Distributed' 
                                  : isModeratelyConcentrated
                                  ? 'Moderately Concentrated'
                                  : 'Highly Concentrated'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {isEvenlyDistributed 
                                ? 'Reports are well-balanced across all provinces, indicating good geographic coverage.'
                                : isModeratelyConcentrated
                                ? 'Reports show some concentration in certain provinces. Consider monitoring distribution.'
                                : 'Reports are heavily concentrated in specific provinces. May need resource reallocation.'}
                            </p>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                              <div className="text-xs text-slate-400 mb-1">Average Reports</div>
                              <div className="text-2xl font-bold text-white">{avgReportsPerProvince}</div>
                              <div className="text-xs text-slate-500 mt-1">per province</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                              <div className="text-xs text-slate-400 mb-1">Active Provinces</div>
                              <div className="text-2xl font-bold text-white">{significantShare}</div>
                              <div className="text-xs text-slate-500 mt-1">of {TOTAL_RWANDA_PROVINCES} total</div>
                            </div>
                          </div>

                          {/* Top & Bottom Regions */}
                          <div className="space-y-3 pt-2 border-t border-slate-700">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-orange-400" />
                                  Highest Activity
                                </span>
                                <span className="text-xs text-orange-400 font-semibold">{concentrationRatio}% of all reports</span>
                              </div>
                              <div className="flex items-center justify-between bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                                <div>
                                  <div className="text-sm text-white font-semibold">{mostConcentrated?.name || 'N/A'}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">Most reports in this province</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-orange-400">{mostConcentrated?.count || 0}</div>
                                  <div className="text-xs text-slate-400">reports</div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-blue-400" />
                                  Lowest Activity
                                </span>
                                <span className="text-xs text-blue-400 font-semibold">
                                  {totalReports > 0 
                                    ? `${((mostDispersed.count / totalReports) * 100).toFixed(1)}% of all reports`
                                    : mostDispersed.count === 0 
                                    ? 'No reports'
                                    : 'Minimal reports'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <div>
                                  <div className="text-sm text-white font-semibold">{mostDispersed?.name || 'N/A'}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {mostDispersed.count === 0 
                                      ? 'No reports in this province' 
                                      : 'Fewest reports in this province'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-400">{mostDispersed?.count || 0}</div>
                                  <div className="text-xs text-slate-400">reports</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Distribution Balance Indicator */}
                          <div className="pt-2 border-t border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-300">Distribution Balance</span>
                              <span className={`text-xs font-semibold ${
                                isEvenlyDistributed 
                                  ? 'text-green-400' 
                                  : isModeratelyConcentrated
                                  ? 'text-yellow-400'
                                  : 'text-orange-400'
                              }`}>
                                {coefficientOfVariation}% variance
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                              <div 
                                className={`h-3 rounded-full transition-all ${
                                  isEvenlyDistributed 
                                    ? 'bg-gradient-to-r from-green-500 to-green-400' 
                                    : isModeratelyConcentrated
                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                                    : 'bg-gradient-to-r from-orange-500 to-orange-400'
                                }`}
                                style={{ width: `${Math.min(parseFloat(coefficientOfVariation), 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Even</span>
                              <span className="text-slate-400">Concentrated</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No geographic data available</p>
              </div>
            )}
          </div>

          {/* Map View */}
          {!loading && reports.length > 0 && (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-white text-lg">Reports Map View</CardTitle>
                    <CardDescription className="text-slate-400">
                      Visualize all reports on an interactive map
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapView(!showMapView)}
                    className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {showMapView ? 'Hide Map' : 'Show Map'}
                  </Button>
                </div>
              </CardHeader>
              {showMapView && (
                <CardContent>
                  <div className="h-[600px] w-full rounded-lg overflow-hidden border border-slate-800">
                    <MapContainer
                      center={mapCenterAndBounds.center}
                      zoom={mapCenterAndBounds.zoom}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                      key={`${mapCenterAndBounds.center[0]}-${mapCenterAndBounds.center[1]}-${mapCenterAndBounds.zoom}`}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {mapReady && filteredReports
                        .filter(r => r.latitude && r.longitude)
                        .map((report) => {
                          const icon = createSeverityIcon(report.severity)
                          if (!icon) return null
                          return (
                            <Marker
                              key={report.id}
                              position={[report.latitude!, report.longitude!]}
                              icon={icon}
                            >
                              <Popup
                                autoPan={true}
                                autoPanPadding={[50, 50]}
                                autoPanPaddingTopLeft={[0, 150]}
                                autoPanPaddingBottomRight={[50, 50]}
                                maxWidth={300}
                                closeButton={true}
                                className="leaflet-popup-custom"
                              >
                                <div className="p-3 min-w-[200px] max-w-[280px]">
                                  <h4 className="font-semibold mb-2 text-sm text-slate-900">{report.title}</h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className={`${getSeverityBadgeClassName(report.severity)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                                        {report.severity}
                                      </Badge>
                                      <Badge className={`${getStatusBadgeClassName(report.status)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                                        {report.status}
                                      </Badge>
                                    </div>
                                    <p className="text-slate-600 line-clamp-2">{report.description}</p>
                                    {report.district && (
                                      <p className="text-slate-500 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {report.district}
                                      </p>
                                    )}
                                    <p className="text-slate-500 text-xs">
                                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full mt-2"
                                      onClick={() => handleViewReport(report)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          )
                        })
                        .filter(Boolean)}
                    </MapContainer>
                  </div>
                  <div className="mt-4 flex items-center gap-4 flex-wrap text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>High Severity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Medium Severity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Low Severity</span>
                    </div>
                    <span className="ml-auto">
                      {reports.filter(r => r.latitude && r.longitude).length} reports with location data
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Reports Table with Filters */}
          {!loading && (
            <div ref={reportsTableRef} className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-semibold text-white">Reports Management</h2>
              </div>
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-white text-lg">
                      Reports ({filteredReports.length})
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Review, assign, and resolve reports
                    </CardDescription>
                    {/* Geographic Filter Indicators */}
                    {(filterProvince || filterDistrict || filterSector) && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">Active filters:</span>
                        {filterProvince && (
                          <Badge 
                            variant="secondary" 
                            className="bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30 cursor-pointer"
                            onClick={() => {
                              setFilterProvince(null)
                              setSelectedProvince(null)
                              setFilterDistrict(null)
                              setSelectedDistrict(null)
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Province: {filterProvince}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        )}
                        {filterDistrict && (
                          <Badge 
                            variant="secondary" 
                            className="bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30 cursor-pointer"
                            onClick={() => {
                              setFilterDistrict(null)
                              setSelectedDistrict(null)
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            District: {filterDistrict}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        )}
                        {filterSector && (
                          <Badge 
                            variant="secondary" 
                            className="bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30 cursor-pointer"
                            onClick={() => setFilterSector(null)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Sector: {filterSector}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoAssign}
                      disabled={autoAssigning}
                      className="bg-blue-600/10 border-blue-500/50 text-blue-400 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-300"
                      title="Auto-assign unassigned reports to officers with fewer cases"
                    >
                      <UserCheck className={`h-4 w-4 mr-2 ${autoAssigning ? 'animate-spin' : ''}`} />
                      {autoAssigning ? 'Assigning...' : 'Auto-Assign'}
                    </Button>
                    {selectedReports.size > 0 && (
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm text-slate-400">{selectedReports.size} selected</span>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) handleBulkStatusUpdate(value)
                          }}
                        >
                          <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white h-8">
                            <SelectValue placeholder="Bulk Actions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="triaged">Mark as Triaged</SelectItem>
                            <SelectItem value="assigned">Mark as Assigned</SelectItem>
                            <SelectItem value="in_progress">Mark In Progress</SelectItem>
                            <SelectItem value="resolved">Mark Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportToCSV}
                      className="text-slate-400 hover:text-white"
                      title="Export to CSV"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchReports}
                      className="text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    {(filterProvince || filterDistrict || filterSector || filterStatus || filterType || filterSeverity || searchQuery || dateRange.from || dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="space-y-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <Input
                        placeholder="Search reports by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {showAdvancedSearch ? 'Hide' : 'Advanced'} Search
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowColumnToggle(!showColumnToggle)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                    >
                      <Columns className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                    {filterPresets.length > 0 && (
                      <Select
                        value=""
                        onValueChange={(value) => {
                          const preset = filterPresets.find(p => p.name === value)
                          if (preset) {
                            const filters = preset.filters
                            if (filters.province) setFilterProvince(filters.province)
                            if (filters.district) setFilterDistrict(filters.district)
                            if (filters.status) setFilterStatus(filters.status)
                            if (filters.type) setFilterType(filters.type)
                            if (filters.severity) setFilterSeverity(filters.severity)
                            if (filters.dateRange) setDateRange(filters.dateRange)
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white h-8">
                          <SelectValue placeholder="Filter Presets" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterPresets.map((preset) => (
                            <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const presetName = prompt('Enter preset name:')
                        if (presetName) {
                          const newPreset = {
                            name: presetName,
                            filters: {
                              province: filterProvince,
                              district: filterDistrict,
                              sector: filterSector,
                              status: filterStatus,
                              type: filterType,
                              severity: filterSeverity,
                              dateRange: dateRange,
                            }
                          }
                          setFilterPresets([...filterPresets, newPreset])
                          toast({
                            title: 'Success',
                            description: `Filter preset "${presetName}" saved`,
                          })
                        }
                      }}
                      className="text-slate-400 hover:text-white"
                      title="Save current filters as preset"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Preset
                    </Button>
                  </div>
                  
                  {/* Advanced Search */}
                  {showAdvancedSearch && (
                    <div className="flex items-center gap-4 flex-wrap p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <Input
                          placeholder="Search by reporter email/name..."
                          value={searchReporter}
                          onChange={(e) => setSearchReporter(e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <UserCheck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <Input
                          placeholder="Search by assignee email/name..."
                          value={searchAssignee}
                          onChange={(e) => setSearchAssignee(e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Column Visibility Toggle */}
                  {showColumnToggle && (
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Columns className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Visible Columns</span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'title', label: 'Title' },
                          { key: 'type', label: 'Type' },
                          { key: 'severity', label: 'Severity' },
                          { key: 'status', label: 'Status' },
                          { key: 'assignedTo', label: 'Assigned To' },
                          { key: 'createdAt', label: 'Created' },
                        ].map(col => (
                          <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(col.key)}
                              onChange={(e) => {
                                const newVisible = new Set(visibleColumns)
                                if (e.target.checked) {
                                  newVisible.add(col.key)
                                } else {
                                  newVisible.delete(col.key)
                                }
                                setVisibleColumns(newVisible)
                              }}
                              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
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
                    <Select value={filterType || undefined} onValueChange={(value) => setFilterType(value === 'all' ? '' : value)}>
                      <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white hover:border-slate-600">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Array.from(new Set(reports.map(r => r.type))).map(type => (
                          <SelectItem key={type} value={type}>{getTypeDisplayName(type)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterSeverity || undefined} onValueChange={(value) => setFilterSeverity(value === 'all' ? '' : value)}>
                      <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white hover:border-slate-600">
                        <SelectValue placeholder="All Severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <Input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-[160px] bg-slate-800/50 border-slate-700 text-white hover:border-slate-600 focus:border-slate-600"
                        placeholder="From"
                      />
                      <span className="text-slate-400">to</span>
                      <Input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-[160px] bg-slate-800/50 border-slate-700 text-white hover:border-slate-600 focus:border-slate-600"
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-slate-800/50">
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center justify-center"
                            title="Select all"
                          >
                            {selectedReports.size === paginatedReports.length && paginatedReports.length > 0 ? (
                              <CheckSquare className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </TableHead>
                        {visibleColumns.has('title') && (
                          <TableHead className="text-slate-300">
                            <button
                              onClick={() => handleSort('title')}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              Title
                              {sortColumn === 'title' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {visibleColumns.has('type') && (
                          <TableHead className="text-slate-300">
                            <button
                              onClick={() => handleSort('type')}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              Type
                              {sortColumn === 'type' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {visibleColumns.has('severity') && (
                          <TableHead className="text-slate-300">
                            <button
                              onClick={() => handleSort('severity')}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              Severity
                              {sortColumn === 'severity' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {visibleColumns.has('status') && (
                          <TableHead className="text-slate-300">
                            <button
                              onClick={() => handleSort('status')}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              Status
                              {sortColumn === 'status' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {visibleColumns.has('location') && (
                          <TableHead className="text-slate-300">Location</TableHead>
                        )}
                        {visibleColumns.has('assignedTo') && (
                          <TableHead className="text-slate-300">Assigned To</TableHead>
                        )}
                        {visibleColumns.has('photos') && (
                          <TableHead className="text-slate-300">Photos</TableHead>
                        )}
                        {visibleColumns.has('createdAt') && (
                          <TableHead className="text-slate-300">
                            <button
                              onClick={() => handleSort('createdAt')}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              Created
                              {sortColumn === 'createdAt' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {visibleColumns.has('actions') && (
                          <TableHead className="text-slate-300">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={visibleColumns.size + 1} className="text-center py-8 text-slate-400">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : recentReports.length === 0 ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={visibleColumns.size + 1} className="text-center py-8 text-slate-400">
                          No reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentReports.map((report) => (
                        <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell>
                            <button
                              onClick={() => handleSelectReport(report.id)}
                              className="flex items-center justify-center"
                            >
                              {selectedReports.has(report.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                          </TableCell>
                          {visibleColumns.has('title') && (
                            <TableCell className="font-medium text-white max-w-xs truncate">{report.title}</TableCell>
                          )}
                          {visibleColumns.has('type') && (
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className="border-slate-700 text-slate-300 whitespace-nowrap px-2 py-1 min-w-[80px] text-center inline-block">
                                {getTypeDisplayName(report.type)}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleColumns.has('severity') && (
                            <TableCell>
                              <Badge variant={report.severity === 'high' ? 'destructive' : report.severity === 'medium' ? 'default' : 'secondary'} className="px-2 py-1 min-w-[80px] text-center inline-block">
                                {report.severity}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleColumns.has('status') && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getStatusBadgeClassName(report.status)} border text-xs px-2 py-1 min-w-[80px] text-center inline-block`}>
                                  {report.status}
                                </Badge>
                                {isOverdue(report) && (
                                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.has('location') && (
                            <TableCell className="text-slate-300 text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    if (report.district) {
                                      setFilterDistrict(report.district)
                                      setSelectedDistrict(report.district)
                                    }
                                    if (report.province) {
                                      setFilterProvince(report.province)
                                      setSelectedProvince(report.province)
                                    }
                                  }}
                                  className="hover:text-blue-400 hover:underline text-left max-w-[150px] truncate"
                                  title={`Click to filter by ${formatLocation(report)}`}
                                >
                                  {formatLocation(report)}
                                </button>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.has('assignedTo') && (
                            <TableCell className="text-slate-300 text-sm">
                              {report.currentAssignment?.assignee ? (
                                <span>{report.currentAssignment.assignee.fullName || report.currentAssignment.assignee.email}</span>
                              ) : report.currentAssignment?.organization ? (
                                <span>{report.currentAssignment.organization.name}</span>
                              ) : (
                                <span className="text-slate-500">Unassigned</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.has('photos') && (
                            <TableCell className="text-slate-400 text-sm">
                              {getPhotoCount(report) > 0 ? (
                                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/50 text-xs px-2 py-1">
                                  <Camera className="h-3 w-3 mr-1 inline" />
                                  {getPhotoCount(report)}
                                </Badge>
                              ) : (
                                <span className="text-slate-500 text-xs">No photos</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.has('createdAt') && (
                            <TableCell className="text-slate-400 text-sm">
                              {format(new Date(report.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                          )}
                          {visibleColumns.has('actions') && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-white">
                                  <DropdownMenuItem
                                    onClick={() => handleViewReport(report)}
                                    className="text-blue-400 focus:text-blue-300 focus:bg-slate-800 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {report.status === 'new' && (
                                    <DropdownMenuItem
                                      onClick={() => handleQuickTriage(report)}
                                      disabled={updatingStatus === report.id}
                                      className="text-purple-400 focus:text-purple-300 focus:bg-slate-800 cursor-pointer disabled:opacity-50"
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Mark as Triaged
                                    </DropdownMenuItem>
                                  )}
                                  {(report.status === 'new' || report.status === 'triaged') && (
                                    <DropdownMenuItem
                                      onClick={() => handleQuickAssign(report)}
                                      className="text-orange-400 focus:text-orange-300 focus:bg-slate-800 cursor-pointer"
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Assign Report
                                    </DropdownMenuItem>
                                  )}
                                  {report.status !== 'resolved' && report.status !== 'rejected' && (
                                    <>
                                      {(report.status === 'new' || report.status === 'triaged' || report.status === 'assigned') && (
                                        <DropdownMenuSeparator className="bg-slate-700" />
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleQuickResolve(report)}
                                        disabled={updatingStatus === report.id}
                                        className="text-green-400 focus:text-green-300 focus:bg-slate-800 cursor-pointer disabled:opacity-50"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Resolved
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {sortedReports.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
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
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
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
          )}
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white p-0">
          {selectedReport && (
            <ReportDetailView
              key={`${selectedReport.id}-${reportDetailKey}`}
              reportId={selectedReport.id}
              onUpdate={handleReportUpdated}
              onClose={() => setIsDetailOpen(false)}
              userRole="admin"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Assign Report</DialogTitle>
            <DialogDescription className="text-slate-400">
              Assign this report to an officer or organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Assign to Officer</Label>
              <div className="flex gap-2">
                <Select
                  value={assignData.assigneeId || undefined}
                  onValueChange={(value) => {
                    console.log('Officer selected:', value)
                    setAssignData((prev) => ({ ...prev, assigneeId: value, organizationId: '' }))
                  }}
                  disabled={usersLoading}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1">
                    <SelectValue placeholder={
                      usersLoading 
                        ? "Loading officers..." 
                        : users.length === 0 
                          ? "No officers available" 
                          : "Select an officer"
                    } />
                  </SelectTrigger>
                  <SelectContent className="z-[3000] bg-slate-800 border-slate-700 text-white">
                    {usersLoading ? (
                      <div className="px-2 py-1.5 text-sm text-slate-400">
                        Loading officers...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-slate-400">
                        {usersError || "No officers found. Create officers in the Officers page."}
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem 
                          key={user.id} 
                          value={user.id}
                          className="text-white hover:bg-slate-700 focus:bg-slate-700"
                        >
                          {user.fullName || user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {assignData.assigneeId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAssignData((prev) => ({ ...prev, assigneeId: '' }))}
                    className="h-10 w-10 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-slate-400">OR</div>

            <div className="space-y-2">
              <Label className="text-slate-300">Assign to Organization</Label>
              <div className="flex gap-2">
                <Select
                  value={assignData.organizationId || undefined}
                  onValueChange={(value) => setAssignData((prev) => ({ ...prev, organizationId: value, assigneeId: '' }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignData.organizationId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAssignData((prev) => ({ ...prev, organizationId: '' }))}
                    className="h-10 w-10 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Due Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={assignData.dueAt}
                onChange={(e) => setAssignData((prev) => ({ ...prev, dueAt: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsAssignDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
