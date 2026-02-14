import { Injectable, Logger } from '@nestjs/common';
import { Resend, type Attachment as ResendAttachment } from 'resend';
import { emailWrapper } from '../notifications/notification-templates';

type Recipient = string | string[];
export type EmailAttachment = ResendAttachment;

export interface SendEmailOptions {
  to: Recipient;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: Recipient;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
}

interface QueuedEmail {
  options: SendEmailOptions;
  resolve: () => void;
  reject: (err: Error) => void;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Resend | null;
  private readonly defaultFrom: string;
  private readonly emailOverride: string | null;

  // Rate limiting queue - Resend API allows 2 req/sec, we stay safely under at ~1.4/sec
  private emailQueue: QueuedEmail[] = [];
  private isProcessingQueue = false;
  private readonly RATE_LIMIT_DELAY_MS = 700;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.RESEND_FROM_EMAIL ?? 'KANAP <no-reply@kanap.net>';
    this.emailOverride = process.env.EMAIL_OVERRIDE?.trim() || null;
    if (apiKey && apiKey.trim().length > 0) {
      this.client = new Resend(apiKey.trim());
    } else {
      this.client = null;
      this.logger.warn('Resend API key not configured; email sending is disabled.');
    }
    if (this.emailOverride) {
      this.logger.warn(`Email override active: all emails will be sent to ${this.emailOverride}`);
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.emailQueue.push({ options, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.emailQueue.length > 0) {
      const item = this.emailQueue.shift()!;
      try {
        await this.sendImmediate(item.options);
        item.resolve();
      } catch (err) {
        item.reject(err as Error);
      }

      // Rate limit delay before next email
      if (this.emailQueue.length > 0) {
        await new Promise(r => setTimeout(r, this.RATE_LIMIT_DELAY_MS));
      }
    }

    this.isProcessingQueue = false;
  }

  private async sendImmediate(options: SendEmailOptions) {
    const client = this.ensureClient();
    const originalTo = Array.isArray(options.to) ? options.to : [options.to];
    const replyTo = options.replyTo
      ? (Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo])
      : undefined;

    // In non-production, redirect all emails to override address
    let to = originalTo;
    let subject = options.subject;
    if (this.emailOverride) {
      to = [this.emailOverride];
      subject = `[To: ${originalTo.join(', ')}] ${options.subject}`;
      this.logger.debug(`Email redirected from ${originalTo.join(', ')} to ${this.emailOverride}`);
    }

    this.logger.debug(`Sending email to ${to.join(', ')}: ${subject}`);

    const { data, error } = await client.emails.send({
      from: options.from ?? this.defaultFrom,
      to,
      subject,
      html: options.html,
      text: options.text,
      replyTo,
      headers: options.headers,
      attachments: options.attachments,
    });
    if (error) {
      this.logger.error(`Failed to send email via Resend: ${error.name} - ${error.message}`);
      throw new Error(error.message ?? 'Failed to send email');
    }
    return data;
  }

  async sendPasswordResetEmail(params: { to: string; resetUrl: string; expiresInMinutes?: number }) {
    const expires = params.expiresInMinutes ?? 60;
    const subject = 'Reset your KANAP password';
    const baseUrl = params.resetUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || '';
    const preferencesUrl = baseUrl ? baseUrl + '/settings/notifications' : undefined;
    const body = `
      <p>Hello,</p>
      <p>We received a request to reset the password associated with this email address.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.resetUrl}" style="background: #2D69E0; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Reset password
        </a>
      </p>
      <p>If the button above does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">
        <a href="${params.resetUrl}">${params.resetUrl}</a>
      </p>
      <p>This link will expire in approximately ${expires} minutes. If you did not request a password reset, you can safely ignore this email.</p>
    `;
    const html = emailWrapper(body, { preferencesUrl });
    const text = `Hello,\n\n` +
      `We received a request to reset the password associated with this email address.\n\n` +
      `Reset your password: ${params.resetUrl}\n\n` +
      `This link will expire in approximately ${expires} minutes. If you did not request a password reset, you can safely ignore this email.` +
      (preferencesUrl ? `\n\nManage notification preferences: ${preferencesUrl}` : '');
    await this.send({ to: params.to, subject, html, text });
  }

  async sendUserInviteEmail(params: {
    to: string;
    inviteUrl: string;
    expiresInMinutes?: number;
    roleName?: string | null;
    inviterEmail?: string | null;
  }) {
    const expires = params.expiresInMinutes ?? 60;
    const subject = 'You are invited to KANAP';
    const roleLine = params.roleName ? ` as ${params.roleName}` : '';
    const inviterLine = params.inviterEmail ? ` by ${params.inviterEmail}` : '';
    const baseUrl = params.inviteUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || '';
    const preferencesUrl = baseUrl ? baseUrl + '/settings/notifications' : undefined;
    const body = `
      <p>Hello,</p>
      <p>You have been invited${inviterLine} to join KANAP${roleLine}.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.inviteUrl}" style="background: #2D69E0; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Set your password
        </a>
      </p>
      <p>If the button above does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">
        <a href="${params.inviteUrl}">${params.inviteUrl}</a>
      </p>
      <p>This link will expire in approximately ${expires} minutes. Once complete, you can sign in using your email and new password.</p>
    `;
    const html = emailWrapper(body, { preferencesUrl });
    const text = `Hello,\n\n` +
      `You have been invited${inviterLine} to join KANAP${roleLine}.\n\n` +
      `Set your password: ${params.inviteUrl}\n\n` +
      `This link will expire in approximately ${expires} minutes. Once complete, you can sign in using your email and new password.` +
      (preferencesUrl ? `\n\nManage notification preferences: ${preferencesUrl}` : '');
    await this.send({ to: params.to, subject, html, text });
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Email service is not configured. Please set RESEND_API_KEY.');
    }
    return this.client;
  }
}
