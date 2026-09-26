import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, EntityManager } from 'typeorm';
import { SpendAmount } from './spend-amount.entity';
import { SpreadProfile } from './spread-profile.entity';
import { SpendVersion } from './spend-version.entity';
import { AuditService } from '../audit/audit.service';
import { FreezeService } from '../freeze/freeze.service';
import { addCents, formatCents } from '../common/amount';
import { writeAmountsPayload } from './amounts-write.util';
import { FLAT_WEIGHTS, profileWeights } from './spread.util';

type AnnualPayload = {
  kind: 'annual';
  year: number;
  totals: Partial<Record<'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing', number>>;
  spread_profile_name?: string; // default 'flat' (equal twelfths); a named SpreadProfile applies its 12 weights
};

type QuarterlyPayload = {
  kind: 'quarterly';
  year: number;
  measure: 'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing';
  Q1?: number; Q2?: number; Q3?: number; Q4?: number;
  spread_profile_name?: string; // '4-4-5' => 445 distribution, else equal
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
export class SpendAmountsService {
  constructor(
    @InjectRepository(SpendAmount) private readonly repo: Repository<SpendAmount>,
    @InjectRepository(SpreadProfile) private readonly profiles: Repository<SpreadProfile>,
    @InjectRepository(SpendVersion) private readonly versions: Repository<SpendVersion>,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
  ) {}

  async bulkUpsert(versionId: string, payload: AnnualPayload | QuarterlyPayload | MonthlyPayload, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const version = await mg.getRepository(SpendVersion).findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');

    // 'flat' (or unset) spreads equally across 12 months; a named SpreadProfile
    // applies its stored 12 weights, which the spread normalises. Falls back to
    // equal twelfths if the profile is missing or malformed.
    const annualWeights = async (profileName: string | undefined): Promise<readonly bigint[]> => {
      if (!profileName || profileName === 'flat') return FLAT_WEIGHTS;
      const profile = await mg.getRepository(SpreadProfile).findOne({ where: { name: profileName } });
      return profileWeights(profile?.weights_json) ?? FLAT_WEIGHTS;
    };

    const { before, after } = await writeAmountsPayload(
      { manager: mg, freeze: this.freeze, scope: 'opex', version },
      payload,
      annualWeights,
    );

    await this.audit.log({ table: 'spend_amounts', recordId: null, action: 'update', before, after, userId }, { manager: mg });

    return { updated: after.length };
  }

  async listByYear(versionId: string, year?: number, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const versions = mg.getRepository(SpendVersion);
    const repo = mg.getRepository(SpendAmount);
    let targetYear = year;
    if (!targetYear) {
      const version = await versions.findOne({ where: { id: versionId } });
      if (!version) throw new NotFoundException('Version not found');
      targetYear = (version as any).budget_year as number;
    }
    const start = `${targetYear}-01-01`;
    const end = `${targetYear}-12-31`;
    const items = await repo.find({
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
