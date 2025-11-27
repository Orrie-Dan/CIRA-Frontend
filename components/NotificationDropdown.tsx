'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationBadge } from './NotificationBadge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotifications()
  const [open, setOpen] = useState(false)

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    setOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <NotificationBadge count={unreadCount} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex flex-col items-start p-3 cursor-pointer',
                    !notification.read && 'bg-muted/50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  asChild
                >
                  <Link
                    href={
                      notification.data?.reportId
                        ? `/report/${notification.data.reportId}`
                        : '#'
                    }
                  >
                    <div className="flex items-start w-full gap-2">
                      <span className="text-lg mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              !notification.read && 'font-semibold'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <Link href="/notifications">
              <DropdownMenuItem className="text-center justify-center">
                View all notifications
              </DropdownMenuItem>
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

