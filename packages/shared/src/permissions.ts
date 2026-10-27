import { OrgRole } from './enums.js';

/**
 * Central RBAC permission matrix. Backend guards and frontend UI gating
 * both read from this table so the rules never drift between the two.
 */
export enum Permission {
  ORG_MANAGE = 'ORG_MANAGE',
  MEMBER_INVITE = 'MEMBER_INVITE',
  MEMBER_REMOVE = 'MEMBER_REMOVE',
  MEMBER_ROLE_CHANGE = 'MEMBER_ROLE_CHANGE',
  TICKET_CREATE = 'TICKET_CREATE',
  TICKET_VIEW = 'TICKET_VIEW',
  TICKET_UPDATE = 'TICKET_UPDATE',
  TICKET_ASSIGN = 'TICKET_ASSIGN',
  TICKET_DELETE = 'TICKET_DELETE',
  WORKFLOW_MANAGE = 'WORKFLOW_MANAGE',
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
}

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  [OrgRole.OWNER]: Object.values(Permission),
  [OrgRole.ADMIN]: Object.values(Permission),
  [OrgRole.MANAGER]: [
    Permission.MEMBER_INVITE,
    Permission.TICKET_CREATE,
    Permission.TICKET_VIEW,
    Permission.TICKET_UPDATE,
    Permission.TICKET_ASSIGN,
    Permission.WORKFLOW_MANAGE,
    Permission.AUDIT_LOG_VIEW,
    Permission.DASHBOARD_VIEW,
  ],
  [OrgRole.AGENT]: [
    Permission.TICKET_CREATE,
    Permission.TICKET_VIEW,
    Permission.TICKET_UPDATE,
    Permission.DASHBOARD_VIEW,
  ],
  [OrgRole.VIEWER]: [Permission.TICKET_VIEW, Permission.DASHBOARD_VIEW],
};

export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsForRole(role: OrgRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
