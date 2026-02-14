import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FreezeService, FreezeTarget } from './freeze.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { ALL_KEY } from './freeze.service';

@UseGuards(JwtAuthGuard)
@Controller('freeze-states')
export class FreezeController {
  constructor(private readonly freeze: FreezeService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'reader')
  async list(@Query('year') yearRaw: string, @Req() req: any) {
    const parsed = Number(yearRaw ?? new Date().getFullYear());
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Invalid year');
    }
    const year = Math.trunc(parsed);
    const entries = await this.freeze.getYearState(year, { manager: req?.queryRunner?.manager });
    return {
      year,
      entries: entries.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        column: entry.columnKey === ALL_KEY ? null : entry.columnKey,
        isFrozen: entry.is_frozen,
        frozenAt: entry.frozen_at,
        frozenBy: entry.frozen_by,
        unfrozenAt: entry.unfrozen_at,
        unfrozenBy: entry.unfrozen_by,
      })),
      summary: this.freeze.summarize(year, entries),
    };
  }

  private normalizeTargets(raw: any): FreezeTarget[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const scope = item?.scope;
      const columns = Array.isArray(item?.columns)
        ? item.columns.map((c: any) => (typeof c === 'string' ? c.toLowerCase() : c))
        : undefined;
      return { scope, columns } as FreezeTarget;
    });
  }

  @Post('freeze')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async freezeAction(@Body() body: any, @Req() req: any) {
    const year = Number(body?.year);
    const targets = this.normalizeTargets(body?.scopes);
    const entries = await this.freeze.freeze(year, targets, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
    return {
      year,
      entries: entries.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        column: entry.columnKey === ALL_KEY ? null : entry.columnKey,
        isFrozen: entry.is_frozen,
        frozenAt: entry.frozen_at,
        frozenBy: entry.frozen_by,
        unfrozenAt: entry.unfrozen_at,
        unfrozenBy: entry.unfrozen_by,
      })),
      summary: this.freeze.summarize(year, entries),
    };
  }

  @Post('unfreeze')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async unfreezeAction(@Body() body: any, @Req() req: any) {
    const year = Number(body?.year);
    const targets = this.normalizeTargets(body?.scopes);
    const entries = await this.freeze.unfreeze(year, targets, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
    return {
      year,
      entries: entries.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        column: entry.columnKey === ALL_KEY ? null : entry.columnKey,
        isFrozen: entry.is_frozen,
        frozenAt: entry.frozen_at,
        frozenBy: entry.frozen_by,
        unfrozenAt: entry.unfrozen_at,
        unfrozenBy: entry.unfrozen_by,
      })),
      summary: this.freeze.summarize(year, entries),
    };
  }
}
