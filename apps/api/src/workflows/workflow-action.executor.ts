import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHmac } from 'node:crypto';
import { AuditAction, NotificationChannel, WorkflowActionType } from '@opsflow/shared';
import type { Ticket, WorkflowAction } from '../../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WORKFLOWS_QUEUE, WorkflowsJob } from '../queue/queue.constants.js';

type ActionHandler = (ticket: Ticket, config: Record<string, unknown>) => Promise<void>;

/**
 * Each WorkflowActionType maps to one handler here. Adding a new action
 * type means registering one function — nothing elsewhere needs to change,
 * which is the point of keeping rules data-driven instead of hard-coded.
 */
@Injectable()
export class WorkflowActionExecutor {
  private readonly logger = new Logger(WorkflowActionExecutor.name);
  private readonly handlers: Partial<Record<WorkflowActionType, ActionHandler>>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(WORKFLOWS_QUEUE) private readonly workflowsQueue: Queue,
  ) {
    this.handlers = {
      [WorkflowActionType.ASSIGN_TICKET]: this.assignTicket.bind(this),
      [WorkflowActionType.SEND_NOTIFICATION]: this.sendNotification.bind(this),
      [WorkflowActionType.CHANGE_STATUS]: this.changeStatus.bind(this),
      [WorkflowActionType.CHANGE_PRIORITY]: this.changePriority.bind(this),
      [WorkflowActionType.START_SLA]: this.startSla.bind(this),
      [WorkflowActionType.CLOSE_TICKET]: this.closeTicket.bind(this),
      [WorkflowActionType.CALL_WEBHOOK]: this.callWebhook.bind(this),
    };
  }

  async execute(action: WorkflowAction, ticket: Ticket): Promise<void> {
    const handler = this.handlers[action.type];
    if (!handler) {
      this.logger.warn(`No handler registered for workflow action type: ${action.type}`);
      return;
    }
    await handler(ticket, (action.config as Record<string, unknown>) ?? {});
  }

  private async assignTicket(ticket: Ticket, config: Record<string, unknown>) {
    const assigneeId = config.assigneeId as string | undefined;
    if (!assigneeId) return;

    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { assignedToId: assigneeId } });
    await this.auditLogService.record({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      action: AuditAction.TICKET_ASSIGNED,
      resourceType: 'Ticket',
      resourceId: ticket.id,
      previousState: { assignedToId: ticket.assignedToId },
      newState: { assignedToId: assigneeId },
      metadata: { source: 'workflow' },
    });
  }

  private async sendNotification(ticket: Ticket, config: Record<string, unknown>) {
    const target = (config.target as string) ?? 'assignee';
    const title = (config.title as string) ?? 'Ticket update';
    const body = (config.body as string) ?? `Ticket "${ticket.title}" was updated.`;
    const channel = (config.channel as NotificationChannel) ?? NotificationChannel.IN_APP;

    const userIds: string[] = [];
    if (target === 'assignee' && ticket.assignedToId) userIds.push(ticket.assignedToId);
    if (target === 'creator') userIds.push(ticket.createdById);
    if (target === 'specific' && config.userId) userIds.push(config.userId as string);

    await Promise.all(
      userIds.map((userId) =>
        this.notificationsService.notify({
          organizationId: ticket.organizationId,
          userId,
          ticketId: ticket.id,
          title,
          body,
          channel,
        }),
      ),
    );
  }

  private async changeStatus(ticket: Ticket, config: Record<string, unknown>) {
    const status = config.status as string | undefined;
    if (!status) return;

    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { status: status as never } });
    await this.auditLogService.record({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      action: AuditAction.TICKET_STATUS_CHANGED,
      resourceType: 'Ticket',
      resourceId: ticket.id,
      previousState: { status: ticket.status },
      newState: { status },
      metadata: { source: 'workflow' },
    });
  }

  private async changePriority(ticket: Ticket, config: Record<string, unknown>) {
    const priority = config.priority as string | undefined;
    if (!priority) return;

    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { priority: priority as never } });
    await this.auditLogService.record({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      action: AuditAction.TICKET_PRIORITY_CHANGED,
      resourceType: 'Ticket',
      resourceId: ticket.id,
      previousState: { priority: ticket.priority },
      newState: { priority },
      metadata: { source: 'workflow' },
    });
  }

  private async startSla(ticket: Ticket, config: Record<string, unknown>) {
    const hours = Number(config.hours ?? 24);
    const slaDueAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { slaDueAt } });
  }

  private async closeTicket(ticket: Ticket, config: Record<string, unknown>) {
    const afterHours = config.afterHours ? Number(config.afterHours) : 0;

    if (afterHours > 0) {
      await this.workflowsQueue.add(
        WorkflowsJob.EVALUATE_TRIGGER,
        { kind: 'delayed-close', ticketId: ticket.id },
        { delay: afterHours * 60 * 60 * 1000 },
      );
      return;
    }

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  /**
   * Signs the payload with HMAC-SHA256 (X-OpsFlow-Signature header) so the
   * receiving endpoint can verify the webhook actually came from OpsFlow.
   */
  private async callWebhook(ticket: Ticket, config: Record<string, unknown>) {
    const url = config.url as string | undefined;
    if (!url) return;

    const secret = (config.secret as string) ?? process.env.WEBHOOK_SIGNING_SECRET ?? 'dev-webhook-secret';
    const payload = JSON.stringify({ event: 'workflow.webhook', ticket });
    const signature = createHmac('sha256', secret).update(payload).digest('hex');

    try {
      await fetch(url, {
        method: (config.method as string) ?? 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OpsFlow-Signature': signature },
        body: payload,
      });
    } catch (error) {
      this.logger.error(`Webhook call to ${url} failed: ${(error as Error).message}`);
    }
  }
}
