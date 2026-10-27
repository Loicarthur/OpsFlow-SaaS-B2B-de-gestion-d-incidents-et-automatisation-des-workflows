import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { TicketsController } from './tickets.controller.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { WorkflowsModule } from '../workflows/workflows.module.js';

@Module({
  imports: [AuditLogModule, WorkflowsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
