import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service.js';
import { WorkflowsController } from './workflows.controller.js';
import { WorkflowsProcessor } from './workflows.processor.js';
import { WorkflowActionExecutor } from './workflow-action.executor.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuditLogModule, NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsProcessor, WorkflowActionExecutor],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
