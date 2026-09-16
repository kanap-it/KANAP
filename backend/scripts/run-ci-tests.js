#!/usr/bin/env node
/*
 * Runs the backend hardening checks the way CI does, but in parallel.
 *
 * The list of specs is read from the package.json `test:*` scripts named in
 * CHAIN below, so those scripts stay the single source of truth and can still
 * be run one by one with `npm run test:<name>`. Each spec keeps running in its
 * own ts-node process, exactly as before; only the scheduling changes:
 *
 *   - specs that never open the database run in parallel (one lane per CPU),
 *   - specs that connect to PostgreSQL share one serial lane, because they all
 *     work on the same `appdb`.
 *
 * Type-checking is done once by `npm run typecheck:ci` before this script, so
 * CI sets TS_NODE_TRANSPILE_ONLY=1 to skip the per-process type-check.
 *
 * Usage: node scripts/run-ci-tests.js [--jobs N]
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHAIN = [
  'test:auth',
  'test:security',
  'test:tenant-isolation',
  'test:rls',
  'test:allocation-rules',
  'test:capex',
  'test:portfolio',
  'test:incidents',
  'test:integrated-docs',
  'test:incident-review-access',
  'test:csv',
  'test:it-ops-settings',
  'test:application-classification',
  'test:ai',
];

// A spec that matches one of these opens a real database connection.
const DB_PATTERN = /NestFactory\.create|createTestingModule|TypeOrmModule|\.initialize\(\)|data-source/;

const root = path.resolve(__dirname, '..');
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;

function collect(name, out, seen) {
  if (!scripts[name]) throw new Error(`Unknown npm script: ${name}`);
  for (const raw of scripts[name].split('&&')) {
    const part = raw.trim();
    const nested = part.match(/^npm run (\S+)$/);
    if (nested) {
      collect(nested[1], out, seen);
      continue;
    }
    const cmd = part.match(/^((?:\w+=\S+\s+)*)ts-node (\S+)$/);
    if (!cmd) throw new Error(`Cannot parse step of "${name}": ${part}`);
    const file = cmd[2];
    if (seen.has(file)) continue; // a spec listed by several scripts runs once
    seen.add(file);
    const env = {};
    for (const assignment of cmd[1].trim().split(/\s+/).filter(Boolean)) {
      const [key, value] = assignment.split('=');
      env[key] = value;
    }
    out.push({ file, env, script: name });
  }
}

function runSpec(spec) {
  return new Promise((resolve) => {
    const started = Date.now();
    const chunks = [];
    const child = spawn(path.join(root, 'node_modules', '.bin', 'ts-node'), [spec.file], {
      cwd: root,
      env: { ...process.env, ...spec.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', (c) => chunks.push(c));
    child.on('close', (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const status = code === 0 ? 'ok' : `FAILED (exit ${code})`;
      process.stdout.write(`\n── ${spec.file} · ${seconds}s · ${status}\n${Buffer.concat(chunks)}`);
      resolve({ spec, code, seconds });
    });
  });
}

async function runLane(queue, workers) {
  const results = [];
  async function worker() {
    for (let spec = queue.shift(); spec; spec = queue.shift()) results.push(await runSpec(spec));
  }
  await Promise.all(Array.from({ length: Math.min(workers, queue.length) || 1 }, worker));
  return results;
}

async function main() {
  const jobsArg = process.argv.indexOf('--jobs');
  const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  const jobs = Math.max(2, jobsArg >= 0 ? Number(process.argv[jobsArg + 1]) : cpus);

  const specs = [];
  const seen = new Set();
  for (const name of CHAIN) collect(name, specs, seen);

  const db = specs.filter((s) => DB_PATTERN.test(fs.readFileSync(path.join(root, s.file), 'utf8')));
  const unit = specs.filter((s) => !db.includes(s));
  console.log(`${specs.length} specs: ${unit.length} in parallel (${jobs - 1} lanes), ${db.length} database specs in series`);

  const started = Date.now();
  const results = (await Promise.all([runLane([...db], 1), runLane([...unit], jobs - 1)])).flat();
  const failed = results.filter((r) => r.code !== 0);
  const total = ((Date.now() - started) / 1000).toFixed(0);

  console.log(`\n${results.length - failed.length}/${results.length} specs passed in ${total}s`);
  if (failed.length) {
    console.log('Failed:');
    for (const r of failed) console.log(`  - ${r.spec.file} (${r.spec.script})`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
