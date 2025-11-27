const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'

// Helper to get token from localStorage
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// Helper to get headers with Authorization if token exists
function getAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export interface Notification {
  id: string
  type: 'report_created' | 'report_status_changed' | 'report_commented' | 'report_assigned'
  title: string
  body: string
  data: {
    reportId?: string
    reportTitle?: string
    status?: string
    commentId?: string
    assigneeId?: string
    organizationId?: string
  }
  read: boolean
  createdAt: string
}

export interface NotificationListResponse {
  data: Notification[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export async function apiGetNotifications(params?: {
  limit?: number
  offset?: number
  unreadOnly?: boolean
}): Promise<NotificationListResponse> {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())
  if (params?.unreadOnly) queryParams.set('unreadOnly', 'true')

  const res = await fetch(`${API_BASE}/notifications?${queryParams}`, {
    method: 'GET',
    headers: getAuthHeaders(), // Use getAuthHeaders() to include Authorization header
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to fetch notifications')
  }

  return res.json()
}

export async function apiGetUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/notifications/unread-count`, {
    method: 'GET',
    headers: getAuthHeaders(), // Use getAuthHeaders() to include Authorization header
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to fetch unread count')
  }

  return res.json()
}

export async function apiMarkNotificationAsRead(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(), // Use getAuthHeaders() to include Authorization header
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to mark notification as read')
  }

  return res.json()
}

export async function apiMarkAllNotificationsAsRead(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: getAuthHeaders(), // Use getAuthHeaders() to include Authorization header
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to mark all notifications as read')
  }

  return res.json()
}

// SSE connection manager
export class NotificationSSE {
  private eventSource: EventSource | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 5000
  private onNotification: ((notification: Notification) => void) | null = null
  private onError: ((error: Event) => void) | null = null

  connect(onNotification: (notification: Notification) => void, onError?: (error: Event) => void) {
    this.onNotification = onNotification
    this.onError = onError || null

    const apiBase = API_BASE
    
    // Get token from localStorage (EventSource can't send custom headers)
    // Server supports token in query string for SSE authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    
    // Build URL with token in query string (server supports this for SSE)
    let sseUrl = `${apiBase}/notifications/stream`
    if (token) {
      sseUrl += `?token=${encodeURIComponent(token)}`
    }

    // Close existing connection
    this.disconnect()

    try {
      // Note: EventSource uses cookies automatically with credentials
      // But we also send token in query string as primary auth method
      this.eventSource = new EventSource(sseUrl, { withCredentials: true })

      this.eventSource.onopen = () => {
        console.log('SSE connection opened')
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification' && this.onNotification) {
            this.onNotification(data.data)
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      this.eventSource.onerror = (error) => {
        // Only log if there's actual error information to avoid noise
        // Event type doesn't have 'message' property, only 'type'
        if (error && error.type) {
          console.error('SSE connection error:', error)
        }
        if (this.onError) {
          this.onError(error)
        }
        this.scheduleReconnect()
      }
    } catch (err) {
      console.error('Failed to create SSE connection:', err)
      if (this.onError) {
        this.onError(err as Event)
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.onNotification) {
        this.connect(this.onNotification, this.onError || undefined)
      }
    }, this.reconnectDelay) as ReturnType<typeof setTimeout>
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}

