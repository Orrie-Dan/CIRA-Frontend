'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function OfficerSettingsPage() {
  const [settings, setSettings] = useState({
    fullName: 'Officer User',
    email: 'officer@example.com',
    phone: '',
    emailNotifications: true,
    pushNotifications: false,
  })

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved successfully.',
    })
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="officer" userName="Officer User" userRole="officer" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-slate-400">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-slate-400">Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                <Input
                  id="fullName"
                  value={settings.fullName}
                  onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
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
                  <p className="text-sm text-slate-400">Receive email notifications for assigned reports</p>
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
                  <Label className="text-slate-300">Push Notifications</Label>
                  <p className="text-sm text-slate-400">Receive push notifications on mobile devices</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500"
                />
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
