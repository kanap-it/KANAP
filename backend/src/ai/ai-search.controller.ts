import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiEntityService } from './ai-entity.service';
import { AiPolicyService } from './ai-policy.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

/**
 * Lightweight entity search endpoint backing the @-mention autocomplete in the Plaid
 * composer. Reuses AiEntityService.searchAll so all permission filtering, tenant
 * scoping, and ranking logic stays in one place — this controller is just a public
 * surface tuned for short, high-frequency typeahead requests.
 */
@Controller('ai/search')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiSearchController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly entities: AiEntityService,
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

  @Get('entities')
  async searchEntities(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const query = (q || '').trim();
    if (!query) return { items: [] };
    const limit = Math.min(Math.max(Number.parseInt(limitRaw || '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      const result = await this.entities.searchAll(ctx, { query, limit });
      // Strip the verbose payload down to what the autocomplete actually consumes.
      return {
        items: result.items.map((item: any) => ({
          entity_type: String(item.type || ''),
          id: String(item.id || ''),
          ref: item.ref ? String(item.ref) : null,
          label: item.label ? String(item.label) : null,
        })).filter((item: any) => item.entity_type && item.id),
      };
    });
  }
}
