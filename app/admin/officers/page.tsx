'use client'

import { useState, useEffect } from 'react'
import { apiGetUsers, apiCreateUser, apiUpdateUserPassword, type User, type CreateUserPayload } from '@/lib/api'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Users, RefreshCw, Search, Mail, Phone, UserPlus, Key } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newOfficer, setNewOfficer] = useState<CreateUserPayload>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'officer',
  })
  const [passwordUpdateUserId, setPasswordUpdateUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    fetchOfficers()
  }, [])

  const fetchOfficers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch both officers and admins
      const [officersResponse, adminsResponse] = await Promise.all([
        apiGetUsers('officer'),
        apiGetUsers('admin'),
      ])
      setOfficers([...officersResponse.data, ...adminsResponse.data])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOfficer = async () => {
    if (!newOfficer.email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }
    if (!newOfficer.password || newOfficer.password.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      await apiCreateUser(newOfficer)
      toast({
        title: 'Success',
        description: 'Officer created successfully',
      })
      setIsCreateDialogOpen(false)
      setNewOfficer({ email: '', password: '', fullName: '', phone: '', role: 'officer' })
      fetchOfficers()
    } catch (error: any) {
      console.error('Failed to create officer:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create officer',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!passwordUpdateUserId) return
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingPassword(true)
    try {
      await apiUpdateUserPassword(passwordUpdateUserId, newPassword)
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      })
      setPasswordUpdateUserId(null)
      setNewPassword('')
    } catch (error: any) {
      console.error('Failed to update password:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const filteredOfficers = officers.filter(officer => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        officer.email.toLowerCase().includes(query) ||
        (officer.fullName && officer.fullName.toLowerCase().includes(query)) ||
        (officer.phone && officer.phone.toLowerCase().includes(query))
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
              <Users className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Officers Management
                </h1>
                <p className="text-sm text-slate-400">Manage officers and their assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Officer
              </Button>
              <Button 
                onClick={fetchOfficers} 
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
                  <CardTitle className="text-white text-lg">Officers ({filteredOfficers.length})</CardTitle>
                  <CardDescription className="text-slate-400">View and manage all officers</CardDescription>
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
                    <div className="text-2xl font-bold text-white">{officers.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Total Officers</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-white">
                      {officers.filter(o => o.fullName).length}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">With Profile</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-white">
                      {officers.filter(o => o.phone).length}
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
                      <TableHead className="text-slate-300">Officer</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Phone</TableHead>
                      <TableHead className="text-slate-300">Role</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredOfficers.length === 0 ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          No officers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOfficers.map((officer) => (
                        <TableRow key={officer.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                                {officer.fullName ? officer.fullName[0].toUpperCase() : officer.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {officer.fullName || 'No name'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {officer.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {officer.phone ? (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Phone className="h-4 w-4 text-slate-400" />
                                {officer.phone}
                              </div>
                            ) : (
                              <span className="text-slate-500">No phone</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-700 text-slate-300">
                              {officer.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPasswordUpdateUserId(officer.id)
                                setNewPassword('')
                              }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Set Password
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

      {/* Create Officer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Create New Officer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new officer to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@example.com"
                value={newOfficer.email}
                onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={newOfficer.password || ''}
                onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
              <p className="text-xs text-slate-400">Password must be at least 8 characters long</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={newOfficer.fullName || ''}
                onChange={(e) => setNewOfficer({ ...newOfficer, fullName: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+250 788 123 456"
                value={newOfficer.phone || ''}
                onChange={(e) => setNewOfficer({ ...newOfficer, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewOfficer({ email: '', password: '', fullName: '', phone: '', role: 'officer' })
              }}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOfficer}
              disabled={isCreating || !newOfficer.email || !newOfficer.password || newOfficer.password.length < 8}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? 'Creating...' : 'Create Officer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog open={passwordUpdateUserId !== null} onOpenChange={(open) => {
        if (!open) {
          setPasswordUpdateUserId(null)
          setNewPassword('')
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set a new password for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
              <p className="text-xs text-slate-400">Password must be at least 8 characters long</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPasswordUpdateUserId(null)
                setNewPassword('')
              }}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || !newPassword || newPassword.length < 8}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
