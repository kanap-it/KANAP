import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FreezeColumn, FreezeService } from '../freeze/freeze.service';
import { formatCents, toCents } from '../common/amount';
import { FLAT_WEIGHTS, spreadAnnualToMonths, spreadQuarterlyToMonths } from './spread.util';

/**
 * The one way amounts are written, for OPEX (`spend_amounts`) and CAPEX
 * (`capex_amounts`): the amounts services, the item CSV importers and the
 * budget column operations all go through here.
 *
 * A write names its target measures and leaves every other measure as stored.
 * It updates only those columns with `INSERT … ON CONFLICT DO UPDATE SET
 * <target measures>`, never a read-merge-write of whole rows, so two people
 * editing different measures of the same month cannot overwrite each other.
 * Year, periods and values are validated and every target measure is checked
 * against the freeze inside the caller's transaction.
 */

export type AmountMeasure = 'planned' | 'committed' | 'forecast' | 'actual' | 'expected_landing';
export const AMOUNT_MEASURES: readonly AmountMeasure[] = ['planned', 'committed', 'forecast', 'actual', 'expected_landing'];

export const MEASURE_FREEZE_COLUMN: Record<AmountMeasure, FreezeColumn> = {
  planned: 'budget',
  committed: 'revision',
  forecast: 'forecast',
  actual: 'actual',
  expected_landing: 'landing',
};

const MEASURE_LABELS: Record<AmountMeasure, string> = {
  planned: 'Budget',
  committed: 'Revision',
  forecast: 'Forecast',
  actual: 'Actuals',
  expected_landing: 'Expected landing',
};

/** Columns as the budget operations screens name them. */
export type BudgetColumn = 'budget' | 'revision' | 'follow_up' | 'landing';
export const BUDGET_COLUMN_MEASURE: Record<BudgetColumn, AmountMeasure> = {
  budget: 'planned',
  revision: 'committed',
  follow_up: 'actual',
  landing: 'expected_landing',
};

export type AmountScope = 'opex' | 'capex';
// Table names come only from here: never from the caller.
const AMOUNT_TABLE: Record<AmountScope, string> = { opex: 'spend_amounts', capex: 'capex_amounts' };

export type AmountVersion = { id: string; tenant_id: string; budget_year: number | string };

export type AmountsWriteContext = {
  manager: EntityManager;
  freeze: Pick<FreezeService, 'assertNotFrozen'>;
  scope: AmountScope;
  /** Fetched by the caller under the tenant's RLS; its tenant_id scopes every statement. */
  version: AmountVersion;
  /** Freeze checks already passed in this operation (one per column and year, filled here). */
  checkedFreeze?: Set<string>;
};

/** Amounts of one month, in cents, for the measures being written. */
export type AmountRowInput = { period: string } & Partial<Record<AmountMeasure, bigint>>;

export type StoredAmountRow = {
  id: string;
  tenant_id: string;
  version_id: string;
  period: string;
  planned: string | null;
  forecast: string | null;
  committed: string | null;
  actual: string | null;
  expected_landing: string | null;
  created_at: Date;
  updated_at: Date;
};

/** Rows around the write, for the audit log. */
export type AmountsWriteResult = { periods: string[]; before: StoredAmountRow[]; after: StoredAmountRow[] };

export function isAmountMeasure(value: unknown): value is AmountMeasure {
  return typeof value === 'string' && (AMOUNT_MEASURES as readonly string[]).includes(value);
}

export function measureLabel(measure: AmountMeasure): string {
  return MEASURE_LABELS[measure];
}

function unknownMeasure(key: string): BadRequestException {
  return new BadRequestException(`Unknown amount '${key}'. Use ${AMOUNT_MEASURES.join(', ')}.`);
}

// Amount columns are numeric(18,2): at most 16 digits before the decimal point.
const CENTS_LIMIT = 10n ** 18n;

function assertInRange(cents: bigint, label: string): bigint {
  if ((cents < 0n ? -cents : cents) >= CENTS_LIMIT) throw new BadRequestException(`${label} is too large.`);
  return cents;
}

/** A finite number or a numeric string, in cents. Null is refused: zero is how a value is cleared. */
export function validateAmountValue(value: unknown, label: string): bigint {
  if (value === null || value === undefined) {
    throw new BadRequestException(`${label} cannot be empty; send 0 to clear it.`);
  }
  if (typeof value === 'number' ? !Number.isFinite(value) : typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${label} must be a number.`);
  }
  let cents: bigint;
  try {
    cents = toCents(value as number | string);
  } catch {
    throw new BadRequestException(`${label} must be a number.`);
  }
  return assertInRange(cents, label);
}

export function assertYearMatchesVersion(year: unknown, version: AmountVersion): number {
  const parsed = typeof year === 'string' && /^\d{4}$/.test(year.trim()) ? Number(year) : year;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed)) {
    throw new BadRequestException('A budget year is required.');
  }
  const versionYear = Number(version.budget_year);
  if (parsed !== versionYear) {
    throw new BadRequestException(`The year ${parsed} does not match this version's year ${versionYear}.`);
  }
  return parsed;
}

export function yearPeriods(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`);
}

function validatePeriod(value: unknown, year: number): string {
  const period = typeof value === 'string' ? value.trim() : '';
  const match = /^(\d{4})-(\d{2})-01$/.exec(period);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new BadRequestException(`'${String(value ?? '')}' is not a month; use the first day of the month (YYYY-MM-01).`);
  }
  if (Number(match[1]) !== year) {
    throw new BadRequestException(`Month ${period} is not in ${year}.`);
  }
  return period;
}

/** Validated periods and target measures of a set of rows. */
function inspectRows(year: number, rows: AmountRowInput[]) {
  const periods: string[] = [];
  const seen = new Set<string>();
  const measures = new Set<AmountMeasure>();
  for (const row of rows) {
    const period = validatePeriod(row.period, year);
    if (seen.has(period)) throw new BadRequestException(`Month ${period} appears more than once.`);
    seen.add(period);
    periods.push(period);
    let count = 0;
    for (const key of Object.keys(row)) {
      if (key === 'period') continue;
      if (!isAmountMeasure(key)) throw unknownMeasure(key);
      const cents = row[key];
      if (typeof cents !== 'bigint') {
        throw new BadRequestException(`${measureLabel(key)} for ${period} cannot be empty; send 0 to clear it.`);
      }
      assertInRange(cents, `${measureLabel(key)} for ${period}`);
      measures.add(key);
      count += 1;
    }
    if (count === 0) throw new BadRequestException(`Month ${period} carries no amount.`);
  }
  return { periods, measures: AMOUNT_MEASURES.filter((m) => measures.has(m)) };
}

async function assertMeasuresEditable(ctx: AmountsWriteContext, year: number, measures: AmountMeasure[]) {
  ctx.checkedFreeze ??= new Set<string>();
  for (const measure of measures) {
    const column = MEASURE_FREEZE_COLUMN[measure];
    const key = `${ctx.scope}:${column}:${year}`;
    if (ctx.checkedFreeze.has(key)) continue;
    await ctx.freeze.assertNotFrozen({ scope: ctx.scope, column, year }, { manager: ctx.manager });
    ctx.checkedFreeze.add(key);
  }
}

async function readRows(ctx: AmountsWriteContext, periods: string[], lock = false): Promise<StoredAmountRow[]> {
  return ctx.manager.query(
    `SELECT id, tenant_id, version_id, to_char(period, 'YYYY-MM-DD') AS period,
            planned, forecast, committed, actual, expected_landing, created_at, updated_at
     FROM ${AMOUNT_TABLE[ctx.scope]}
     WHERE tenant_id = $1 AND version_id = $2 AND period = ANY($3::date[])
     ORDER BY period${lock ? ' FOR UPDATE' : ''}`,
    [ctx.version.tenant_id, ctx.version.id, periods],
  );
}

/** One statement for rows that carry the same measures: only those columns are written. */
async function upsertColumns(ctx: AmountsWriteContext, measures: AmountMeasure[], rows: AmountRowInput[]) {
  const params: unknown[] = [ctx.version.tenant_id, ctx.version.id];
  const values = rows.map((row) => {
    const cells = [`$${params.push(row.period)}::date`];
    for (const measure of measures) cells.push(`$${params.push(formatCents(row[measure] as bigint))}::numeric`);
    return `($1::uuid, $2::uuid, ${cells.join(', ')})`;
  });
  await ctx.manager.query(
    `INSERT INTO ${AMOUNT_TABLE[ctx.scope]} (tenant_id, version_id, period, ${measures.join(', ')})
     VALUES ${values.join(', ')}
     ON CONFLICT (version_id, period) DO UPDATE
     SET ${measures.map((m) => `${m} = EXCLUDED.${m}`).join(', ')}, updated_at = now()`,
    params,
  );
}

/** Create the months that do not exist yet, in period order; returns the periods created. */
async function createMissingMonths(ctx: AmountsWriteContext, periods: string[]): Promise<Set<string>> {
  const created: Array<{ period: string }> = await ctx.manager.query(
    `INSERT INTO ${AMOUNT_TABLE[ctx.scope]} (tenant_id, version_id, period)
     SELECT $1::uuid, $2::uuid, p FROM unnest($3::date[]) AS p ORDER BY p
     ON CONFLICT (version_id, period) DO NOTHING
     RETURNING to_char(period, 'YYYY-MM-DD') AS period`,
    [ctx.version.tenant_id, ctx.version.id, periods],
  );
  return new Set(created.map((row) => row.period));
}

async function write(ctx: AmountsWriteContext, year: number, rows: AmountRowInput[], periods: string[], measures: AmountMeasure[]) {
  await assertMeasuresEditable(ctx, year, measures);
  // Concurrent writes on the same line must queue up, never deadlock: every
  // month is first created and then locked in period order, whatever order
  // or measure sets the rows come in. The rows read here only feed the audit
  // log; months this write created had no "before".
  const created = await createMissingMonths(ctx, periods);
  const before = (await readRows(ctx, periods, true)).filter((row) => !created.has(row.period));
  // Rows of a patch may name different measures; group them so each
  // statement lists its own target columns (at most one per measure set).
  const groups = new Map<string, { measures: AmountMeasure[]; rows: AmountRowInput[] }>();
  rows.forEach((row, index) => {
    const rowMeasures = AMOUNT_MEASURES.filter((m) => row[m] !== undefined);
    const key = rowMeasures.join(',');
    const group = groups.get(key) ?? { measures: rowMeasures, rows: [] };
    group.rows.push({ ...row, period: periods[index] });
    groups.set(key, group);
  });
  for (const group of groups.values()) await upsertColumns(ctx, group.measures, group.rows);
  const after = await readRows(ctx, periods);
  return { periods, before, after };
}

/**
 * Replace the twelve months of `year` for every measure the rows carry. Each
 * row must carry the same measures, and the rows must be the twelve
 * first-of-month dates of the year.
 */
export async function replaceAmounts(ctx: AmountsWriteContext, year: number, rows: AmountRowInput[]): Promise<AmountsWriteResult> {
  assertYearMatchesVersion(year, ctx.version);
  const { periods, measures } = inspectRows(year, rows);
  if (rows.length !== 12) {
    throw new BadRequestException(`Replacing a year needs its twelve months; ${rows.length} given.`);
  }
  for (const row of rows) {
    const missing = measures.find((m) => row[m] === undefined);
    if (missing) throw new BadRequestException(`${measureLabel(missing)} for ${row.period} is missing.`);
  }
  return write(ctx, year, rows, periods, measures);
}

/** Write only the cells supplied; everything else stays as stored. */
export async function patchAmounts(ctx: AmountsWriteContext, year: number, rows: AmountRowInput[]): Promise<AmountsWriteResult> {
  assertYearMatchesVersion(year, ctx.version);
  if (rows.length === 0) throw new BadRequestException('Send at least one month.');
  const { periods, measures } = inspectRows(year, rows);
  return write(ctx, year, rows, periods, measures);
}

/** Spread yearly totals over the twelve months (flat unless weights are given); rows carry only the measures named. */
export function spreadAnnualRows(
  year: number,
  totals: Partial<Record<AmountMeasure, bigint>>,
  weights: readonly bigint[] = FLAT_WEIGHTS,
): AmountRowInput[] {
  return spreadAnnualToMonths(year, totals, weights);
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

/**
 * Apply an amounts payload from the budget tab, the API or the AI:
 * - `annual`: `totals` names one or more measures; each is spread over the
 *   year (flat, or the weights `annualWeights` resolves) and replaces the
 *   twelve months of that measure only.
 * - `quarterly`: one `measure`; `Q1`..`Q4` are spread inside their quarter
 *   and replace that measure's year, an omitted quarter being zero.
 * - `monthly`: `months` rows patch only the cells they carry.
 */
export async function writeAmountsPayload(
  ctx: AmountsWriteContext,
  rawPayload: unknown,
  annualWeights: (profileName: string | undefined) => Promise<readonly bigint[]> = async () => FLAT_WEIGHTS,
): Promise<AmountsWriteResult> {
  const payload = asObject(rawPayload, 'The amounts');
  const year = assertYearMatchesVersion(payload.year, ctx.version);
  const profileName = typeof payload.spread_profile_name === 'string' ? payload.spread_profile_name : undefined;

  if (payload.kind === 'annual') {
    const input = asObject(payload.totals ?? {}, 'totals');
    const totals: Partial<Record<AmountMeasure, bigint>> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!isAmountMeasure(key)) throw unknownMeasure(key);
      totals[key] = validateAmountValue(value, `${measureLabel(key)} total`);
    }
    if (Object.keys(totals).length === 0) {
      throw new BadRequestException('The yearly totals must name at least one amount.');
    }
    return replaceAmounts(ctx, year, spreadAnnualRows(year, totals, await annualWeights(profileName)));
  }

  if (payload.kind === 'quarterly') {
    const measure = payload.measure;
    if (!isAmountMeasure(measure)) throw unknownMeasure(String(measure ?? ''));
    const quarters: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', bigint>> = {};
    for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
      if (!Object.prototype.hasOwnProperty.call(payload, quarter)) continue;
      quarters[quarter] = validateAmountValue(payload[quarter], `${measureLabel(measure)} ${quarter}`);
    }
    const rows = spreadQuarterlyToMonths(year, measure, quarters, profileName === '4-4-5' ? '445' : 'equal');
    return replaceAmounts(ctx, year, rows);
  }

  if (payload.kind === 'monthly') {
    if (!Array.isArray(payload.months) || payload.months.length === 0) {
      throw new BadRequestException('Send at least one month.');
    }
    const rows = payload.months.map((entry, index) => {
      const input = asObject(entry, `Month ${index + 1}`);
      const period = typeof input.period === 'string' ? input.period : '';
      const row: AmountRowInput = { period };
      for (const [key, value] of Object.entries(input)) {
        if (key === 'period') continue;
        if (!isAmountMeasure(key)) throw unknownMeasure(key);
        row[key] = validateAmountValue(value, `${measureLabel(key)} for ${period || `month ${index + 1}`}`);
      }
      return row;
    });
    return patchAmounts(ctx, year, rows);
  }

  throw new BadRequestException('Unsupported amounts payload: kind must be annual, quarterly or monthly.');
}
