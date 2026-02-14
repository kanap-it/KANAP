import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Between, EntityManager } from 'typeorm';
import { CapexAmount } from './capex-amount.entity';
import { CapexVersion } from './capex-version.entity';
import { AuditService } from '../audit/audit.service';
import { spreadAnnualToMonths, spreadQuarterlyToMonths } from '../spend/spread.util';
import { FreezeColumn, FreezeService } from '../freeze/freeze.service';
import { addCents, formatCents, toCents } from '../common/amount';

type AnnualPayload = {
  kind: 'annual';
  year: number;
  totals: Partial<Record<'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing', number>>;
  spread_profile_name?: string;
};

type QuarterlyPayload = {
  kind: 'quarterly';
  year: number;
  measure: 'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing';
  Q1?: number; Q2?: number; Q3?: number; Q4?: number;
  spread_profile_name?: string; // '4-4-5' or equal
};

type MonthlyPayload = {
  kind: 'monthly';
  year: number;
  months: Array<{
    period: string; // 'YYYY-MM-01'
    planned?: number;
    forecast?: number;
    committed?: number;
    actual?: number;
    expected_landing?: number;
  }>;
};

@Injectable()
export class CapexAmountsService {
  constructor(
    @InjectRepository(CapexAmount) private readonly repo: Repository<CapexAmount>,
    @InjectRepository(CapexVersion) private readonly versions: Repository<CapexVersion>,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
  ) {}

  private mapAmountColumn(column: string | undefined): FreezeColumn | null {
    switch (column) {
      case 'planned':
        return 'budget';
      case 'committed':
        return 'revision';
      case 'actual':
        return 'actual';
      case 'expected_landing':
        return 'landing';
      default:
        return null;
    }
  }

  async bulkUpsert(versionId: string, payload: AnnualPayload | QuarterlyPayload | MonthlyPayload, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const versionsRepo = mg.getRepository(CapexVersion);
    const amountsRepo = mg.getRepository(CapexAmount);
    const version = await versionsRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    const tenantId = version.tenant_id;

    let rows: Array<Omit<CapexAmount, 'id' | 'created_at' | 'updated_at'>> = [] as any;
    let periods: string[] = [];
    let before: CapexAmount[] = [];

    const touchedColumns = new Set<FreezeColumn>();
    const registerColumn = (key: string | undefined) => {
      const mapped = this.mapAmountColumn(key);
      if (mapped) touchedColumns.add(mapped);
    };

    const toDbAmount = (value: unknown) => formatCents(toCents(value as any));

    if ((payload as any).kind === 'annual') {
      const weights = Array.from({ length: 12 }, () => 1 / 12);
      const annual = payload as AnnualPayload;
      const totals = annual.totals ?? {};
      for (const key of Object.keys(totals)) {
        if ((totals as any)[key] != null) registerColumn(key);
      }
      const annualRows = spreadAnnualToMonths({
        year: annual.year,
        totals,
        profileWeights: weights,
      });
      periods = annualRows.map((r) => r.period);
      before = await amountsRepo.find({ where: { version_id: versionId, period: In(periods) } });
      const prevByPeriod = new Map(before.map((b) => [b.period, b]));
      rows = annualRows.map((r) => {
        const prev = prevByPeriod.get(r.period);
        const plannedValue = touchedColumns.has('budget') ? r.planned : prev?.planned;
        const committedValue = touchedColumns.has('revision') ? r.committed : prev?.committed;
        const actualValue = touchedColumns.has('actual') ? r.actual : prev?.actual;
        const landingValue = touchedColumns.has('landing') ? r.expected_landing : prev?.expected_landing;
        return {
          version_id: versionId,
          period: r.period,
          planned: toDbAmount(plannedValue ?? 0),
          forecast: toDbAmount((r.forecast ?? prev?.forecast) ?? 0),
          committed: toDbAmount(committedValue ?? 0),
          actual: toDbAmount(actualValue ?? 0),
          expected_landing: toDbAmount(landingValue ?? 0),
          tenant_id: tenantId,
        };
      });
    } else if ((payload as any).kind === 'monthly') {
      const monthly = payload as MonthlyPayload;
      const months = monthly.months ?? [];
      if (!Array.isArray(months) || months.length === 0) throw new BadRequestException('months required');

      periods = months.map((m) => m.period);
      before = await amountsRepo.find({ where: { version_id: versionId, period: In(periods) } });
      const prevByPeriod = new Map(before.map((b) => [b.period, b]));

      for (const month of months) {
        if (Object.prototype.hasOwnProperty.call(month, 'planned')) registerColumn('planned');
        if (Object.prototype.hasOwnProperty.call(month, 'committed')) registerColumn('committed');
        if (Object.prototype.hasOwnProperty.call(month, 'actual')) registerColumn('actual');
        if (Object.prototype.hasOwnProperty.call(month, 'expected_landing')) registerColumn('expected_landing');
      }

      rows = months.map((m) => {
        const prev = prevByPeriod.get(m.period);
        return {
          version_id: versionId,
          period: m.period,
          planned: toDbAmount(m.planned ?? prev?.planned ?? 0),
          forecast: toDbAmount(m.forecast ?? prev?.forecast ?? 0),
          committed: toDbAmount(m.committed ?? prev?.committed ?? 0),
          actual: toDbAmount(m.actual ?? prev?.actual ?? 0),
          expected_landing: toDbAmount(m.expected_landing ?? prev?.expected_landing ?? 0),
          tenant_id: tenantId,
        };
      });
    } else if ((payload as any).kind === 'quarterly') {
      const q = payload as QuarterlyPayload;
      const dist = q.spread_profile_name === '4-4-5' ? '445' : 'equal';
      registerColumn(q.measure);
      rows = spreadQuarterlyToMonths({
        year: q.year,
        measure: q.measure,
        quarters: { Q1: q.Q1 ?? 0, Q2: q.Q2 ?? 0, Q3: q.Q3 ?? 0, Q4: q.Q4 ?? 0 },
        distribution: dist,
      }).map((r) => ({
        version_id: versionId,
        period: r.period,
        planned: toDbAmount(r.planned),
        forecast: toDbAmount(r.forecast),
        committed: toDbAmount(r.committed),
        actual: toDbAmount(r.actual),
        expected_landing: toDbAmount(r.expected_landing),
        tenant_id: tenantId,
      }));
      periods = rows.map((r) => r.period);
      before = await amountsRepo.find({ where: { version_id: versionId, period: In(periods) } });
    } else {
      throw new BadRequestException('Unsupported payload');
    }

    if (touchedColumns.size > 0) {
      const year = (payload as any).year as number;
      for (const column of touchedColumns) {
        await this.freeze.assertNotFrozen({ scope: 'capex', column, year }, { manager: mg });
      }
    }

    await amountsRepo.upsert(rows as any, { conflictPaths: ['version_id', 'period'] });

    const after = await amountsRepo.find({ where: { version_id: versionId, period: In(periods) } });
    await this.audit.log({ table: 'capex_amounts', recordId: null, action: 'update', before, after, userId }, { manager: mg });
    return { updated: after.length };
  }

  async listByYear(versionId: string, year?: number, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    let targetYear = year;
    if (!targetYear) {
      const version = await mg.getRepository(CapexVersion).findOne({ where: { id: versionId } });
      if (!version) throw new NotFoundException('Version not found');
      targetYear = (version as any).budget_year as number;
    }
    const start = `${targetYear}-01-01`;
    const end = `${targetYear}-12-31`;
    const items = await mg.getRepository(CapexAmount).find({
      where: { version_id: versionId, period: Between(start, end) as any } as any,
      order: { period: 'ASC' as any },
    });

    const totals = items.reduce(
      (acc, it: any) => {
        acc.planned = addCents(acc.planned, it.planned);
        acc.actual = addCents(acc.actual, it.actual);
        acc.expected_landing = addCents(acc.expected_landing, it.expected_landing);
        acc.committed = addCents(acc.committed, it.committed);
        acc.forecast = addCents(acc.forecast, it.forecast);
        return acc;
      },
      { planned: 0n, actual: 0n, expected_landing: 0n, committed: 0n, forecast: 0n }
    );

    const roundedTotals = {
      planned: Number(formatCents(totals.planned)),
      actual: Number(formatCents(totals.actual)),
      expected_landing: Number(formatCents(totals.expected_landing)),
      committed: Number(formatCents(totals.committed)),
      forecast: Number(formatCents(totals.forecast)),
    };
    return { items, totals: roundedTotals, year: targetYear };
  }
}
