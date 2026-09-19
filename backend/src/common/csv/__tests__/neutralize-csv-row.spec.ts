import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { format } from '@fast-csv/format';
import { neutralizeCsvFormulaValue, neutralizeCsvRow } from '../csv-export.service';

/**
 * Every export that hand-rolls its own fast-csv formatter now passes
 * `transform: neutralizeCsvRow`. These tests cover the row transform itself and the exact
 * formatter configuration those call sites use, because the previous arrangement protected
 * only hand-picked columns: the engine neutralised its fields, and the raw exporters did
 * nothing at all.
 */

function formatRows(rows: Array<Record<string, unknown>>): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    // Same configuration as the raw export call sites.
    const stream = format({ headers: ['name', 'notes'], delimiter: ';', transform: neutralizeCsvRow });
    stream.on('data', (chunk) => chunks.push(chunk.toString()));
    stream.on('end', () => resolve(chunks.join('')));
    stream.on('error', reject);
    for (const row of rows) stream.write(row);
    stream.end();
  });
}

function testNeutralizesEveryStringFieldOfARow() {
  const row = { name: '=cmd|calc', notes: 'plain', count: 3, missing: null, flag: true };
  const out = neutralizeCsvRow(row) as Record<string, unknown>;

  assert.equal(out.name, "'=cmd|calc");
  assert.equal(out.notes, 'plain');
  // Non-strings are untouched.
  assert.equal(out.count, 3);
  assert.equal(out.missing, null);
  assert.equal(out.flag, true);
  // The input row is not mutated.
  assert.equal(row.name, '=cmd|calc');
}

function testNeutralizesArrayRows() {
  const out = neutralizeCsvRow(['+1', 'ok', 42]) as unknown[];
  assert.deepEqual(out, ["'+1", 'ok', 42]);
}

function testPassesThroughScalars() {
  assert.equal(neutralizeCsvRow('=x'), '=x'); // a bare scalar is not a row
  assert.equal(neutralizeCsvRow(null), null);
}

function testCoversFieldsTheCallerDidNotHandPick() {
  // The point of neutralising the row rather than chosen columns: a newly added export
  // field is protected without anyone remembering to add it to a list.
  const out = neutralizeCsvRow({ a_new_field_nobody_listed: '@SUM(1)' }) as Record<string, string>;
  assert.equal(out.a_new_field_nobody_listed, "'@SUM(1)");
}

function testIsIdempotent() {
  const once = neutralizeCsvFormulaValue('=SUM(A1)');
  const twice = neutralizeCsvFormulaValue(once);
  assert.equal(once, "'=SUM(A1)");
  assert.equal(twice, once, 'neutralising twice must not stack apostrophes');
}

async function testFormatterEmitsNeutralizedValues() {
  const csv = await formatRows([{ name: '=cmd|calc', notes: '=2+2' }]);

  // Both fields protected, including the one an export might not have listed.
  assert.ok(csv.includes("'=cmd|calc"), `expected the formula to be neutralised, got: ${csv}`);
  assert.ok(csv.includes("'=2+2"), `expected the second formula to be neutralised, got: ${csv}`);
  // Header row still written.
  assert.ok(csv.startsWith('name;notes'), `expected headers first, got: ${csv}`);
  // The dangerous unescaped form must not appear.
  assert.ok(!/;=2\+2/.test(csv), 'a formula must never reach the cell unquoted and unescaped');
}

async function testFormatterLeavesOrdinaryTextAlone() {
  const csv = await formatRows([{ name: 'Acme Corp', notes: 'renewal in March' }]);
  assert.ok(csv.includes('Acme Corp'));
  assert.ok(csv.includes('renewal in March'));
  assert.ok(!csv.includes("'"), 'ordinary text must not gain an apostrophe');
}

async function run() {
  testNeutralizesEveryStringFieldOfARow();
  testNeutralizesArrayRows();
  testPassesThroughScalars();
  testCoversFieldsTheCallerDidNotHandPick();
  testIsIdempotent();
  await testFormatterEmitsNeutralizedValues();
  await testFormatterLeavesOrdinaryTextAlone();
  testEveryCsvWriterNeutralizesFormulas();
}

void run();

/**
 * Source-level guard. The unit tests above prove the transform works when it is attached;
 * this proves it *is* attached at every CSV writer, so a new export cannot quietly ship
 * unprotected the way these ones did.
 */
function testEveryCsvWriterNeutralizesFormulas() {
  // Writers that protect their output another way, or that only emit a header line.
  const EXEMPT = new Set([
    'common/csv/csv-export.service.ts', // the shared engine neutralises each field itself
    'common/csv/csv-import.service.ts',
    'users/users.service.ts', // neutralises every exported field explicitly
    'applications/applications-csv.service.ts', // template export: headers only, no values
  ]);

  const srcRoot = path.join(__dirname, '..', '..', '..');
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'migrations' || entry.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) continue;

      const relative = path.relative(srcRoot, full).split(path.sep).join('/');
      if (EXEMPT.has(relative)) continue;

      const source = fs.readFileSync(full, 'utf8');
      // Any fast-csv formatter that writes rows must carry the row transform.
      const formatters = source.match(/format\(\{\s*headers[\s\S]{0,120}?\}\)/g) ?? [];
      for (const call of formatters) {
        if (!call.includes('transform: neutralizeCsvRow')) {
          offenders.push(`${relative}: ${call.replace(/\s+/g, ' ')}`);
        }
      }
    }
  };
  walk(srcRoot);

  assert.deepEqual(
    offenders,
    [],
    `CSV writers must pass \`transform: neutralizeCsvRow\`:\n${offenders.join('\n')}`,
  );

  // The one writer that hand-rolls its CSV must neutralise inside its own escaper.
  const weekly = fs.readFileSync(
    path.join(srcRoot, 'portfolio', 'services', 'portfolio-weekly-report.service.ts'),
    'utf8',
  );
  const escaper = weekly.slice(weekly.indexOf('const csvEscape'), weekly.indexOf('const columnNumberToName'));
  assert.ok(
    escaper.includes('neutralizeCsvFormulaValue'),
    'portfolio-weekly-report.service.ts hand-rolls its CSV and must neutralise in csvEscape',
  );
}
