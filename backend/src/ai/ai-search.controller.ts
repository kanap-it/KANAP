import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiEntityService } from './ai-entity.service';
import { AiPolicyService } from './ai-policy.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
/** Max results per entity_type in the picker. Prevents a single type (typically the
 * most recently-updated one) from monopolising all the slots when the user types
 * a generic query like a single letter. The popover groups results by type, so a
 * cap yields a more useful round-up of recent matches across the workspace. */
const PER_TYPE_CAP = 3;

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
    @Query('entity_types') entityTypesRaw?: string,
  ) {
    const query = (q || '').trim();
    const limit = Math.min(Math.max(Number.parseInt(limitRaw || '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    // Comma-separated entity_types narrow the search down to a specific subset.
    // Used by the @-mention picker when the query has a recognized ref prefix
    // (e.g. `@T-` → tasks only) so the user gets focused results instead of a
    // generic blend across the whole workspace.
    const entityTypes = (entityTypesRaw || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Empty query is allowed only when the caller has narrowed to specific
    // entity_types — that's the "show me recent items of this type" pattern
    // (e.g. user typed `@T-` → list recent tasks). Without a narrow, we don't
    // want to fetch the entire workspace.
    if (!query && entityTypes.length === 0) {
      return { items: [] };
    }

    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);
      // Use the per-type search instead of the cross-type searchAll. searchAll's
      // ranking compares incomparable score scales (knowledge search uses the
      // index-based fetchLimit-index, SQL searches use a 1..4 CASE), so
      // documents always end up monopolising every visible slot. The per-type
      // path returns at most PER_TYPE_CAP matches from each entity type and
      // lets the popover present a real cross-section of the workspace.
      const grouped = await this.entities.searchByEntityTypes(ctx, {
        query,
        limitPerType: PER_TYPE_CAP,
        ...(entityTypes.length > 0 ? { entity_types: entityTypes as any } : {}),
      });

      const items: Array<{ entity_type: string; id: string; ref: string | null; label: string | null }> = [];
      for (const group of grouped.groups) {
        for (const item of group.items) {
          if (items.length >= limit) break;
          const id = String((item as any).id || '');
          if (!id) continue;
          items.push({
            entity_type: group.entity_type,
            id,
            ref: item.ref ? String(item.ref) : null,
            label: item.label ? String(item.label) : null,
          });
        }
        if (items.length >= limit) break;
      }
      return { items };
    });
  }
}
