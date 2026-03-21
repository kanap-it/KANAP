import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
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

  @Get()
  async list(@Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      const items = await this.conversations.listForUser(ctx.tenantId, ctx.userId, {
        manager: ctx.manager,
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
