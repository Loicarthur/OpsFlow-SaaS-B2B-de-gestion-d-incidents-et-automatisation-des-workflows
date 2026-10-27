import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends mail over plain SMTP so any provider (Mailpit locally, a real
 * relay in production) works without vendor-specific SDKs. Falls back to
 * logging when SMTP_HOST is unset, so local dev works without a mail server.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    this.from = this.configService.get<string>('SMTP_FROM') ?? 'OpsFlow <notifications@opsflow.local>';

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
          secure: this.configService.get<string>('SMTP_SECURE') === 'true',
          auth: this.configService.get<string>('SMTP_USER')
            ? {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASSWORD'),
              }
            : undefined,
        })
      : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP_HOST not configured — logging email instead of sending. To: ${input.to}, Subject: ${input.subject}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
