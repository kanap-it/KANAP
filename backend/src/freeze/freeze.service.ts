import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { FreezeScope, FreezeState } from './freeze-state.entity';
import { FxIngestionService } from '../currency/fx-ingestion.service';
import { FxRateService } from '../currency/fx-rate.service';
import { CurrencySettingsService } from '../currency/currency-settings.service';
import { SpendVersion } from '../spend/spend-version.entity';
import { CapexVersion } from '../capex/capex-version.entity';

export type FreezeColumn = 'budget' | 'revision' | 'actual' | 'landing';
export type FreezeTarget = { scope: FreezeScope; columns?: FreezeColumn[] };

const COLUMN_MAP: Record<FreezeColumn, FreezeColumn> = {
  budget: 'budget',
  revision: 'revision',
  actual: 'actual',
  landing: 'landing',
};

export const ALL_KEY = '__all__';

function isColumn(value: any): value is FreezeColumn {
  return value === 'budget' || value === 'revision' || value === 'actual' || value === 'landing';
}

@Injectable()
export class FreezeService {
  constructor(
    @InjectRepository(FreezeState)
    private readonly repo: Repository<FreezeState>,
    private readonly fxIngestion: FxIngestionService,
    private readonly fxRates: FxRateService,
    private readonly currencySettings: CurrencySettingsService,
  ) {}

  private manager(opts?: { manager?: EntityManager }) {
    return (opts?.manager ?? this.repo.manager);
  }

  private normalizeScope(raw: string): FreezeScope {
    const val = (raw || '').toLowerCase();
    if (val === 'opex' || val === 'capex' || val === 'companies' || val === 'departments') return val;
    throw new BadRequestException(`Unsupported scope '${raw}'`);
  }

  private normalizeColumn(scope: FreezeScope, column?: FreezeColumn | string | null): string {
    if (scope === 'companies' || scope === 'departments') {
      return ALL_KEY;
    }
    if (!column) {
      throw new BadRequestException(`Columns are required for scope '${scope}'`);
    }
    const normalized = (column || '').toLowerCase();
    if (!isColumn(normalized)) {
      throw new BadRequestException(`Unsupported column '${column}' for scope '${scope}'`);
    }
    return COLUMN_MAP[normalized];
  }

  private async currentTenantId(manager: EntityManager): Promise<string | null> {
    const result = await manager.query(`SELECT current_setting('app.current_tenant', true) AS tenant_id`);
    const tenantId = Array.isArray(result) && result.length > 0 ? result[0]?.tenant_id : null;
    return tenantId && typeof tenantId === 'string' && tenantId.length ? tenantId : null;
  }

  private async attachFxRates(scope: 'opex' | 'capex', year: number, manager: EntityManager) {
    const tenantId = await this.currentTenantId(manager);
    if (!tenantId) return;

    await this.fxIngestion.refreshTenant(tenantId, year, { manual: true, manager });
    const settings = await this.currencySettings.getSettings(tenantId, { manager });
    const rateSet = await this.fxRates.getLatestRateSet(tenantId, year, settings.reportingCurrency, { manager });
    if (!rateSet) return;

    const repo = manager.getRepository(scope === 'opex' ? SpendVersion : CapexVersion);
    await repo.createQueryBuilder()
      .update()
      .set({
        fx_rate_set_id: rateSet.id,
        reporting_currency: settings.reportingCurrency,
      })
      .where('budget_year = :year', { year })
      .execute();
  }

  private async detachFxRates(scope: 'opex' | 'capex', year: number, manager: EntityManager) {
    const repo = manager.getRepository(scope === 'opex' ? SpendVersion : CapexVersion);
    await repo.createQueryBuilder()
      .update()
      .set({ fx_rate_set_id: null })
      .where('budget_year = :year', { year })
      .execute();
  }

  async freeze(year: number, targets: FreezeTarget[], userId?: string | null, opts?: { manager?: EntityManager }) {
    if (!Number.isInteger(year)) throw new BadRequestException('Year is required');
    if (!Array.isArray(targets) || targets.length === 0) throw new BadRequestException('No targets provided');
    const mg = this.manager(opts);
    const repo = mg.getRepository(FreezeState);

    const toProcess: Array<{ scope: FreezeScope; columnKey: string }> = [];
    let freezeOpexBudget = false;
    let freezeCapexBudget = false;

    for (const target of targets) {
      const scope = this.normalizeScope(target.scope);
      if (scope === 'opex' || scope === 'capex') {
        const cols = Array.from(new Set(target.columns || Object.keys(COLUMN_MAP))) as FreezeColumn[];
        if (cols.length === 0) {
          throw new BadRequestException(`Columns are required for scope '${scope}'`);
        }
        for (const col of cols) {
          const columnKey = this.normalizeColumn(scope, col);
          if (scope === 'opex' && columnKey === 'budget') freezeOpexBudget = true;
          if (scope === 'capex' && columnKey === 'budget') freezeCapexBudget = true;
          toProcess.push({ scope, columnKey });
        }
      } else {
        toProcess.push({ scope, columnKey: this.normalizeColumn(scope) });
      }
    }

    const now = new Date();
    for (const item of toProcess) {
      let state = await repo.findOne({ where: { budget_year: year, scope: item.scope, columnKey: item.columnKey } as any });
      if (!state) {
        state = repo.create({
          budget_year: year,
          scope: item.scope,
          columnKey: item.columnKey,
        });
      }
      state.is_frozen = true;
      state.frozen_at = now;
      state.frozen_by = userId ?? null;
      state.unfrozen_at = null;
      state.unfrozen_by = null;
      await repo.save(state);
    }

    if (freezeOpexBudget) {
      await this.attachFxRates('opex', year, mg);
    }
    if (freezeCapexBudget) {
      await this.attachFxRates('capex', year, mg);
    }

    return this.getYearState(year, opts);
  }

  async unfreeze(year: number, targets: FreezeTarget[], userId?: string | null, opts?: { manager?: EntityManager }) {
    if (!Number.isInteger(year)) throw new BadRequestException('Year is required');
    if (!Array.isArray(targets) || targets.length === 0) throw new BadRequestException('No targets provided');
    const mg = this.manager(opts);
    const repo = mg.getRepository(FreezeState);

    const toProcess: Array<{ scope: FreezeScope; columnKey: string }> = [];
    let unfreezeOpexBudget = false;
    let unfreezeCapexBudget = false;

    for (const target of targets) {
      const scope = this.normalizeScope(target.scope);
      if (scope === 'opex' || scope === 'capex') {
        const cols = Array.from(new Set(target.columns || Object.keys(COLUMN_MAP))) as FreezeColumn[];
        if (cols.length === 0) {
          throw new BadRequestException(`Columns are required for scope '${scope}'`);
        }
        for (const col of cols) {
          const columnKey = this.normalizeColumn(scope, col);
          if (scope === 'opex' && columnKey === 'budget') unfreezeOpexBudget = true;
          if (scope === 'capex' && columnKey === 'budget') unfreezeCapexBudget = true;
          toProcess.push({ scope, columnKey });
        }
      } else {
        toProcess.push({ scope, columnKey: this.normalizeColumn(scope) });
      }
    }

    const now = new Date();
    for (const item of toProcess) {
      await repo.update({ budget_year: year, scope: item.scope, columnKey: item.columnKey } as any, {
        is_frozen: false,
        unfrozen_at: now,
        unfrozen_by: userId ?? null,
      });
    }

    if (unfreezeOpexBudget) {
      await this.detachFxRates('opex', year, mg);
    }
    if (unfreezeCapexBudget) {
      await this.detachFxRates('capex', year, mg);
    }

    return this.getYearState(year, opts);
  }

  async getYearState(year: number, opts?: { manager?: EntityManager }) {
    const mg = this.manager(opts);
    const repo = mg.getRepository(FreezeState);
    const entries = await repo.find({ where: { budget_year: year } as any });
    return entries;
  }

  async isFrozen(params: { scope: FreezeScope; column?: FreezeColumn | null; year: number }, opts?: { manager?: EntityManager }) {
    const { scope, column, year } = params;
    if (!Number.isInteger(year)) throw new BadRequestException('year is required');
    const columnKey = this.normalizeColumn(scope, column ?? undefined);
    const mg = this.manager(opts);
    const repo = mg.getRepository(FreezeState);
    const found = await repo.findOne({
      where: {
        budget_year: year,
        scope,
        columnKey,
        is_frozen: true,
      } as any,
    });
    return !!found;
  }

  async assertNotFrozen(params: { scope: FreezeScope; column?: FreezeColumn | null; year: number; action?: string }, opts?: { manager?: EntityManager }) {
    const frozen = await this.isFrozen(params, opts);
    if (frozen) {
      const columnLabel = params.column ?? 'data';
      const scopeLabel = params.scope.toUpperCase();
      const action = params.action ? `${params.action} ` : '';
      throw new ForbiddenException(`${action}not allowed: ${scopeLabel} ${columnLabel} for ${params.year} is frozen`);
    }
  }

  summarize(year: number, entries: FreezeState[]) {
    const summary = {
      year,
      scopes: {
        opex: {
          budget: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          revision: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          actual: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          landing: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
        },
        capex: {
          budget: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          revision: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          actual: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
          landing: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
        },
        companies: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
        departments: { frozen: false, frozenAt: null as Date | null, frozenBy: null as string | null },
      },
    };

    const apply = (slot: { frozen: boolean; frozenAt: Date | null; frozenBy: string | null }, entry: FreezeState) => {
      slot.frozen = true;
      slot.frozenAt = entry.frozen_at ?? null;
      slot.frozenBy = entry.frozen_by ?? null;
    };

    for (const entry of entries) {
      if (!entry.is_frozen) continue;
      if (entry.scope === 'opex' || entry.scope === 'capex') {
        const key = entry.columnKey as FreezeColumn;
        if (isColumn(key)) {
          apply(summary.scopes[entry.scope][key], entry);
        }
      } else if (entry.scope === 'companies') {
        apply(summary.scopes.companies, entry);
      } else if (entry.scope === 'departments') {
        apply(summary.scopes.departments, entry);
      }
    }

    return summary;
  }
}
