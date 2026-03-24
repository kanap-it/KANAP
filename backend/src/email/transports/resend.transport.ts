import { Resend } from 'resend';
import type { EmailAttachment, SendEmailOptions } from '../email.types';
import {
  buildExponentialRetryDelay,
  type DeliveryError,
  type EmailRetryConfig,
  type EmailTransport,
} from './email-transport.interface';

function mapAttachments(attachments?: EmailAttachment[]) {
  return attachments?.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    path: attachment.path,
    contentType: attachment.contentType,
    contentId: attachment.contentId,
  }));
}

function extractRetryAfterMs(message: string): number | null {
  const text = String(message || '').toLowerCase();
  if (!text) return null;

  const msMatch = text.match(/(?:retry[- ]?after|try again in)\s*:?\s*([0-9]+)\s*(?:ms|msec|millisecond|milliseconds)\b/);
  if (msMatch) return Math.max(0, Number.parseInt(msMatch[1], 10));

  const secMatch = text.match(/(?:retry[- ]?after|try again in)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  if (secMatch) return Math.max(0, Math.ceil(Number.parseFloat(secMatch[1]) * 1000));

  const headerMatch = text.match(/retry[- ]?after\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/);
  if (headerMatch) return Math.max(0, Math.ceil(Number.parseFloat(headerMatch[1]) * 1000));

  return null;
}

function isResendRateLimitError(err: DeliveryError): boolean {
  if ((err.code || '').toLowerCase() === 'rate_limit_exceeded') return true;

  const details = `${err.name || ''} ${err.message || ''}`.toLowerCase();
  return details.includes('rate limit') || details.includes('429');
}

export class ResendTransport implements EmailTransport {
  readonly name = 'resend';
  readonly defaultMinIntervalMs = 700;
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly defaultFrom: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(options: SendEmailOptions): Promise<void> {
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const replyTo = options.replyTo
      ? (Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo])
      : undefined;

    const result = await this.client.emails.send({
      from: options.from ?? this.defaultFrom,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo,
      headers: options.headers,
      attachments: mapAttachments(options.attachments),
    });

    if (result.error) {
      const error = new Error(result.error.message ?? 'Failed to send email') as DeliveryError;
      error.name = result.error.name ?? 'ResendError';
      error.code = result.error.name;
      throw error;
    }
  }

  getRetryDelayMs(err: DeliveryError, attempt: number, config: EmailRetryConfig): number | null {
    if (!isResendRateLimitError(err)) return null;
    return extractRetryAfterMs(err.message) ?? buildExponentialRetryDelay(attempt, config);
  }
}
