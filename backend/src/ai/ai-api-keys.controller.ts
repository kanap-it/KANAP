import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiApiKeysService } from './ai-api-keys.service';
import { AiPolicyService } from './ai-policy.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiApiKeysController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly apiKeys: AiApiKeysService,
  ) {}

  private buildContext(req: any): AiExecutionContext {
    return {
      tenantId: String(req?.tenant?.id || ''),
      userId: String(req?.user?.sub || ''),
      isPlatformHost: req?.isPlatformHost === true,
      surface: 'mcp',
      authMethod: 'jwt',
      requestId: req?.id ?? null,
      aiApiKeyId: null,
    };
  }

  // Self-service endpoints
  @Post('keys')
  async create(
    @Body() body: { label: string; expires_at?: string },
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(context.tenantId, async (manager) => {
      await this.policy.assertKeyManagementAccess(context, manager);
      return this.apiKeys.createKey(
        {
          tenantId: context.tenantId,
          userId: context.userId,
          label: body.label,
          expiresAt: body.expires_at ? new Date(body.expires_at) : null,
          createdByUserId: context.userId,
        },
        { manager },
      );
    });
  }

  @Get('keys')
  async list(@Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(context.tenantId, async (manager) => {
      await this.policy.assertKeyManagementAccess(context, manager);
      return this.apiKeys.listForUser(context.tenantId, context.userId, { manager });
    });
  }

  @Delete('keys/:id')
  async revoke(@Param('id') id: string, @Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(context.tenantId, async (manager) => {
      await this.policy.assertKeyManagementAccess(context, manager);
      const key = await this.apiKeys.findById(id, { manager });
      if (!key || key.tenant_id !== context.tenantId || key.user_id !== context.userId) {
        throw new ForbiddenException('Key not found or access denied.');
      }
      return this.apiKeys.revokeKey(id, { manager });
    });
  }

  // Admin endpoints
  @Get('admin/keys')
  async adminList(@Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(context.tenantId, async (manager) => {
      await this.policy.assertSettingsAccess(context, manager);
      return this.apiKeys.listForTenant(context.tenantId, { manager });
    });
  }

  @Delete('admin/keys/:id')
  async adminRevoke(@Param('id') id: string, @Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(context.tenantId, async (manager) => {
      await this.policy.assertSettingsAccess(context, manager);
      const key = await this.apiKeys.findById(id, { manager });
      if (!key || key.tenant_id !== context.tenantId) {
        throw new ForbiddenException('Key not found.');
      }
      return this.apiKeys.revokeKey(id, { manager });
    });
  }
}
