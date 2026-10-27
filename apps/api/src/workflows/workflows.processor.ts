import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AuditAction } from '@opsflow/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { WorkflowActionExecutor } from './workflow-action.executor.js';
import { evaluateConditions } from './workflow-condition.evaluator.js';
import { WORKFLOWS_QUEUE } from '../queue/queue.constants.js';

interface TriggerJobData {
  kind: 'trigger';
  organizationId: string;
  triggerType: string;
  ticketId: string;
}

interface DelayedCloseJobData {
  kind: 'delayed-close';
  ticketId: string;
}

type WorkflowsJobData = TriggerJobData | DelayedCloseJobData;

@Processor(WORKFLOWS_QUEUE)
export class WorkflowsProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly actionExecutor: WorkflowActionExecutor,
  ) {
    super();
  }

  async process(job: Job<WorkflowsJobData>): Promise<void> {
    if (job.data.kind === 'delayed-close') {
      await this.handleDelayedClose(job.data);
      return;
    }
    await this.handleTrigger(job.data);
  }

  private async handleDelayedClose(data: DelayedCloseJobData) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: data.ticketId } });
    if (!ticket || ticket.status === 'CLOSED') return;

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  private async handleTrigger(data: TriggerJobData) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: data.ticketId } });
    if (!ticket) return;

    const workflows = await this.prisma.workflow.findMany({
      where: { organizationId: data.organizationId, triggerType: data.triggerType as never, isActive: true },
      include: { actions: { orderBy: { order: 'asc' } } },
    });

    for (const workflow of workflows) {
      const matches = evaluateConditions(workflow.conditions, ticket as unknown as Record<string, unknown>);
      if (!matches) continue;

      this.logger.log(`Workflow "${workflow.name}" matched for ticket ${ticket.id}`);

      await this.auditLogService.record({
        organizationId: data.organizationId,
        ticketId: ticket.id,
        action: AuditAction.WORKFLOW_TRIGGERED,
        resourceType: 'Workflow',
        resourceId: workflow.id,
        metadata: { workflowName: workflow.name, triggerType: data.triggerType },
      });

      for (const action of workflow.actions) {
        const freshTicket = await this.prisma.ticket.findUnique({ where: { id: ticket.id } });
        if (!freshTicket) break;
        await this.actionExecutor.execute(action, freshTicket);
      }
    }
  }
}
