export interface ApiReport {
  id: string
  title: string
  description: string
  type: 'roads' | 'bridges' | 'water' | 'power' | 'sanitation' | 'telecom' | 'public_building' | 'pothole' | 'streetlight' | 'sidewalk' | 'drainage' | 'other'
  severity: 'low' | 'medium' | 'high'
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'rejected'
  latitude: number
  longitude: number
  addressText?: string | null
  province?: string | null
  district?: string | null
  sector?: string | null
  createdAt: string
}

export interface ApiListResponse {
  data: ApiReport[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export interface CreateReportPayload {
  title: string
  description: string
  type: 'roads' | 'bridges' | 'water' | 'power' | 'sanitation' | 'telecom' | 'public_building' | 'pothole' | 'streetlight' | 'sidewalk' | 'drainage' | 'other'
  severity: 'low' | 'medium' | 'high'
  latitude: number
  longitude: number
  addressText?: string
  province?: string
  district?: string
  sector?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com'

// Token storage helpers
const TOKEN_KEY = 'auth_token'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
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

// Auth helpers
export interface LoginResponse {
  user: User
  token: string
}

export async function apiRegister(
  email: string,
  password: string,
  fullName?: string,
  phone?: string
): Promise<LoginResponse & { requiresVerification?: boolean; message?: string; otp?: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, fullName, phone }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Registration failed' } }))
    const apiError = err.error || {}
    let errorMessage = apiError.message || 'Registration failed'
    
    // Provide specific error messages based on error code
    if (apiError.code === 'USER_ALREADY_EXISTS' || apiError.code === 'DUPLICATE_ENTRY') {
      errorMessage = 'An account with this email already exists. Please use a different email or try logging in.'
    } else if (apiError.code === 'VALIDATION_ERROR') {
      const details = apiError.details
      if (details?.fieldErrors) {
        const fieldErrors = Object.entries(details.fieldErrors)
          .map(([field, errors]: [string, any]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('\n')
        errorMessage = `Validation failed:\n${fieldErrors}`
      } else {
        errorMessage = 'Please check your information and try again.'
      }
    } else if (apiError.code === 'DATABASE_ERROR') {
      errorMessage = 'Database connection failed. Please try again later.'
    } else if (apiError.code === 'REGISTRATION_FAILED') {
      errorMessage = apiError.message || 'Registration failed. Please try again.'
    }
    
    throw new Error(errorMessage)
  }
  const data = await res.json()
  // Store the token if present (may not be present if verification is required)
  if (data.token) {
    setToken(data.token)
  }
  return data
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Login failed' } }))
    const apiError = err.error || {}
    let errorMessage = apiError.message || 'Login failed'
    
    // Provide specific error messages
    if (apiError.code === 'INVALID_CREDENTIALS') {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.'
    } else if (apiError.code === 'OAUTH_ONLY_ACCOUNT') {
      errorMessage = 'This account was created with social login. Please use Google or Apple sign-in to access your account.'
    } else if (apiError.code === 'VALIDATION_ERROR') {
      errorMessage = 'Please check your email and password format.'
    }
    
    throw new Error(errorMessage)
  }
  const data = await res.json()
  // Store the token from the response
  if (data.token) {
    setToken(data.token)
  }
  return data
}

export async function apiMe(): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include', // Keep for cookie fallback
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Unauthorized' } }))
    throw new Error(err.error?.message || 'Unauthorized')
  }
  return res.json()
}

export async function apiLogout(): Promise<void> {
  clearToken()
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    // Best-effort: don't throw; user may already be logged out
    return
  }
}

export async function apiLoginWithGoogle(idToken: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Google login failed' } }))
    throw new Error(err.error?.message || 'Google login failed')
  }
  const data = await res.json()
  // Store the token from the response
  if (data.token) {
    setToken(data.token)
  }
  return data
}

export async function apiLoginWithApple(idToken: string, fullName?: { givenName?: string; familyName?: string }): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken, fullName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Apple login failed' } }))
    throw new Error(err.error?.message || 'Apple login failed')
  }
  const data = await res.json()
  // Store the token from the response
  if (data.token) {
    setToken(data.token)
  }
  return data
}

// QC Slip types and API
export interface QcSlip {
  id: string
  reportId: string
  officerId: string
  workSummary: string
  photos: string[]
  approved: boolean
  approvedBy?: string | null
  approvedAt?: string | null
  createdAt: string
  officer?: User
  approver?: User | null
  report?: {
    id: string
    title: string
    reporterId?: string | null
  }
}

export interface CreateQcSlipPayload {
  reportId: string
  workSummary: string
  photos?: string[]
}

export async function apiCreateQcSlip(payload: CreateQcSlipPayload): Promise<{ qcSlip: QcSlip }> {
  const res = await fetch(`${API_BASE}/qc-slip`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to create QC slip' } }))
    throw new Error(err.error?.message || 'Failed to create QC slip')
  }
  return res.json()
}

export async function apiGetQcSlip(reportId: string): Promise<{ qcSlip: QcSlip }> {
  const res = await fetch(`${API_BASE}/qc-slip/report/${reportId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'QC slip not found' } }))
    throw new Error(err.error?.message || 'QC slip not found')
  }
  return res.json()
}

export async function apiApproveQcSlip(qcSlipId: string, approved: boolean): Promise<{ qcSlip: QcSlip }> {
  const res = await fetch(`${API_BASE}/qc-slip/${qcSlipId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ approved }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to approve QC slip' } }))
    throw new Error(err.error?.message || 'Failed to approve QC slip')
  }
  return res.json()
}

export async function apiCreateReport(payload: CreateReportPayload): Promise<ApiReport> {
  if (!API_BASE) throw new Error('API base URL not configured')
  console.log('Creating report with payload:', payload)
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to create report', details: 'Could not parse error response' } }))
    console.error('API Error:', err)
    const errorMessage = err.error?.message || 'Failed to create report'
    const errorDetails = err.error?.details || err.details || ''
    throw new Error(errorDetails ? `${errorMessage}: ${JSON.stringify(errorDetails)}` : errorMessage)
  }
  return (await res.json()) as ApiReport
}

export async function apiUploadPhoto(reportId: string, file: File, caption?: string): Promise<{
  id: string
  url: string
  caption?: string | null
  createdAt: string
}> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  const formData = new FormData()
  formData.append('file', file)

  // Send caption as query parameter (since we use req.file() on server like avatar upload)
  const url = new URL(`${API_BASE}/reports/${reportId}/photos`)
  if (caption) {
    url.searchParams.append('caption', caption)
  }

  const token = getToken()
  const headers: HeadersInit = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to upload photo' } }))
    throw new Error(err.error?.message || 'Failed to upload photo')
  }

  return res.json()
}

export async function apiGetReportsByBBox(bbox: [number, number, number, number], limit = 200): Promise<ApiReport[]> {
  if (!API_BASE) return []
  const qs = new URLSearchParams({ bbox: bbox.join(','), limit: String(limit) })
  const res = await fetch(`${API_BASE}/reports?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch reports' } }))
    throw new Error(err.error?.message || 'Failed to fetch reports')
  }
  const data = (await res.json()) as ApiListResponse
  return data.data
}

export async function apiGetAllReports(limit = 1000): Promise<ApiReport[]> {
  if (!API_BASE) return []
  
  // Use a reasonable limit instead of fetching everything
  const qs = new URLSearchParams({ 
    limit: String(limit), 
    offset: '0',
    // Add ordering to get most recent first
  })
  
  try {
    const res = await fetch(`${API_BASE}/reports?${qs.toString()}`, {
      // Add cache headers for better performance
      cache: 'no-store', // Always fetch fresh data, but don't cache in browser
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch reports' } }))
      throw new Error(err.error?.message || 'Failed to fetch reports')
    }
    
    const data = (await res.json()) as ApiListResponse
    return data.data
  } catch (error) {
    console.error('Error fetching reports:', error)
    throw error
  }
}

export async function apiGetReport(id: string): Promise<ApiReport & { photos?: Array<{ id: string; url: string; caption?: string }> }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/reports/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Report not found' } }))
    throw new Error(err.error?.message || 'Report not found')
  }
  return (await res.json()) as ApiReport
}

// Admin/Officer interfaces
export interface AdminReport extends ApiReport {
  updatedAt: string
  district?: string | null
  sector?: string | null
  province?: string | null
  photos?: Array<{
    id: string
    url: string
    caption?: string | null
    createdAt: string
  }>
  reporter?: {
    id: string
    email: string
    fullName: string | null
  } | null
  currentAssignment?: {
    assignee?: {
      id: string
      email: string
      fullName: string | null
    } | null
    organization?: {
      id: string
      name: string
    } | null
    dueAt?: string
    createdAt?: string
  } | null
}

export interface DetailedReport extends AdminReport {
  addressText?: string | null
  province?: string | null
  district?: string | null
  sector?: string | null
  photos: Array<{
    id: string
    url: string
    caption?: string | null
    createdAt: string
  }>
  statusHistory: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    note?: string | null
    changedBy?: {
      id: string
      email: string
      fullName: string | null
    } | null
    createdAt: string
  }>
  comments: Array<{
    id: string
    body: string
    author?: {
      id: string
      email: string
      fullName: string | null
    } | null
    createdAt: string
  }>
  assignments: Array<{
    id: string
    assignee?: {
      id: string
      email: string
      fullName: string | null
    } | null
    organization?: {
      id: string
      name: string
      contactEmail?: string | null
      contactPhone?: string | null
    } | null
    dueAt?: string
    createdAt: string
  }>
}

export interface AdminListResponse {
  data: AdminReport[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export interface Organization {
  id: string
  name: string
  contactEmail?: string | null
  contactPhone?: string | null
}

export interface User {
  id: string
  email: string
  fullName: string | null
  phone?: string | null
  role: string
}

export interface AssignReportPayload {
  organizationId?: string
  assigneeId?: string
  dueAt?: string
}

export interface AddCommentPayload {
  body: string
  authorId?: string
}

export interface UpdateStatusPayload {
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'rejected'
  note?: string
  changedBy?: string
}

// Admin API functions
export async function apiGetAdminReports(filters?: {
  status?: string
  type?: string
  severity?: string
  assigneeId?: string
  organizationId?: string
  limit?: number
  offset?: number
}): Promise<AdminListResponse> {
  if (!API_BASE) {
    console.error('API_BASE not configured:', API_BASE)
    throw new Error('API base URL not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.')
  }
  
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
  }
  
  const url = `${API_BASE}/admin/reports?${params.toString()}`
  console.log('Fetching from:', url)
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API Error Response:', res.status, errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText || `HTTP ${res.status}: ${res.statusText}` } }
      }
      throw new Error(errorData.error?.message || `Failed to fetch reports: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    console.log('API Response received:', {
      total: data.meta?.total,
      count: data.data?.length,
      sample: data.data?.[0],
    })
    return data
  } catch (error) {
    console.error('Network/API Error:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to API at ${API_BASE}. Make sure the API server is running.`)
    }
    throw error
  }
}

export async function apiGetDetailedReport(id: string): Promise<DetailedReport> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Report not found' } }))
    throw new Error(err.error?.message || 'Report not found')
  }
  return res.json()
}

export async function apiAssignReport(reportId: string, payload: AssignReportPayload): Promise<{
  id: string
  reportId: string
  assignee?: User | null
  organization?: Organization | null
  dueAt?: string
  createdAt: string
}> {
  if (!API_BASE) throw new Error('API base URL not configured')
  console.log('Assigning report:', { reportId, payload })
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to assign report' } }))
    console.error('Failed to assign report:', {
      status: res.status,
      statusText: res.statusText,
      error: err,
      payload,
    })
    throw new Error(err.error?.message || 'Failed to assign report')
  }
  const data = await res.json()
  console.log('Report assigned successfully:', data)
  return data
}

export async function apiAddComment(reportId: string, payload: AddCommentPayload): Promise<{
  id: string
  body: string
  author?: User | null
  createdAt: string
}> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to add comment' } }))
    throw new Error(err.error?.message || 'Failed to add comment')
  }
  return res.json()
}

export async function apiUpdateReportStatus(reportId: string, payload: UpdateStatusPayload): Promise<{
  id: string
  title: string
  status: string
  updatedAt: string
}> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to update status' } }))
    throw new Error(err.error?.message || 'Failed to update status')
  }
  return res.json()
}

export async function apiGetOrganizations(): Promise<{ data: Organization[] }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/organizations`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch organizations' } }))
    throw new Error(err.error?.message || 'Failed to fetch organizations')
  }
  return res.json()
}

export async function apiGetUsers(role?: string): Promise<{ data: User[] }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const params = role ? new URLSearchParams({ role }) : new URLSearchParams()
  const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch users' } }))
    console.error('Failed to fetch users:', {
      status: res.status,
      statusText: res.statusText,
      error: err,
      url: `${API_BASE}/admin/users?${params.toString()}`,
    })
    throw new Error(err.error?.message || 'Failed to fetch users')
  }
  const data = await res.json()
  console.log('Fetched users:', { role, count: data.data?.length || 0, users: data.data })
  return data
}

export interface CreateUserPayload {
  email: string
  password: string
  fullName?: string
  phone?: string
  role?: 'citizen' | 'officer' | 'admin'
}

export async function apiCreateUser(payload: CreateUserPayload): Promise<{ data: User }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to create user' } }))
    throw new Error(err.error?.message || 'Failed to create user')
  }
  return res.json()
}

export async function apiUpdateUserPassword(userId: string, password: string): Promise<{ message: string }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ 
        error: { 
          message: `Failed to update password (${res.status} ${res.statusText})` 
        } 
      }))
      const errorMessage = err.error?.message || `Failed to update password (${res.status})`
      console.error('Password update error:', err)
      throw new Error(errorMessage)
    }
    
    return res.json()
  } catch (error: any) {
    // Re-throw with more context if it's not already an Error with a message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error?.message || 'Failed to update password. Please check your connection and try again.')
  }
}

export interface OfficerMetrics {
  officerId: string
  officerName: string
  officerEmail: string
  totalCases: number
  resolvedCases: number
  successRate: number
}

export async function apiGetOfficerMetrics(): Promise<{ data: OfficerMetrics[] }> {
  if (!API_BASE) throw new Error('API base URL not configured')
  const res = await fetch(`${API_BASE}/admin/officers/metrics`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch officer metrics' } }))
    throw new Error(err.error?.message || 'Failed to fetch officer metrics')
  }
  return res.json()
}

export interface AutoAssignResponse {
  message: string
  assigned: number
  data: Array<{
    reportId: string
    assignee: User | null
  }>
}

export async function apiAutoAssignReports(): Promise<AutoAssignResponse> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  try {
    const res = await fetch(`${API_BASE}/admin/reports/auto-assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}), // Send empty JSON object to satisfy Fastify's content-type requirement
    })
    
    if (!res.ok) {
      let errorMessage = `Failed to auto-assign reports (${res.status})`
      try {
        const err = await res.json()
        console.error('Auto-assign error response:', JSON.stringify(err, null, 2))
        
        // Try different error response formats
        if (err.error) {
          errorMessage = err.error.message || err.error.code || errorMessage
          if (err.error.details) {
            console.error('Error details:', err.error.details)
          }
        } else if (err.message) {
          errorMessage = err.message
        } else if (typeof err === 'string') {
          errorMessage = err
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        errorMessage = `Failed to auto-assign reports (${res.status} ${res.statusText})`
      }
      throw new Error(errorMessage)
    }
    
    return res.json()
  } catch (error: any) {
    // Re-throw with more context if it's not already an Error with a message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error?.message || 'Failed to auto-assign reports. Please check your connection and try again.')
  }
}

// Analytics API functions
export interface HeatmapDataPoint {
  lat: number
  lng: number
  count: number
  intensity: number
}

export interface HeatmapResponse {
  data: HeatmapDataPoint[]
  total: number
  gridSize: number
}

export interface TrendData {
  categoryTrends: Array<{
    type: string
    data: Array<{ month: string; count: number }>
  }>
  statusTrends: Array<{
    status: string
    data: Array<{ month: string; count: number }>
  }>
  resolutionTimeTrends: Array<{
    month: string
    avgHours: number
  }>
}

export interface GeographicData {
  provinces: Array<{ name: string; count: number }>
  districts: Array<{ name: string; count: number; province: string }>
  sectors: Array<{ name: string; count: number; district: string; province: string }>
}

export async function apiGetHeatmapData(params?: {
  startDate?: string
  endDate?: string
  type?: string
  status?: string
  gridSize?: number
}): Promise<HeatmapResponse> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
  }
  
  const res = await fetch(`${API_BASE}/analytics/heatmap?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch heatmap data' } }))
    throw new Error(err.error?.message || 'Failed to fetch heatmap data')
  }
  
  return res.json()
}

export async function apiGetTrendData(params?: {
  period?: '3months' | '6months' | '12months' | 'custom'
  startDate?: string
  endDate?: string
}): Promise<TrendData> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
  }
  
  const res = await fetch(`${API_BASE}/analytics/trends?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch trend data' } }))
    throw new Error(err.error?.message || 'Failed to fetch trend data')
  }
  
  return res.json()
}

export async function apiGetGeographicData(): Promise<GeographicData> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  const res = await fetch(`${API_BASE}/analytics/geographic`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to fetch geographic data' } }))
    throw new Error(err.error?.message || 'Failed to fetch geographic data')
  }
  
  return res.json()
}

export async function apiExportReports(params?: {
  format?: 'csv' | 'pdf'
  startDate?: string
  endDate?: string
  status?: string
  type?: string
  severity?: string
}): Promise<Blob> {
  if (!API_BASE) throw new Error('API base URL not configured')
  
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
  }
  
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}/analytics/export/${params?.format || 'csv'}?${queryParams.toString()}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to export reports' } }))
    throw new Error(err.error?.message || 'Failed to export reports')
  }
  
  return res.blob()
}
