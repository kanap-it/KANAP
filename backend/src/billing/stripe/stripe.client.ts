import { Injectable, Logger } from '@nestjs/common';
import { StripeConfigService } from './stripe.config';

type StripeInstance = any;

declare const require: any;

@Injectable()
export class StripeClientService {
  private readonly logger = new Logger(StripeClientService.name);
  private stripe: StripeInstance | null = null;

  constructor(private readonly config: StripeConfigService) {}

  getClient(): StripeInstance | null {
    if (!this.config.isConfigured()) {
      return null;
    }
    if (!this.stripe) {
      try {
        const Stripe = require('stripe');
        this.stripe = new Stripe(this.config.getSecretKey(), {
          apiVersion: this.config.getApiVersion(),
        });
      } catch (error) {
        this.logger.error('Failed to initialise Stripe client', error instanceof Error ? error.stack : String(error));
        throw error;
      }
    }
    return this.stripe;
  }
}
