import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/index.js';
import type { AuditAction } from '@opsflow/shared';

export interface RecordAuditLogInput {
  organizationId: string;
  userId?: string;
  ticketId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        ticketId: input.ticketId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        previousState: (input.previousState ?? undefined) as Prisma.InputJsonValue | undefined,
        newState: (input.newState ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findForOrganization(
    organizationId: string,
    params: { skip?: number; take?: number; ticketId?: string } = {},
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(params.ticketId ? { ticketId: params.ticketId } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    });
  }
}
