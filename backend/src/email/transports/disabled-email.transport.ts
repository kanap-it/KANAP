import { FeatureDisabledError } from '../../common/feature-gates';
import type { SendEmailOptions } from '../email.types';
import type { DeliveryError, EmailRetryConfig, EmailTransport } from './email-transport.interface';

export class DisabledEmailTransport implements EmailTransport {
  readonly name = 'disabled';
  readonly defaultMinIntervalMs = 700;

  constructor(private readonly message: string) {}

  async send(_options: SendEmailOptions): Promise<void> {
    throw new FeatureDisabledError('email', this.message);
  }

  getRetryDelayMs(_err: DeliveryError, _attempt: number, _config: EmailRetryConfig): number | null {
    return null;
  }
}
