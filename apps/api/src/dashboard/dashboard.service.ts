import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(organizationId: string) {
    const [byStatus, byPriority, overdueSla, recentAuditLogs] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.ticket.count({
        where: {
          organizationId,
          slaDueAt: { lt: new Date() },
          status: { notIn: ['RESOLVED', 'CLOSED'] },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return {
      ticketsByStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      ticketsByPriority: byPriority.map((row) => ({ priority: row.priority, count: row._count._all })),
      overdueSlaCount: overdueSla,
      recentActivity: recentAuditLogs,
    };
  }
}
