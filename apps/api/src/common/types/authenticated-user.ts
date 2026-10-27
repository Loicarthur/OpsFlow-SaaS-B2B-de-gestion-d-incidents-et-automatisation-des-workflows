import type { OrgRole } from '@opsflow/shared';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  role: OrgRole;
}
