export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  avatarUrl?: string | null;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  severity: ReportSeverity;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  addressText?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  createdAt: string;
  reporterId?: string | null;
  photos?: Photo[]; // Optional photos for list view
}

export type ReportType =
  | 'roads'
  | 'bridges'
  | 'water'
  | 'power'
  | 'sanitation'
  | 'telecom'
  | 'public_building'
  | 'pothole'
  | 'streetlight'
  | 'sidewalk'
  | 'drainage'
  | 'other';

export type ReportSeverity = 'low' | 'medium' | 'high';

export type ReportStatus =
  | 'new'
  | 'triaged'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface Photo {
  id: string;
  url: string;
  caption?: string | null;
  createdAt: string;
}

export interface CreateReportPayload {
  title: string;
  description: string;
  type: ReportType;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  addressText?: string;
  province?: string;
  district?: string;
  sector?: string;
  reporterId?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiListResponse {
  data: Report[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface AdminReport extends Report {
  reporter?: User | null;
  currentAssignment?: {
    assignee?: User | null;
    organization?: {
  id: string;
      name: string;
    } | null;
  } | null;
}

export interface AdminListResponse {
  data: AdminReport[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface DetailedReport extends Report {
  photos: Photo[];
  latestStatus?: {
    status: string;
    note?: string | null;
    changedAt: string;
  } | null;
  reporter?: User | null;
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
  createdAt: string;
  }>;
  comments?: Array<{
    id: string;
    body: string;
    author?: User | null;
    createdAt: string;
  }>;
  assignments?: Array<{
    id: string;
    assignee?: User | null;
    organization?: {
      id: string;
      name: string;
    } | null;
    createdAt: string;
  }>;
}

export interface UpdateStatusPayload {
  status: ReportStatus;
  note?: string;
}

export interface AddCommentPayload {
  body: string;
  authorId?: string;
}

export interface Notification {
  id: string;
  type: 'report_created' | 'report_status_changed' | 'report_commented' | 'report_assigned';
  title: string;
  body: string;
  data: {
    reportId?: string;
    reportTitle?: string;
    status?: string;
    commentId?: string;
    assigneeId?: string;
    organizationId?: string;
  };
  read: boolean;
  createdAt: string;
}
