'use client'

import { useState, useEffect } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Save, Users, RefreshCw, CheckCircle2, Key, Lock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { apiAutoAssignReports, apiMe, apiUpdateUserPassword } from '@/lib/api'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    systemName: 'CIRA',
    defaultSLA: '7',
    emailNotifications: true,
    autoAssign: false,
  })
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [lastAutoAssignResult, setLastAutoAssignResult] = useState<{ assigned: number; timestamp: Date } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const { user } = await apiMe()
      setCurrentUserId(user.id)
    } catch (error) {
      console.error('Failed to fetch current user:', error)
    }
  }

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved successfully.',
    })
  }

  const handleChangePassword = async () => {
    if (!currentUserId) {
      toast({
        title: 'Error',
        description: 'User ID not found. Please refresh the page.',
        variant: 'destructive',
      })
      return
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'New password must be at least 8 characters long',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'New password and confirm password do not match',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await apiUpdateUserPassword(currentUserId, passwordData.newPassword)
      console.log('Password update response:', response)
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error('Failed to change password:', error)
      const errorMessage = error?.message || error?.error?.message || 'Failed to change password. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true)
    try {
      const result = await apiAutoAssignReports()
      setLastAutoAssignResult({
        assigned: result.assigned,
        timestamp: new Date(),
      })
      toast({
        title: 'Auto-Assignment Complete',
        description: `Successfully assigned ${result.assigned} report${result.assigned !== 1 ? 's' : ''} to available officers.`,
      })
    } catch (error: any) {
      console.error('Failed to auto-assign reports:', error)
      toast({
        title: 'Auto-Assignment Failed',
        description: error.message || 'Failed to auto-assign reports. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAutoAssigning(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="admin" userName="Admin User" userRole="admin" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-slate-400">Configure system settings and preferences</p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">System Settings</CardTitle>
              <CardDescription className="text-slate-400">Configure general system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemName" className="text-slate-300">System Name</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultSLA" className="text-slate-300">Default SLA (days)</Label>
                <Input
                  id="defaultSLA"
                  type="number"
                  value={settings.defaultSLA}
                  onChange={(e) => setSettings({ ...settings, defaultSLA: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notification Settings</CardTitle>
              <CardDescription className="text-slate-400">Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Email Notifications</Label>
                  <p className="text-sm text-slate-400">Receive email notifications for important events</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Auto-Assign Reports</Label>
                  <p className="text-sm text-slate-400">Automatically assign reports to available officers</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAssign}
                  onChange={(e) => setSettings({ ...settings, autoAssign: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-400" />
                Change Password
              </CardTitle>
              <CardDescription className="text-slate-400">
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-300">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400">Password must be at least 8 characters long</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword || 
                  !passwordData.newPassword || 
                  !passwordData.confirmPassword || 
                  passwordData.newPassword.length < 8 ||
                  passwordData.newPassword !== passwordData.confirmPassword
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
              {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Auto-Assignment
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manually trigger auto-assignment of unassigned reports to available officers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-300 text-base">Auto-Assign Reports</Label>
                    <p className="text-sm text-slate-400 mt-1">
                      Assigns unassigned reports (new or triaged) to officers without current assignments.
                      Reports are distributed evenly among available officers.
                    </p>
                  </div>
                </div>
                {lastAutoAssignResult && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-green-400 font-medium">
                        Last run: {lastAutoAssignResult.assigned} report{lastAutoAssignResult.assigned !== 1 ? 's' : ''} assigned
                      </p>
                      <p className="text-xs text-green-400/70 mt-0.5">
                        {lastAutoAssignResult.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleAutoAssign}
                  disabled={isAutoAssigning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAutoAssigning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Assigning Reports...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Auto-Assign Reports Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
