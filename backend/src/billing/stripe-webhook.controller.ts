import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly svc: StripeWebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    const raw = this.getRawBody(req);
    const event = this.svc.constructEvent(raw, signature);
    await this.svc.processEvent(event);
    return { received: true };
  }

  private getRawBody(req: Request): Buffer {
    const body = (req as any).rawBody ?? req.body;
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (typeof body === 'string') {
      return Buffer.from(body, 'utf8');
    }
    if (body === undefined || body === null) {
      return Buffer.from('', 'utf8');
    }
    return Buffer.from(JSON.stringify(body));
  }
}
