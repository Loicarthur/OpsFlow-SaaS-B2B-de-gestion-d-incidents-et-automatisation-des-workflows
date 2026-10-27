import { describe, expect, it } from 'vitest';
import { OrgRole } from './enums.js';
import { Permission, permissionsForRole, roleHasPermission } from './permissions.js';

describe('RBAC permission matrix', () => {
  it('grants owners and admins every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(roleHasPermission(OrgRole.OWNER, permission)).toBe(true);
      expect(roleHasPermission(OrgRole.ADMIN, permission)).toBe(true);
    }
  });

  it('restricts viewers to read-only permissions', () => {
    expect(roleHasPermission(OrgRole.VIEWER, Permission.TICKET_VIEW)).toBe(true);
    expect(roleHasPermission(OrgRole.VIEWER, Permission.TICKET_CREATE)).toBe(false);
    expect(roleHasPermission(OrgRole.VIEWER, Permission.WORKFLOW_MANAGE)).toBe(false);
  });

  it('lets agents create and update tickets but not manage workflows', () => {
    expect(roleHasPermission(OrgRole.AGENT, Permission.TICKET_CREATE)).toBe(true);
    expect(roleHasPermission(OrgRole.AGENT, Permission.TICKET_UPDATE)).toBe(true);
    expect(roleHasPermission(OrgRole.AGENT, Permission.WORKFLOW_MANAGE)).toBe(false);
    expect(roleHasPermission(OrgRole.AGENT, Permission.MEMBER_REMOVE)).toBe(false);
  });

  it('lets managers manage workflows and invite members but not remove them', () => {
    expect(roleHasPermission(OrgRole.MANAGER, Permission.WORKFLOW_MANAGE)).toBe(true);
    expect(roleHasPermission(OrgRole.MANAGER, Permission.MEMBER_INVITE)).toBe(true);
    expect(roleHasPermission(OrgRole.MANAGER, Permission.MEMBER_REMOVE)).toBe(false);
  });

  it('returns the full permission list for a role', () => {
    expect(permissionsForRole(OrgRole.VIEWER)).toEqual([Permission.TICKET_VIEW, Permission.DASHBOARD_VIEW]);
  });
});
