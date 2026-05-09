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
 * most recently-updated one) from monopolizing all the slots when the user types
 * a generic query like a single letter. The popover groups results by type, so a
 * cap yields a more useful round-up of recent matches across the workspace. */
const PER_TYPE_CAP = 3;
/** Pull a generous candidate pool from searchAll so the per-type cap has something
 * to choose from. searchAll's own per-type internal limits are bounded too. */
const CANDIDATE_POOL = 30;

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
      const result = await this.entities.searchAll(ctx, {
        // Empty query is fine here: each searchXxx wraps the value in `%${q}%`,
        // so `q=''` becomes `'%%'` which matches every row. Combined with the
        // existing ORDER BY score/updated_at, that gives us a "recent items in
        // this type" list for the narrow-only case.
        query,
        limit: CANDIDATE_POOL,
        ...(entityTypes.length > 0 ? { entity_types: entityTypes as any } : {}),
      });

      // Cap each entity_type at PER_TYPE_CAP to keep the picker diverse. Order
      // among per-type matches is preserved (searchAll already ranks by score
      // then recency), so the cap effectively keeps the top-N strongest matches
      // per type and discards the long tail.
      const counts = new Map<string, number>();
      const balanced: Array<{ entity_type: string; id: string; ref: string | null; label: string | null }> = [];
      for (const item of result.items as any[]) {
        const type = String(item.type || '');
        const id = String(item.id || '');
        if (!type || !id) continue;
        const c = counts.get(type) || 0;
        if (c >= PER_TYPE_CAP) continue;
        counts.set(type, c + 1);
        balanced.push({
          entity_type: type,
          id,
          ref: item.ref ? String(item.ref) : null,
          label: item.label ? String(item.label) : null,
        });
        if (balanced.length >= limit) break;
      }
      return { items: balanced };
    });
  }
}
