import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsProcessor } from './notifications.processor.js';
import { EmailService } from './email.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
