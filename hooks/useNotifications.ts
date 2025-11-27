'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  apiGetNotifications,
  apiGetUnreadCount,
  apiMarkNotificationAsRead,
  apiMarkAllNotificationsAsRead,
  type Notification,
} from '@/lib/notifications'

const POLLING_INTERVAL = 30000 // 30 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingIntervalRef = useRef<number | null>(null)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGetNotifications({
        limit: 50,
        offset: 0,
        unreadOnly,
      })
      setNotifications(response.data)
    } catch (err: any) {
      // Don't set error for authentication issues - user might not be logged in
      if (err.message === 'Not authenticated') {
        setNotifications([])
        setUnreadCount(0)
        return
      }
      setError(err.message || 'Failed to fetch notifications')
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiGetUnreadCount()
      setUnreadCount(response.count)
    } catch (err: any) {
      // Don't log errors for authentication issues - user might not be logged in
      if (err.message === 'Not authenticated') {
        setUnreadCount(0)
        return
      }
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiMarkNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      await fetchUnreadCount()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      throw err
    }
  }, [fetchUnreadCount])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiMarkAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      throw err
    }
  }, [])

  // Start polling (same approach as mobile)
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Always use polling (like mobile) - more reliable than SSE
    pollingIntervalRef.current = setInterval(() => {
      fetchUnreadCount()
      fetchNotifications(true) // Only fetch unread
    }, POLLING_INTERVAL)
  }, [fetchNotifications, fetchUnreadCount])

  // Initialize notifications
  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
    startPolling()

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [fetchNotifications, fetchUnreadCount, startPolling])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh: () => {
      fetchNotifications()
      fetchUnreadCount()
    },
  }
}

