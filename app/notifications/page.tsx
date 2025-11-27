'use client'

import { useState } from 'react'
import { CheckCheck, Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AdminSidebar } from '@/components/admin-sidebar'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
    refresh,
  } = useNotifications()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'report_created':
        return '📄'
      case 'report_status_changed':
        return '🔄'
      case 'report_commented':
        return '💬'
      case 'report_assigned':
        return '👤'
      default:
        return '🔔'
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <AdminSidebar variant="admin" userName="Admin User" userRole="admin" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur-sm px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-sm text-slate-400">
                  {unreadCount > 0 
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                    : 'All notifications'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                disabled={refreshing}
                className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    All Notifications ({notifications.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    View and manage your notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400">No notifications</p>
                  <p className="text-sm text-slate-500 mt-2">
                    You'll see notifications here when there are updates to your reports
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-slate-800">
                    {notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={
                          notification.data?.reportId
                            ? `/report/${notification.data.reportId}`
                            : '#'
                        }
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id)
                          }
                        }}
                      >
                        <div
                          className={cn(
                            'p-4 hover:bg-slate-800/50 transition-colors cursor-pointer',
                            !notification.read && 'bg-slate-800/30 border-l-2 border-l-blue-500'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl mt-1">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3
                                  className={cn(
                                    'font-semibold text-white',
                                    !notification.read && 'font-bold'
                                  )}
                                >
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                )}
                              </div>
                              <p className="text-sm text-slate-400 mb-2">
                                {notification.body}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

