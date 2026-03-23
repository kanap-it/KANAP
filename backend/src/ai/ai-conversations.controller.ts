import { BadRequestException, Controller, Delete, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiConversationService } from './ai-conversation.service';
import { AiPolicyService } from './ai-policy.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

@Controller('ai/conversations')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiConversationsController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly conversations: AiConversationService,
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

  private parsePositiveInt(rawValue: string | undefined, field: string, defaultValue: number): number {
    if (rawValue == null || rawValue === '') {
      return defaultValue;
    }
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive integer.`);
    }
    return value;
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const context = this.buildContext(req);
    const page = this.parsePositiveInt(pageRaw, 'page', 1);
    const limit = Math.min(this.parsePositiveInt(limitRaw, 'limit', 100), 100);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      const items = await this.conversations.listForUser(ctx.tenantId, ctx.userId, {
        manager: ctx.manager,
        page,
        limit,
      });
      return items.map((c) => ({
        id: c.id,
        title: c.title,
        provider: c.provider,
        model: c.model,
        created_at: c.created_at?.toISOString(),
        updated_at: c.updated_at?.toISOString(),
      }));
    });
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string, @Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      const messages = await this.conversations.listMessagesForUser(id, ctx.tenantId, ctx.userId, {
        manager: ctx.manager,
      });
      return messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        usage_json: m.usage_json,
        created_at: m.created_at?.toISOString(),
      }));
    });
  }

  @Delete(':id')
  async archive(@Param('id') id: string, @Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      await this.conversations.archiveConversation(id, ctx.tenantId, ctx.userId, {
        manager: ctx.manager,
      });
      return { success: true };
    });
  }
}
