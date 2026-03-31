import { Body, Controller, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiChatOrchestratorService } from './ai-chat-orchestrator.service';
import { AiExecutionContext } from './ai.types';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiBuiltinRateLimiter } from './platform/ai-builtin-rate-limiter';
import { AiBuiltinUsageService } from './platform/ai-builtin-usage.service';
import { isAbortError } from './providers/streaming.util';

@Controller('ai/chat')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiChatController {
  private readonly logger = new Logger(AiChatController.name);

  constructor(
    private readonly orchestrator: AiChatOrchestratorService,
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly builtinUsage: AiBuiltinUsageService,
    private readonly builtinRateLimiter: AiBuiltinRateLimiter,
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
    const abortController = new AbortController();
    const prepared = await this.orchestrator.prepareRequest({
      context,
      conversationId: body.conversation_id,
      userMessage: body.message,
      signal: abortController.signal,
    });

    if (prepared.providerSource === 'builtin' && prepared.builtinRateLimits) {
      this.builtinRateLimiter.assertAllowed(context.tenantId, context.userId, prepared.builtinRateLimits);
      await this.tenantExecutor.runWithContext(context, async (ctx) => {
        const limit = await this.builtinUsage.getMonthlyLimitForTenant(ctx.tenantId, ctx.manager);
        await this.builtinUsage.reserveMessage(ctx.tenantId, limit, ctx.manager);
      });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let clientDisconnected = false;
    const handleDisconnect = () => {
      clientDisconnected = true;
      abortController.abort();
    };
    req.on('close', handleDisconnect);
    req.on('aborted', handleDisconnect);

    try {
      for await (const event of this.orchestrator.streamPrepared(prepared, { signal: abortController.signal })) {
        if (!clientDisconnected) {
          res.write(JSON.stringify(event) + '\n');
        }
      }
    } catch (err: any) {
      if (clientDisconnected || isAbortError(err)) {
        return;
      }
      this.logger.error(`Chat stream error: ${err.message}`, err.stack);
      if (!clientDisconnected) {
        try {
          res.write(JSON.stringify({ type: 'error', message: err.message || 'Stream failed.' }) + '\n');
        } catch {
          // Response may already be closed
        }
      }
    } finally {
      req.off('close', handleDisconnect);
      req.off('aborted', handleDisconnect);
    }

    if (!clientDisconnected) {
      res.end();
    }
  }
}
