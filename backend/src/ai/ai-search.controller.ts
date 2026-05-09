import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiEntityService } from './ai-entity.service';
import { AiPolicyService } from './ai-policy.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
/** Internal pool size requested from the entity service. The picker re-ranks the
 * pool by content tier and trims to the user's limit, so we want enough candidates
 * to make sure tier-1 (ref) and tier-2 (label) matches surface from every type. */
const CANDIDATE_POOL = 200;

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

  /**
   * Tier-based re-ranking helper. The per-type searches inside AiEntityService each
   * compute a SQL-side CASE score on a 1..4 scale (or, for the document index, an
   * index-based fetchLimit-index), and these scales aren't comparable across types.
   * Once we have a flat candidate pool we ignore those scores and rank purely on
   * what's visible in the result row:
   *
   *   100 — ref exact match (case-insensitive). Either the query is the full ref
   *         (e.g. "T-5" matches T-5) or the query is the bare item number (e.g.
   *         "5" matches T-5, PRJ-5, …).
   *    50 — label contains the query as a substring (case-insensitive).
   *    10 — matched by something else (description, snippet, related entity name).
   *
   * Empty query degrades everything to 10, which collapses the sort to "recent
   * items first" — the natural behaviour for the bare `@` trigger.
   */
  private computeTier(item: { ref?: string | null; label?: string | null }, query: string): number {
    const trimmed = query.trim();
    if (!trimmed) return 10;
    const queryLower = trimmed.toLowerCase();
    const ref = (item.ref || '').toLowerCase();
    if (ref) {
      if (ref === queryLower) return 100;
      // Bare number match: query "5" → matches refs ending in "-5" (T-5, PRJ-5…).
      const refNumberMatch = ref.match(/-(\d+)$/);
      if (refNumberMatch && /^\d+$/.test(trimmed) && refNumberMatch[1] === trimmed) {
        return 100;
      }
    }
    const label = (item.label || '').toLowerCase();
    if (label && label.includes(queryLower)) return 50;
    return 10;
  }

  @Get('entities')
  async searchEntities(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const query = (q || '').trim();
    const limit = Math.min(Math.max(Number.parseInt(limitRaw || '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const context = this.buildContext(req);
    return this.tenantExecutor.runWithContext(context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);

      // Pull a generous candidate pool from the cross-type search so every entity
      // type that has any kind of match is represented. The per-type SQL searches
      // each cap at fetchLimit, so even with CANDIDATE_POOL=200 we get at most
      // ~200 items across all types — well below DB cost concerns. Empty queries
      // hit a different shortcut (all items match via ILIKE '%%'), so we just
      // pull the most-recent items of each type.
      const result = await this.entities.searchAll(ctx, {
        query: query || ' ', // single-space sentinel — ILIKE '% %' isn't perfect but
                              // matches anything containing whitespace, which is most
                              // labels. For empty-query "show recent" we'd rather use
                              // the searchAll path than hand-roll a separate listing.
        limit: CANDIDATE_POOL,
      });

      // Re-rank purely on item content, then sort tier desc + recency desc.
      const ranked = (result.items as any[])
        .map((item) => ({
          item,
          tier: this.computeTier(item, query),
          updated: new Date(item.updated_at || 0).getTime(),
        }))
        .sort((a, b) => {
          if (a.tier !== b.tier) return b.tier - a.tier;
          return b.updated - a.updated;
        });

      const items = ranked.slice(0, limit).map(({ item }) => ({
        entity_type: String(item.type || ''),
        id: String(item.id || ''),
        ref: item.ref ? String(item.ref) : null,
        label: item.label ? String(item.label) : null,
      })).filter((entry) => entry.entity_type && entry.id);

      return { items };
    });
  }
}
