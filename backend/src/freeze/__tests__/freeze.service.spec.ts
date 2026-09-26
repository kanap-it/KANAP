import * as assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FreezeService } from '../freeze.service';

// Forecast is a freezable budget column like the others.

function createService() {
  const rows: any[] = [];
  const repo = {
    findOne: async ({ where }: any) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    find: async () => rows,
    create: (partial: any) => ({ ...partial }),
    save: async (row: any) => {
      if (!rows.includes(row)) rows.push(row);
      return row;
    },
  };
  // No tenant in the mocked session: attaching FX rates on a Budget freeze is skipped.
  const manager = { getRepository: () => repo, query: async () => [] };
  const service = new FreezeService(repo as any, undefined as any, undefined as any, undefined as any);
  return { service, rows, opts: { manager: manager as any } };
}

function testSummarizeHasForecast() {
  const { service } = createService();
  const at = new Date('2026-03-01T00:00:00Z');
  const summary = service.summarize(2026, [
    { scope: 'opex', columnKey: 'forecast', is_frozen: true, frozen_at: at, frozen_by: 'user-1' } as any,
    { scope: 'capex', columnKey: 'forecast', is_frozen: false } as any,
  ]);
  assert.deepEqual(summary.scopes.opex.forecast, { frozen: true, frozenAt: at, frozenBy: 'user-1' });
  assert.deepEqual(summary.scopes.capex.forecast, { frozen: false, frozenAt: null, frozenBy: null });
  assert.deepEqual(Object.keys(summary.scopes.opex), ['budget', 'revision', 'forecast', 'actual', 'landing']);
  assert.deepEqual(Object.keys(summary.scopes.capex), ['budget', 'revision', 'forecast', 'actual', 'landing']);
}

function testNormalizeColumnAcceptsForecast() {
  const { service } = createService();
  const normalize = (service as any).normalizeColumn.bind(service);
  assert.equal(normalize('opex', 'forecast'), 'forecast');
  assert.equal(normalize('capex', 'FORECAST'), 'forecast');
  assert.throws(() => normalize('opex', 'constructor'), BadRequestException);
  assert.throws(() => normalize('opex', 'bogus'), BadRequestException);
}

async function testFreezeAllColumnsIncludesForecast() {
  const { service, rows, opts } = createService();
  await service.freeze(2026, [{ scope: 'capex' }], 'user-1', opts);
  assert.deepEqual(rows.map((r) => r.columnKey).sort(), ['actual', 'budget', 'forecast', 'landing', 'revision']);
  assert.ok(rows.every((r) => r.is_frozen && r.scope === 'capex' && r.budget_year === 2026));
}

async function testFrozenForecastIsRefusedWithAReadableMessage() {
  const { service, opts } = createService();
  await service.freeze(2026, [{ scope: 'opex', columns: ['forecast'] }], 'user-1', opts);
  assert.equal(await service.isFrozen({ scope: 'opex', column: 'forecast', year: 2026 }, opts), true);
  assert.equal(await service.isFrozen({ scope: 'opex', column: 'budget', year: 2026 }, opts), false);
  await assert.rejects(
    () => service.assertNotFrozen({ scope: 'opex', column: 'forecast', year: 2026 }, opts),
    (err: any) => err instanceof ForbiddenException && err.message === 'OPEX Forecast for 2026 is frozen',
  );
  await assert.rejects(
    () => service.assertNotFrozen({ scope: 'opex', column: 'forecast', year: 2026, action: 'Copy' }, opts),
    (err: any) => err.message === 'Copy not allowed: OPEX Forecast for 2026 is frozen',
  );
  await service.assertNotFrozen({ scope: 'opex', column: 'forecast', year: 2027 }, opts);
}

async function main() {
  testSummarizeHasForecast();
  testNormalizeColumnAcceptsForecast();
  await testFreezeAllColumnsIncludesForecast();
  await testFrozenForecastIsRefusedWithAReadableMessage();
  console.log('freeze.service.spec: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
