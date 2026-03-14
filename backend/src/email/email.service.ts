import { Injectable, Logger } from '@nestjs/common';
import { Resend, type Attachment as ResendAttachment } from 'resend';
import { emailWrapper } from '../notifications/notification-templates';
import type { EmailBranding } from './email-branding';
import { FeatureDisabledError } from '../common/feature-gates';

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

type DeliveryError = Error & { code?: string };

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Resend | null;
  private readonly defaultFrom: string;
  private readonly emailOverride: string | null;

  // Queue + rate limiting (single-process). Defaults target <= ~1.4 req/sec.
  private emailQueue: QueuedEmail[] = [];
  private isProcessingQueue = false;
  private nextSendAtMs = 0;

  private readonly RATE_LIMIT_DELAY_MS: number;
  private readonly RATE_LIMIT_MAX_RETRIES: number;
  private readonly RATE_LIMIT_RETRY_BASE_MS: number;
  private readonly RATE_LIMIT_RETRY_MAX_MS: number;
  private readonly RATE_LIMIT_RETRY_JITTER_MS: number;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.RESEND_FROM_EMAIL ?? 'KANAP <no-reply@kanap.net>';
    this.emailOverride = process.env.EMAIL_OVERRIDE?.trim() || null;
    this.RATE_LIMIT_DELAY_MS = this.readPositiveIntEnv('EMAIL_QUEUE_MIN_INTERVAL_MS', 700);
    this.RATE_LIMIT_MAX_RETRIES = this.readPositiveIntEnv('EMAIL_RATE_LIMIT_MAX_RETRIES', 5);
    this.RATE_LIMIT_RETRY_BASE_MS = this.readPositiveIntEnv('EMAIL_RATE_LIMIT_RETRY_BASE_MS', 1_500);
    this.RATE_LIMIT_RETRY_MAX_MS = this.readPositiveIntEnv('EMAIL_RATE_LIMIT_RETRY_MAX_MS', 30_000);
    this.RATE_LIMIT_RETRY_JITTER_MS = this.readPositiveIntEnv('EMAIL_RATE_LIMIT_RETRY_JITTER_MS', 250);
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

    try {
      while (this.emailQueue.length > 0) {
        const item = this.emailQueue.shift()!;
        try {
          await this.sendWithRateLimitRetry(item.options);
          item.resolve();
        } catch (err) {
          item.reject(this.normalizeError(err));
        }
      }
    } finally {
      this.isProcessingQueue = false;
      // Queue can grow while we are draining; restart safely if needed.
      if (this.emailQueue.length > 0) {
        void this.processQueue();
      }
    }
  }

  private async sendWithRateLimitRetry(options: SendEmailOptions): Promise<void> {
    let attempt = 0;
    while (true) {
      await this.waitForSendSlot();
      try {
        await this.sendImmediate(options);
        return;
      } catch (err) {
        const normalized = this.normalizeError(err);
        const retryDelayMs = this.getRateLimitRetryDelayMs(normalized, attempt);
        if (retryDelayMs === null || attempt >= this.RATE_LIMIT_MAX_RETRIES) {
          throw normalized;
        }

        attempt += 1;
        const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        this.logger.warn(
          `Resend rate limit hit for ${to}; retry ${attempt}/${this.RATE_LIMIT_MAX_RETRIES} in ${retryDelayMs}ms`,
        );

        this.deferNextSendUntil(Date.now() + retryDelayMs);
        await sleep(retryDelayMs);
      }
    }
  }

  private async waitForSendSlot(): Promise<void> {
    const now = Date.now();
    const waitMs = this.nextSendAtMs - now;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    this.nextSendAtMs = Date.now() + this.RATE_LIMIT_DELAY_MS;
  }

  private deferNextSendUntil(timestampMs: number): void {
    this.nextSendAtMs = Math.max(this.nextSendAtMs, timestampMs);
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

    let data: unknown;
    let error: { name?: string; message?: string } | null = null;
    try {
      const result = await client.emails.send({
        from: options.from ?? this.defaultFrom,
        to,
        subject,
        html: options.html,
        text: options.text,
        replyTo,
        headers: options.headers,
        attachments: options.attachments,
      });
      data = result.data;
      error = result.error;
    } catch (err) {
      const normalized = this.normalizeError(err);
      this.logger.error(`Failed to send email via Resend: ${normalized.name} - ${normalized.message}`);
      throw normalized;
    }
    if (error) {
      this.logger.error(`Failed to send email via Resend: ${error.name} - ${error.message}`);
      throw this.createDeliveryError(error.message ?? 'Failed to send email', error.name);
    }
    return data;
  }

  async sendPasswordResetEmail(params: { to: string; resetUrl: string; expiresInMinutes?: number; branding?: EmailBranding }) {
    const expires = params.expiresInMinutes ?? 60;
    const branding = params.branding;
    const pc = branding?.primaryColor ?? '#2D69E0';
    const subject = 'Reset your KANAP password';
    const baseUrl = params.resetUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || '';
    const preferencesUrl = baseUrl ? baseUrl + '/settings/notifications' : undefined;
    const body = `
      <p>Hello,</p>
      <p>We received a request to reset the password associated with this email address.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.resetUrl}" style="background: ${pc}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Reset password
        </a>
      </p>
      <p>If the button above does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">
        <a href="${params.resetUrl}">${params.resetUrl}</a>
      </p>
      <p>This link will expire in approximately ${expires} minutes. If you did not request a password reset, you can safely ignore this email.</p>
    `;
    const wrapper = emailWrapper(body, { preferencesUrl, branding });
    const text = `Hello,\n\n` +
      `We received a request to reset the password associated with this email address.\n\n` +
      `Reset your password: ${params.resetUrl}\n\n` +
      `This link will expire in approximately ${expires} minutes. If you did not request a password reset, you can safely ignore this email.` +
      (preferencesUrl ? `\n\nManage notification preferences: ${preferencesUrl}` : '');
    await this.send({ to: params.to, subject, html: wrapper.html, text, attachments: wrapper.attachments });
  }

  async sendUserInviteEmail(params: {
    to: string;
    inviteUrl: string;
    expiresInMinutes?: number;
    roleName?: string | null;
    inviterEmail?: string | null;
    branding?: EmailBranding;
  }) {
    const expires = params.expiresInMinutes ?? 60;
    const branding = params.branding;
    const pc = branding?.primaryColor ?? '#2D69E0';
    const subject = 'You are invited to KANAP';
    const roleLine = params.roleName ? ` as ${params.roleName}` : '';
    const inviterLine = params.inviterEmail ? ` by ${params.inviterEmail}` : '';
    const baseUrl = params.inviteUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || '';
    const preferencesUrl = baseUrl ? baseUrl + '/settings/notifications' : undefined;
    const body = `
      <p>Hello,</p>
      <p>You have been invited${inviterLine} to join KANAP${roleLine}.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.inviteUrl}" style="background: ${pc}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Set your password
        </a>
      </p>
      <p>If the button above does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">
        <a href="${params.inviteUrl}">${params.inviteUrl}</a>
      </p>
      <p>This link will expire in approximately ${expires} minutes. Once complete, you can sign in using your email and new password.</p>
    `;
    const wrapper = emailWrapper(body, { preferencesUrl, branding });
    const text = `Hello,\n\n` +
      `You have been invited${inviterLine} to join KANAP${roleLine}.\n\n` +
      `Set your password: ${params.inviteUrl}\n\n` +
      `This link will expire in approximately ${expires} minutes. Once complete, you can sign in using your email and new password.` +
      (preferencesUrl ? `\n\nManage notification preferences: ${preferencesUrl}` : '');
    await this.send({ to: params.to, subject, html: wrapper.html, text, attachments: wrapper.attachments });
  }

  private ensureClient() {
    if (!this.client) {
      throw new FeatureDisabledError('email', 'Email service is not configured. Set RESEND_API_KEY.');
    }
    return this.client;
  }

  private createDeliveryError(message: string, code?: string): DeliveryError {
    const error = new Error(message) as DeliveryError;
    if (code) error.code = code;
    return error;
  }

  private normalizeError(err: unknown): DeliveryError {
    if (err instanceof Error) return err as DeliveryError;
    if (typeof err === 'string') return new Error(err) as DeliveryError;
    return new Error('Unknown email send error') as DeliveryError;
  }

  private getRateLimitRetryDelayMs(err: DeliveryError, attempt: number): number | null {
    if (!this.isRateLimitError(err)) return null;

    const explicitRetryAfterMs = this.extractRetryAfterMs(err.message);
    if (explicitRetryAfterMs !== null) return explicitRetryAfterMs;

    const exponentialDelay = this.RATE_LIMIT_RETRY_BASE_MS * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.RATE_LIMIT_RETRY_MAX_MS);
    const jitter = this.RATE_LIMIT_RETRY_JITTER_MS > 0
      ? Math.floor(Math.random() * (this.RATE_LIMIT_RETRY_JITTER_MS + 1))
      : 0;
    return cappedDelay + jitter;
  }

  private isRateLimitError(err: DeliveryError): boolean {
    if ((err.code || '').toLowerCase() === 'rate_limit_exceeded') return true;

    const details = `${err.name || ''} ${err.message || ''}`.toLowerCase();
    return details.includes('rate limit') || details.includes('429');
  }

  private extractRetryAfterMs(message: string): number | null {
    const text = String(message || '').toLowerCase();
    if (!text) return null;

    const msMatch = text.match(/(?:retry[- ]?after|try again in)\s*:?\s*([0-9]+)\s*(?:ms|msec|millisecond|milliseconds)\b/);
    if (msMatch) return Math.max(0, parseInt(msMatch[1], 10));

    const secMatch = text.match(/(?:retry[- ]?after|try again in)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:s|sec|secs|second|seconds)\b/);
    if (secMatch) return Math.max(0, Math.ceil(parseFloat(secMatch[1]) * 1000));

    const headerMatch = text.match(/retry[- ]?after\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/);
    if (headerMatch) return Math.max(0, Math.ceil(parseFloat(headerMatch[1]) * 1000));

    return null;
  }

  private readPositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw || raw.trim().length === 0) return fallback;

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      this.logger.warn(`${name} is invalid (${raw}); using default ${fallback}`);
      return fallback;
    }
    return parsed;
  }
}
