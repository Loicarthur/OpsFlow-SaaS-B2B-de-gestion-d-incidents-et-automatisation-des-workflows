import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel } from '@opsflow/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { NOTIFICATIONS_QUEUE, NotificationsJob } from '../queue/queue.constants.js';

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  ticketId?: string;
  title: string;
  body: string;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue,
  ) {}

  async notify(input: CreateNotificationInput) {
    const channel = input.channel ?? NotificationChannel.IN_APP;

    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        ticketId: input.ticketId,
        title: input.title,
        body: input.body,
        channel,
      },
    });

    if (channel === NotificationChannel.EMAIL) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
      if (user) {
        await this.notificationsQueue.add(NotificationsJob.SEND_EMAIL, {
          to: user.email,
          subject: input.title,
          html: `<p>${input.body}</p>`,
        });
      }
    }

    return notification;
  }

  listForUser(userId: string, params: { skip?: number; take?: number; unreadOnly?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(params.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    });
  }

  markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
