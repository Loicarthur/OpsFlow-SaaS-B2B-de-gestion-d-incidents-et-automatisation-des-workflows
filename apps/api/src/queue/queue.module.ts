import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NOTIFICATIONS_QUEUE, WORKFLOWS_QUEUE } from './queue.constants.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redis.url') },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 86_400 },
        },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }, { name: WORKFLOWS_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
