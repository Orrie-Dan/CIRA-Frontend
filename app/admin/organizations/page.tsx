'use client'

import { useState, useEffect } from 'react'
import { apiGetOrganizations, type Organization } from '@/lib/api'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, RefreshCw, Search, Mail, Phone } from 'lucide-react'

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGetOrganizations()
      setOrganizations(response.data)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organizations'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrganizations = organizations.filter(org => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        org.name.toLowerCase().includes(query) ||
        (org.contactEmail && org.contactEmail.toLowerCase().includes(query)) ||
        (org.contactPhone && org.contactPhone.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="admin" userName="Admin User" userRole="admin" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Organizations Management
                </h1>
                <p className="text-sm text-slate-400">Manage organizations and their assignments</p>
              </div>
            </div>
            <Button 
              onClick={fetchOrganizations} 
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

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg">Organizations ({filteredOrganizations.length})</CardTitle>
                  <CardDescription className="text-slate-400">View and manage all organizations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
                />
              </div>

              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-white">{organizations.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Total Organizations</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-white">
                      {organizations.filter(o => o.contactEmail).length}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">With Email</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-white">
                      {organizations.filter(o => o.contactPhone).length}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">With Phone</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <div className="rounded-md border border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-300">Organization</TableHead>
                      <TableHead className="text-slate-300">Contact Email</TableHead>
                      <TableHead className="text-slate-300">Contact Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredOrganizations.length === 0 ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                          No organizations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrganizations.map((org) => (
                        <TableRow key={org.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                                {org.name[0].toUpperCase()}
                              </div>
                              <div className="font-medium text-white">{org.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {org.contactEmail ? (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Mail className="h-4 w-4 text-slate-400" />
                                {org.contactEmail}
                              </div>
                            ) : (
                              <span className="text-slate-500">No email</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {org.contactPhone ? (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Phone className="h-4 w-4 text-slate-400" />
                                {org.contactPhone}
                              </div>
                            ) : (
                              <span className="text-slate-500">No phone</span>
                            )}
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
  )
}
