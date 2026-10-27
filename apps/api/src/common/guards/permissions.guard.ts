import { Injectable, ForbiddenException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleHasPermission, type Permission } from '@opsflow/shared';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../types/authenticated-user.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = required.every((permission) => roleHasPermission(user.role, permission));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
