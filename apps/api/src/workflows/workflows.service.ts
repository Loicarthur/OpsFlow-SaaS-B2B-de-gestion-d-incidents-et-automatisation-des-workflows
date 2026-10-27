import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditAction, type WorkflowTriggerType } from '@opsflow/shared';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { WORKFLOWS_QUEUE, WorkflowsJob } from '../queue/queue.constants.js';
import type { CreateWorkflowDto } from './dto/create-workflow.dto.js';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto.js';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue(WORKFLOWS_QUEUE) private readonly workflowsQueue: Queue,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      include: { actions: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async create(organizationId: string, userId: string, dto: CreateWorkflowDto) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        conditions: (dto.conditions ?? []) as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
        organizationId,
        actions: {
          create: dto.actions.map((action, index) => ({
            type: action.type,
            config: action.config as Prisma.InputJsonValue,
            order: action.order ?? index,
          })),
        },
      },
      include: { actions: true },
    });

    await this.auditLogService.record({
      organizationId,
      userId,
      action: AuditAction.WORKFLOW_CREATED,
      resourceType: 'Workflow',
      resourceId: workflow.id,
      newState: { name: workflow.name, triggerType: workflow.triggerType },
    });

    return workflow;
  }

  async update(organizationId: string, userId: string, id: string, dto: UpdateWorkflowDto) {
    const existing = await this.findOne(organizationId, id);

    const workflow = await this.prisma.$transaction(async (tx) => {
      if (dto.actions) {
        await tx.workflowAction.deleteMany({ where: { workflowId: id } });
      }

      return tx.workflow.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          triggerType: dto.triggerType,
          conditions: dto.conditions as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive,
          ...(dto.actions
            ? {
                actions: {
                  create: dto.actions.map((action, index) => ({
                    type: action.type,
                    config: action.config as Prisma.InputJsonValue,
                    order: action.order ?? index,
                  })),
                },
              }
            : {}),
        },
        include: { actions: { orderBy: { order: 'asc' } } },
      });
    });

    await this.auditLogService.record({
      organizationId,
      userId,
      action: AuditAction.WORKFLOW_UPDATED,
      resourceType: 'Workflow',
      resourceId: id,
      previousState: { name: existing.name, isActive: existing.isActive },
      newState: { name: workflow.name, isActive: workflow.isActive },
    });

    return workflow;
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.workflow.delete({ where: { id } });
    return { success: true };
  }

  /** Enqueues trigger evaluation; the WorkflowsProcessor does the actual matching + execution off the request thread. */
  async trigger(organizationId: string, triggerType: WorkflowTriggerType, ticketId: string) {
    await this.workflowsQueue.add(WorkflowsJob.EVALUATE_TRIGGER, {
      kind: 'trigger',
      organizationId,
      triggerType,
      ticketId,
    });
  }
}
