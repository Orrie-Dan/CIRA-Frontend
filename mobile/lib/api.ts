import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  Report,
  CreateReportPayload,
  LoginResponse,
  ApiListResponse,
  Photo,
  AdminReport,
  DetailedReport,
  AdminListResponse,
  UpdateStatusPayload,
  AddCommentPayload,
} from '../types';


const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com';
// Log API base URL for debugging (remove in production)
if (__DEV__) {
  console.log('=== API Configuration ===');
  console.log('EXPO_PUBLIC_API_BASE_URL env var:', process.env.EXPO_PUBLIC_API_BASE_URL || '(not set)');
  console.log('Using API Base URL:', API_BASE);
  console.log('========================');
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });

    // Load token from storage on initialization
    this.loadToken();

    // Add request interceptor to include token
    this.client.interceptors.request.use(async (config) => {
      // Ensure token is loaded before making request
      if (!this.token) {
        await this.loadToken();
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      
      // CRITICAL: Remove Content-Type header for FormData so axios can set multipart/form-data with boundary
      // Without this, Fastify rejects the request as "not multipart"
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      
      return config;
    });

    // Add response interceptor to handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Silently handle authentication errors - don't log them
        if (error.response?.status === 401 || 
            error.message?.includes('Not authenticated') ||
            error.message?.includes('Unauthorized')) {
          // Return a rejected promise but don't log
          return Promise.reject(error);
        }
        // Log timeout errors for debugging
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.error('Request timeout:', error.config?.url);
        }
        return Promise.reject(error);
      }
    );
  }

  private async loadToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.token = token;
      } else {
        this.token = null;
      }
    } catch (error) {
      console.error('Failed to load token:', error);
      this.token = null;
    }
  }

  /**
   * Wait for token to be loaded from storage
   * Returns true if token is available, false otherwise
   * Has a timeout to prevent infinite waiting
   */
  async waitForToken(timeoutMs: number = 1000): Promise<boolean> {
    // If token is already loaded, return immediately
    if (this.token) {
      return true;
    }

    // Try to load token
    await this.loadToken();
    if (this.token) {
      return true;
    }

    // Wait a bit and check again (in case loadToken is still in progress)
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (this.token) {
        return true;
      }
      // Try loading again
      await this.loadToken();
      if (this.token) {
        return true;
      }
    }

    // Timeout reached, no token available
    return false;
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  // Auth methods
  async register(email: string, password: string, fullName?: string, phone?: string): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>('/auth/register', {
        email,
        password,
        fullName,
        phone,
      });
      if (response.data.token) {
        await this.setToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`Request timed out. The server at ${API_BASE} is not responding. Please check your connection and try again.`);
      }
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to API at ${API_BASE}. Make sure the API server is running and accessible.`);
      }
      // Handle API error responses
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      // Handle other errors
      throw new Error(error.message || 'Registration failed');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      if (response.data.token) {
        await this.setToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`Request timed out. The server at ${API_BASE} is not responding. Please check your connection and try again.`);
      }
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to API at ${API_BASE}. Make sure the API server is running and accessible.`);
      }
      // Handle API error responses
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      // Handle other errors
      throw new Error(error.message || 'Login failed');
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await this.client.get<{ user: User }>('/auth/me');
    return response.data;
  }

  async uploadAvatar(uri: string): Promise<{ user: User }> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: filename,
      type,
    } as any);

    // DO NOT manually set Content-Type - let axios set it automatically with boundary
    const response = await this.client.put<{ user: User }>('/auth/profile/avatar', formData);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearToken();
    }
  }

  // Report methods
  async createReport(payload: CreateReportPayload): Promise<Report> {
    const response = await this.client.post<Report>('/reports', payload);
    return response.data;
  }

  async getReports(
    bbox?: string, 
    limit = 200, 
    offset = 0,
    filters?: {
      status?: string;
      type?: string;
      severity?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      myReports?: boolean;
    }
  ): Promise<ApiListResponse> {
    const params: any = { limit, offset };
    if (bbox) {
      params.bbox = bbox;
    }
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.search) params.search = filters.search;
      if (filters.myReports) params.myReports = 'true';
    }
    
    // Add cache busting only in development to help debug
    if (__DEV__) {
      console.log('Fetching reports with params:', params);
    }
    
    const response = await this.client.get<ApiListResponse>('/reports', { params });
    return response.data;
  }

  async getReport(id: string): Promise<Report> {
    const response = await this.client.get<Report>(`/reports/${id}`);
    return response.data;
  }

  async uploadPhoto(reportId: string, uri: string, caption?: string): Promise<Photo> {
    const formData = new FormData();
    
    // For React Native, we need to handle the file differently
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Handle Android content:// URIs
    let fileUri = uri;
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      fileUri = uri;
    } else if (Platform.OS === 'ios') {
      fileUri = uri.replace('file://', '');
    }
    
    formData.append('file', {
      uri: fileUri,
      type,
      name: filename,
    } as any);

    // Send caption as query parameter (since we use req.file() on server like avatar upload)
    const params: any = {};
    if (caption) {
      params.caption = caption;
    }

    // DO NOT manually set Content-Type - let axios set it automatically with boundary
    const response = await this.client.post<Photo>(`/reports/${reportId}/photos`, formData, {
      params,
    });
    return response.data;
  }

  // Geocoding
  async reverseGeocode(lat: number, lng: number): Promise<any> {
    const response = await this.client.get('/geocoding/reverse', {
      params: { lat, lon: lng },
    });
    return response.data;
  }

  async forwardGeocode(query: string): Promise<{ results: Array<{ latitude: number; longitude: number; displayName: string; address: any }> }> {
    const response = await this.client.get('/geocoding/forward', {
      params: { q: query },
    });
    return response.data;
  }

  async getSectorsByDistrict(district: string): Promise<{ sectors: string[]; count: number; district: string }> {
    const response = await this.client.get('/geocoding/sectors', {
      params: { district },
    });
    return response.data;
  }

  // Officer/Admin methods
  async getAdminReports(filters?: {
    status?: string;
    type?: string;
    severity?: string;
    assigneeId?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminListResponse> {
    const params: any = {};
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;
      if (filters.assigneeId) params.assigneeId = filters.assigneeId;
      if (filters.organizationId) params.organizationId = filters.organizationId;
      if (filters.limit) params.limit = filters.limit;
      if (filters.offset) params.offset = filters.offset;
    }
    
    const response = await this.client.get<AdminListResponse>('/admin/reports', { params });
    return response.data;
  }

  async getDetailedReport(id: string): Promise<DetailedReport> {
    const response = await this.client.get<DetailedReport>(`/admin/reports/${id}`);
    return response.data;
  }

  async updateReportStatus(id: string, payload: UpdateStatusPayload): Promise<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
  }> {
    const response = await this.client.patch(`/admin/reports/${id}/status`, payload);
    return response.data;
  }

  async addComment(id: string, payload: AddCommentPayload): Promise<{
    id: string;
    body: string;
    author?: {
      id: string;
      email: string;
      fullName: string | null;
    } | null;
    createdAt: string;
  }> {
    const response = await this.client.post(`/admin/reports/${id}/comments`, payload);
    return response.data;
  }

  async assignReport(id: string, assigneeId?: string, organizationId?: string, dueAt?: string): Promise<{
    id: string;
    reportId: string;
    assignee?: {
      id: string;
      email: string;
      fullName: string | null;
    } | null;
    organization?: {
      id: string;
      name: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
    } | null;
    dueAt?: string | null;
    createdAt: string;
  }> {
    const payload: any = {};
    if (assigneeId) payload.assigneeId = assigneeId;
    if (organizationId) payload.organizationId = organizationId;
    if (dueAt) payload.dueAt = dueAt;
    
    const response = await this.client.post(`/admin/reports/${id}/assign`, payload);
    return response.data;
  }

  // Notification methods
  async getNotifications(params?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<{
    data: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: any;
      read: boolean;
      createdAt: string;
    }>;
    meta: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    // Wait for token to be loaded before making request
    const hasToken = await this.waitForToken(1000);
    if (!hasToken) {
      // Return empty result instead of throwing error to prevent logging
      return {
        data: [],
        meta: {
          total: 0,
          limit: params?.limit || 50,
          offset: params?.offset || 0,
        },
      };
    }
    try {
      const response = await this.client.get('/notifications', { params });
      return response.data;
    } catch (error: any) {
      // Mark authentication errors as silent and return empty result
      if (error.response?.status === 401 || error.message?.includes('Not authenticated')) {
        error.silent = true;
        return {
          data: [],
          meta: {
            total: 0,
            limit: params?.limit || 50,
            offset: params?.offset || 0,
          },
        };
      }
      throw error;
    }
  }

  async getUnreadCount(): Promise<{ count: number }> {
    // Wait for token to be loaded before making request
    const hasToken = await this.waitForToken(1000);
    if (!hasToken) {
      // Return zero count instead of throwing error to prevent logging
      return { count: 0 };
    }
    try {
      const response = await this.client.get('/notifications/unread-count');
      return response.data;
    } catch (error: any) {
      // Mark authentication errors as silent and return zero count
      if (error.response?.status === 401 || error.message?.includes('Not authenticated')) {
        error.silent = true;
        return { count: 0 };
      }
      throw error;
    }
  }

  async markNotificationAsRead(id: string): Promise<{ success: boolean }> {
    const response = await this.client.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    const response = await this.client.patch('/notifications/read-all');
    return response.data;
  }

  async registerDeviceToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<{ success: boolean }> {
    const response = await this.client.post('/notifications/register-device', { token, platform });
    return response.data;
  }

  async unregisterDeviceToken(token: string): Promise<{ success: boolean }> {
    const response = await this.client.post('/notifications/unregister-device', { token });
    return response.data;
  }
}

export const apiClient = new ApiClient();

