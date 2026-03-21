import { Body, Controller, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiChatOrchestratorService } from './ai-chat-orchestrator.service';
import { AiPolicyService } from './ai-policy.service';
import { AiExecutionContext } from './ai.types';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';

@Controller('ai/chat')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiChatController {
  private readonly logger = new Logger(AiChatController.name);

  constructor(
    private readonly orchestrator: AiChatOrchestratorService,
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
  ) {}

  private buildContext(req: any): AiExecutionContext {
    return {
      tenantId: String(req?.tenant?.id || ''),
      userId: String(req?.user?.sub || ''),
      isPlatformHost: req?.isPlatformHost === true,
      surface: 'chat',
      authMethod: 'jwt',
      requestId: req?.id ?? null,
      aiApiKeyId: null,
    };
  }

  @Post('stream')
  async stream(
    @Body() body: { message: string; conversation_id?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const context = this.buildContext(req);

    await this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
    });

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      for await (const event of this.orchestrator.stream({
        context,
        conversationId: body.conversation_id,
        userMessage: body.message,
      })) {
        if (!clientDisconnected) {
          res.write(JSON.stringify(event) + '\n');
        }
      }
    } catch (err: any) {
      this.logger.error(`Chat stream error: ${err.message}`, err.stack);
      if (!clientDisconnected) {
        try {
          res.write(JSON.stringify({ type: 'error', message: err.message || 'Stream failed.' }) + '\n');
        } catch {
          // Response may already be closed
        }
      }
    }

    if (!clientDisconnected) {
      res.end();
    }
  }
}
