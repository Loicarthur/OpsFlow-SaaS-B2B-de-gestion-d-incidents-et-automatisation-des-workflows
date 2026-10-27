import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QueueModule } from './queue/queue.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { WorkflowsModule } from './workflows/workflows.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AuditLogModule } from './audit-log/audit-log.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    QueueModule,
    AuthModule,
    OrganizationsModule,
    TicketsModule,
    WorkflowsModule,
    NotificationsModule,
    AuditLogModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
