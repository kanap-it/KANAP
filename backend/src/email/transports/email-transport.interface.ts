import type { SendEmailOptions } from '../email.types';

export type DeliveryError = Error & { code?: string; responseCode?: number };

export interface EmailRetryConfig {
  baseMs: number;
  maxMs: number;
  jitterMs: number;
}

export interface EmailTransport {
  readonly name: string;
  readonly defaultMinIntervalMs: number;
  send(options: SendEmailOptions): Promise<void>;
  getRetryDelayMs(err: DeliveryError, attempt: number, config: EmailRetryConfig): number | null;
}

export function buildExponentialRetryDelay(attempt: number, config: EmailRetryConfig): number {
  const exponentialDelay = config.baseMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxMs);
  const jitter = config.jitterMs > 0
    ? Math.floor(Math.random() * (config.jitterMs + 1))
    : 0;
  return cappedDelay + jitter;
}
