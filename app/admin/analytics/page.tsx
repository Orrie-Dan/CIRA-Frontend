'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { HeatmapView } from '@/components/heatmap-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiGetTrendData, apiExportReports, apiMe, type TrendData } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  PieChart, 
  MapPin, 
  Download, 
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
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
  LineChart,
  Line,
} from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function AnalyticsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('heatmap')
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(false)
  const [trendPeriod, setTrendPeriod] = useState<'3months' | '6months' | '12months' | 'custom'>('12months')
  const [exporting, setExporting] = useState(false)
  const [authError, setAuthError] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await apiMe()
        setAuthError(false)
      } catch (error: any) {
        console.error('Not authenticated:', error)
        setAuthError(true)
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view analytics',
          variant: 'destructive',
        })
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (activeTab === 'trends') {
      fetchTrendData()
    }
  }, [activeTab, trendPeriod])

  const fetchTrendData = async () => {
    if (authError) return
    setLoading(true)
    try {
      console.log('Fetching trend data with period:', trendPeriod)
      const data = await apiGetTrendData({ period: trendPeriod })
      console.log('Trend data response:', data)
      setTrendData(data)
    } catch (error: any) {
      console.error('Failed to fetch trend data:', error)
      setTrendData(null)
      if (error.message?.includes('Unauthorized') || error.message?.includes('Not authenticated') || error.message?.includes('401')) {
        setAuthError(true)
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view analytics',
          variant: 'destructive',
        })
        router.push('/login')
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load trend data',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }


  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const blob = await apiExportReports({ format })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reports_${format}_${format(new Date(), 'yyyy-MM-dd')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Success',
        description: `Reports exported successfully as ${format.toUpperCase()}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export reports',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  // Calculate insights from trendData
  const insights = useMemo(() => {
    if (!trendData) return null
    
    const totalReportsData = formatTotalReportsChart(trendData)
    if (totalReportsData.length === 0) return null
    
    const lastMonth = totalReportsData[totalReportsData.length - 1]
    const prevMonth = totalReportsData[totalReportsData.length - 2]
    
    const totalReports = lastMonth?.total || 0
    const prevTotalReports = prevMonth?.total || 0
    const reportsChange = prevMonth && prevTotalReports > 0
      ? ((totalReports - prevTotalReports) / prevTotalReports) * 100 
      : null
    
    // Calculate resolution rate
    const resolvedData = trendData.statusTrends.find(s => s.status === 'resolved')
    const lastResolved = resolvedData?.data[resolvedData.data.length - 1]?.count || 0
    const prevResolved = resolvedData?.data[resolvedData.data.length - 2]?.count || 0
    const resolutionRate = totalReports > 0 ? (lastResolved / totalReports) * 100 : 0
    const resolutionChange = prevResolved > 0 
      ? ((lastResolved - prevResolved) / prevResolved) * 100 
      : null
    
    // Average resolution time
    const lastResolutionTime = trendData.resolutionTimeTrends[trendData.resolutionTimeTrends.length - 1]
    const prevResolutionTime = trendData.resolutionTimeTrends[trendData.resolutionTimeTrends.length - 2]
    const avgResolutionDays = lastResolutionTime ? lastResolutionTime.avgHours / 24 : 0
    const resolutionTimeChange = prevResolutionTime && lastResolutionTime && prevResolutionTime.avgHours > 0
      ? ((lastResolutionTime.avgHours - prevResolutionTime.avgHours) / prevResolutionTime.avgHours) * 100
      : null
    
    return {
      totalReports,
      reportsChange,
      resolutionRate,
      resolutionChange,
      avgResolutionDays,
      resolutionTimeChange,
    }
  }, [trendData])

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Analytics & Reporting
              </h1>
              <p className="text-sm text-slate-400 mt-1">Comprehensive analytics and data visualization</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {authError ? (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
                <p className="text-slate-400 mb-6">Please log in to view analytics data</p>
                <Button onClick={() => router.push('/login')}>
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="heatmap" className="data-[state=active]:bg-slate-700">
                <MapPin className="h-4 w-4 mr-2" />
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="trends" className="data-[state=active]:bg-slate-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heatmap" className="space-y-6">
              <HeatmapView />
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Trend Analysis</CardTitle>
                      <CardDescription className="text-slate-400">
                        Analyze trends over time
                      </CardDescription>
                    </div>
                    <Select value={trendPeriod} onValueChange={(value: any) => setTrendPeriod(value)}>
                      <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3months">Last 3 Months</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="12months">Last 12 Months</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : trendData ? (
                    <div className="space-y-8">
                      {/* Key Insights Section */}
                      {insights && (
                        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-700/50">
                          <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-blue-400" />
                              Key Insights
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {insights.reportsChange !== null && insights.reportsChange > 20 && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-yellow-400">Rapid Growth Detected</div>
                                    <div className="text-sm text-slate-300">
                                      Reports increased by {insights.reportsChange.toFixed(1)}% this month. Consider allocating more resources.
                                    </div>
                                  </div>
                                </div>
                              )}
                              {insights.resolutionRate < 50 && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-red-400">Low Resolution Rate</div>
                                    <div className="text-sm text-slate-300">
                                      Only {insights.resolutionRate.toFixed(1)}% of reports are resolved. Review assignment process.
                                    </div>
                                  </div>
                                </div>
                              )}
                              {insights.avgResolutionDays > 7 && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                  <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-orange-400">SLA Risk</div>
                                    <div className="text-sm text-slate-300">
                                      Average resolution time is {insights.avgResolutionDays.toFixed(1)} days, exceeding 7-day SLA target.
                                    </div>
                                  </div>
                                </div>
                              )}
                              {insights.resolutionRate >= 80 && insights.avgResolutionDays <= 7 && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-green-400">Performance On Target</div>
                                    <div className="text-sm text-slate-300">
                                      Resolution rate at {insights.resolutionRate.toFixed(1)}% and average resolution time of {insights.avgResolutionDays.toFixed(1)} days are within targets.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Enhanced Summary Stats with Trends */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm text-slate-400">Total Reports</div>
                              {insights?.reportsChange !== null && insights?.reportsChange !== undefined && (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${
                                  insights.reportsChange >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {insights.reportsChange >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {insights.reportsChange >= 0 ? '+' : ''}{insights.reportsChange.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-white">{insights?.totalReports || 0}</div>
                            <div className="text-xs text-slate-500 mt-1">vs previous month</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm text-slate-400">Resolution Rate</div>
                              {insights?.resolutionChange !== null && insights?.resolutionChange !== undefined && (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${
                                  insights.resolutionChange >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {insights.resolutionChange >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {insights.resolutionChange >= 0 ? '+' : ''}{insights.resolutionChange.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-white">{insights?.resolutionRate.toFixed(1) || 0}%</div>
                            <div className="text-xs text-slate-500 mt-1">of reports resolved</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm text-slate-400">Avg Resolution Time</div>
                              {insights?.resolutionTimeChange !== null && insights?.resolutionTimeChange !== undefined && (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${
                                  insights.resolutionTimeChange <= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {insights.resolutionTimeChange <= 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3" />
                                  )}
                                  {insights.resolutionTimeChange >= 0 ? '+' : ''}{insights.resolutionTimeChange.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-white">{insights?.avgResolutionDays.toFixed(1) || 0} days</div>
                            <div className="text-xs text-slate-500 mt-1">average time to resolve</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Reports Over Time - Total */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Total Reports Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsBarChart data={formatTotalReportsChart(trendData)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9ca3af"
                              tickFormatter={(value) => formatMonthLabel(value)}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#e2e8f0' }}
                              labelFormatter={(value) => formatMonthLabel(value)}
                            />
                            <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Total Reports" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Category Trends - Top 5 */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Top 5 Categories Over Time</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={formatTrendDataForChart(getTopCategories(trendData.categoryTrends, 5))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9ca3af"
                              tickFormatter={(value) => formatMonthLabel(value)}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#e2e8f0' }}
                              labelFormatter={(value) => formatMonthLabel(value)}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="line"
                            />
                            {getTopCategories(trendData.categoryTrends, 5).map((trend, index) => (
                              <Line
                                key={trend.type}
                                type="monotone"
                                dataKey={trend.type}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2.5}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                name={formatCategoryName(trend.type)}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Status Trends - Stacked Area */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Status Distribution Over Time</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <RechartsBarChart data={formatTrendDataForChart(trendData.statusTrends, 'status')}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9ca3af"
                              tickFormatter={(value) => formatMonthLabel(value)}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#e2e8f0' }}
                              labelFormatter={(value) => formatMonthLabel(value)}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                            />
                            {trendData.statusTrends.map((trend, index) => (
                              <Bar
                                key={trend.status}
                                dataKey={trend.status}
                                stackId="status"
                                fill={getStatusColor(trend.status)}
                                name={formatStatusName(trend.status)}
                              />
                            ))}
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Resolution Time Trends */}
                      {trendData.resolutionTimeTrends.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-4">Average Resolution Time by Month</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData.resolutionTimeTrends.map(t => ({
                              ...t,
                              month: formatMonthLabel(t.month),
                              days: t.avgHours / 24
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis 
                                dataKey="month" 
                                stroke="#9ca3af"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis 
                                stroke="#9ca3af" 
                                label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#e2e8f0' }}
                                formatter={(value: number) => [`${value.toFixed(1)} days`, 'Avg Resolution Time']}
                              />
                              <Line
                                type="monotone"
                                dataKey="days"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ r: 5, fill: '#10b981' }}
                                activeDot={{ r: 7 }}
                                name="Resolution Time"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Category Performance Table */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Category Performance</h3>
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                          <CardContent className="pt-6">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-700">
                                    <TableHead className="text-slate-300">Category</TableHead>
                                    <TableHead className="text-slate-300">Total Reports</TableHead>
                                    <TableHead className="text-slate-300">This Month</TableHead>
                                    <TableHead className="text-slate-300">Last Month</TableHead>
                                    <TableHead className="text-slate-300">Change</TableHead>
                                    <TableHead className="text-slate-300">Trend</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {trendData.categoryTrends
                                    .map((category) => {
                                      const thisMonth = category.data[category.data.length - 1]?.count || 0
                                      const lastMonth = category.data[category.data.length - 2]?.count || 0
                                      const total = category.data.reduce((sum, d) => sum + d.count, 0)
                                      const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0)
                                      
                                      return { category, thisMonth, lastMonth, total, change }
                                    })
                                    .sort((a, b) => b.total - a.total)
                                    .map(({ category, thisMonth, lastMonth, total, change }) => (
                                      <TableRow key={category.type} className="border-slate-700">
                                        <TableCell className="font-medium text-white">{formatCategoryName(category.type)}</TableCell>
                                        <TableCell className="text-slate-300">{total}</TableCell>
                                        <TableCell className="text-slate-300">{thisMonth}</TableCell>
                                        <TableCell className="text-slate-300">{lastMonth || '-'}</TableCell>
                                        <TableCell className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
                                          {lastMonth > 0 ? (
                                            <>
                                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                            </>
                                          ) : (
                                            thisMonth > 0 ? 'New' : '-'
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {lastMonth > 0 && change !== 0 ? (
                                            change >= 0 ? (
                                              <TrendingUp className="h-4 w-4 text-green-400" />
                                            ) : (
                                              <TrendingDown className="h-4 w-4 text-red-400" />
                                            )
                                          ) : (
                                            <span className="text-slate-500">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">No trend data available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to format trend data for chart
function formatTrendDataForChart(
  trends: Array<{ type?: string; status?: string; data: Array<{ month: string; count: number }> }>,
  key: 'type' | 'status' = 'type'
): Array<Record<string, any>> {
  const allMonths = new Set<string>()
  trends.forEach((trend) => {
    trend.data.forEach((item) => allMonths.add(item.month))
  })

  const sortedMonths = Array.from(allMonths).sort()

  return sortedMonths.map((month) => {
    const entry: Record<string, any> = { month }
    trends.forEach((trend) => {
      const value = trend.data.find((d) => d.month === month)?.count || 0
      entry[key === 'type' ? trend.type! : trend.status!] = value
    })
    return entry
  })
}

// Helper to get top N categories by total count
function getTopCategories(
  categoryTrends: Array<{ type: string; data: Array<{ month: string; count: number }> }>,
  topN: number
): Array<{ type: string; data: Array<{ month: string; count: number }> }> {
  // Calculate total count for each category
  const categoryTotals = categoryTrends.map(trend => ({
    trend,
    total: trend.data.reduce((sum, item) => sum + item.count, 0)
  }))
  
  // Sort by total and take top N
  return categoryTotals
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map(item => item.trend)
}

// Helper to format total reports chart
function formatTotalReportsChart(trendData: TrendData): Array<{ month: string; total: number }> {
  const allMonths = new Set<string>()
  
  // Get all months from category trends
  trendData.categoryTrends.forEach(trend => {
    trend.data.forEach(item => allMonths.add(item.month))
  })
  
  const sortedMonths = Array.from(allMonths).sort()
  
  return sortedMonths.map(month => {
    const total = trendData.categoryTrends.reduce((sum, trend) => {
      const count = trend.data.find(d => d.month === month)?.count || 0
      return sum + count
    }, 0)
    return { month, total }
  })
}

// Helper to format month label (e.g., "2024-01" -> "Jan 2024")
function formatMonthLabel(monthKey: string): string {
  try {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return monthKey
  }
}

// Helper to format category name
function formatCategoryName(type: string): string {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper to format status name
function formatStatusName(status: string): string {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper to get status color
function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    new: '#3b82f6',        // blue
    triaged: '#8b5cf6',    // purple
    assigned: '#f59e0b',    // amber
    in_progress: '#06b6d4', // cyan
    resolved: '#10b981',    // green
    rejected: '#ef4444',   // red
  }
  return statusColors[status] || '#6b7280'
}
