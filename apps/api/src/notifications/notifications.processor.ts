import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EmailService, type SendEmailInput } from './email.service.js';
import { NOTIFICATIONS_QUEUE, NotificationsJob } from '../queue/queue.constants.js';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<SendEmailInput, void, string>): Promise<void> {
    switch (job.name) {
      case NotificationsJob.SEND_EMAIL:
        await this.emailService.send(job.data);
        return;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
