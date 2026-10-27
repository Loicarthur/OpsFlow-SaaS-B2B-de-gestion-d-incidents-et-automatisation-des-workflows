import type { OrgRole } from '@opsflow/shared';
export type { OrgRole };
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkflowTriggerType =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_PRIORITY_CHANGED'
  | 'SLA_BREACHED';
export type WorkflowActionType =
  | 'ASSIGN_TICKET'
  | 'SEND_NOTIFICATION'
  | 'CHANGE_STATUS'
  | 'CHANGE_PRIORITY'
  | 'START_SLA'
  | 'CLOSE_TICKET'
  | 'CALL_WEBHOOK';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  organization: { id: string; name: string; slug?: string };
  role: OrgRole;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  organizationId: string;
  createdById: string;
  assignedToId: string | null;
  createdBy?: UserSummary;
  assignedTo?: UserSummary | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

export interface Membership {
  id: string;
  userId: string;
  role: OrgRole;
  user: UserSummary;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  conditions: unknown;
  actions: { id: string; type: WorkflowActionType; config: Record<string, unknown>; order: number }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: UserSummary | null;
}

export interface DashboardStats {
  ticketsByStatus: { status: TicketStatus; count: number }[];
  ticketsByPriority: { priority: TicketPriority; count: number }[];
  overdueSlaCount: number;
  recentActivity: AuditLogEntry[];
}
