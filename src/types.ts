export type UserRole =
  | 'Student'
  | 'Faculty'
  | 'Staff'
  | 'Maintenance Staff'
  | 'Department Head'
  | 'Administrator'
  | 'Super Administrator'
  | 'Principal'
  | 'Vice Principal';

export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type RequestStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  employeeId?: string; // Student or employee ID
  hostel?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  headName?: string;
  email?: string;
  phone?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  department: string;
  slaHours: number;
  isActive: boolean;
  createdAt: string;
}

export type Category = ServiceCategory;

export interface ServiceRequest {
  id: number;
  requestId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  campusLocation: string;
  building: string;
  roomNumber: string;
  priority: RequestPriority;
  submittedBy: number;
  submittedByName?: string;
  submittedByEmail?: string;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  status: RequestStatus;
  slaDeadline: string;
  slaHours: number;
  isOverdue: boolean;
  escalated: boolean;
  escalationReason?: string | null;
  resolutionDetails?: string | null;
  closedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestHistory {
  id: number;
  requestId: number;
  changedBy: number;
  changedByName: string;
  action: string;
  details: string;
  timestamp: string;
}

export type RequestHistoryItem = RequestHistory;

export interface Attachment {
  id: number;
  requestId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type:
    | 'new_request'
    | 'assignment'
    | 'status_update'
    | 'resolution'
    | 'closure'
    | 'rejection'
    | 'attachment'
    | 'overdue'
    | 'escalation'
    | 'profile_update';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface SlaSetting {
  id: number;
  categoryId: number;
  categoryName: string;
  slaHours: number;
  escalateAfterHours: number;
  escalateToRole: UserRole;
  isActive: boolean;
  updatedAt: string;
}

export interface DashboardStats {
  totalRequests: number;
  openRequests: number;
  assignedRequests: number;
  inProgressRequests: number;
  resolvedRequests: number;
  closedRequests: number;
  overdueRequests: number;
  highPriorityRequests: number;
  requestsByCategory: { category: string; count: number }[];
  requestsByStatus: { status: string; count: number }[];
  slaPerformance: {
    withinSla: number;
    overdue: number;
    complianceRate: number;
    averageResolutionHours: number;
  };
}

export interface AssistantDraft {
  title?: string;
  description?: string;
  category?: string;
  department?: string;
  campusLocation?: string;
  building?: string;
  roomNumber?: string;
  priority?: RequestPriority;
}
