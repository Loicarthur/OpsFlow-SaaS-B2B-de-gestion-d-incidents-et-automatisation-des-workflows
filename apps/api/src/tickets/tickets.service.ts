import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, WorkflowTriggerType } from '@opsflow/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { WorkflowsService } from '../workflows/workflows.service.js';
import type { CreateTicketDto } from './dto/create-ticket.dto.js';
import type { UpdateTicketDto } from './dto/update-ticket.dto.js';
import type { AssignTicketDto } from './dto/assign-ticket.dto.js';
import type { QueryTicketsDto } from './dto/query-tickets.dto.js';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async findAll(organizationId: string, query: QueryTicketsDto) {
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          category: true,
        },
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: query.skip ?? 0,
        take: query.take ?? 25,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, total, skip: query.skip ?? 0, take: query.take ?? 25 };
  }

  async findOne(organizationId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        category: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(organizationId: string, createdById: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        categoryId: dto.categoryId,
        assignedToId: dto.assignedToId,
        organizationId,
        createdById,
      },
    });

    await this.auditLogService.record({
      organizationId,
      userId: createdById,
      ticketId: ticket.id,
      action: AuditAction.TICKET_CREATED,
      resourceType: 'Ticket',
      resourceId: ticket.id,
      newState: { title: ticket.title, priority: ticket.priority, status: ticket.status },
    });

    await this.workflowsService.trigger(organizationId, WorkflowTriggerType.TICKET_CREATED, ticket.id);

    return ticket;
  }

  async update(organizationId: string, actingUserId: string, id: string, dto: UpdateTicketDto) {
    const existing = await this.findOne(organizationId, id);

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        categoryId: dto.categoryId,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : undefined,
        closedAt: dto.status === 'CLOSED' ? new Date() : undefined,
      },
    });

    await this.auditLogService.record({
      organizationId,
      userId: actingUserId,
      ticketId: id,
      action: AuditAction.TICKET_UPDATED,
      resourceType: 'Ticket',
      resourceId: id,
      previousState: { status: existing.status, priority: existing.priority },
      newState: { status: ticket.status, priority: ticket.priority },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.auditLogService.record({
        organizationId,
        userId: actingUserId,
        ticketId: id,
        action: AuditAction.TICKET_STATUS_CHANGED,
        resourceType: 'Ticket',
        resourceId: id,
        previousState: { status: existing.status },
        newState: { status: ticket.status },
      });
      await this.workflowsService.trigger(organizationId, WorkflowTriggerType.TICKET_STATUS_CHANGED, id);
    }

    if (dto.priority && dto.priority !== existing.priority) {
      await this.auditLogService.record({
        organizationId,
        userId: actingUserId,
        ticketId: id,
        action: AuditAction.TICKET_PRIORITY_CHANGED,
        resourceType: 'Ticket',
        resourceId: id,
        previousState: { priority: existing.priority },
        newState: { priority: ticket.priority },
      });
      await this.workflowsService.trigger(organizationId, WorkflowTriggerType.TICKET_PRIORITY_CHANGED, id);
    }

    await this.workflowsService.trigger(organizationId, WorkflowTriggerType.TICKET_UPDATED, id);

    return ticket;
  }

  async assign(organizationId: string, actingUserId: string, id: string, dto: AssignTicketDto) {
    const existing = await this.findOne(organizationId, id);

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: dto.assigneeId },
    });

    await this.auditLogService.record({
      organizationId,
      userId: actingUserId,
      ticketId: id,
      action: AuditAction.TICKET_ASSIGNED,
      resourceType: 'Ticket',
      resourceId: id,
      previousState: { assignedToId: existing.assignedToId },
      newState: { assignedToId: dto.assigneeId },
    });

    return ticket;
  }

  async resolve(organizationId: string, actingUserId: string, id: string) {
    return this.update(organizationId, actingUserId, id, { status: 'RESOLVED' } as UpdateTicketDto);
  }
}
