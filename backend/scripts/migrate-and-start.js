/*
  Simple entrypoint for QA/Prod:
  - Waits for DB
  - Runs TypeORM migrations programmatically using compiled DataSource
  - Starts the NestJS server

  Env toggles:
  - SKIP_MIGRATIONS=true to skip running migrations at boot
*/

const path = require('path');

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runMigrationsIfNeeded() {
  if ((process.env.SKIP_MIGRATIONS || '').toLowerCase() === 'true') {
    console.log('[entrypoint] SKIP_MIGRATIONS=true → skipping DB migrations');
    return;
  }
  const dsPath = path.resolve(__dirname, '../dist/data-source.js');
  const ds = require(dsPath).default;
  const maxAttempts = Number(process.env.MIGRATION_MAX_ATTEMPTS || 30);
  const delayMs = Number(process.env.MIGRATION_RETRY_DELAY_MS || 2000);

  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      console.log(`[entrypoint] Initializing DB (attempt ${attempt}/${maxAttempts}) ...`);
      await ds.initialize();
      console.log('[entrypoint] DB initialized. Running migrations...');
      const migrations = await ds.runMigrations();
      console.log(`[entrypoint] Migrations complete (${migrations.length} executed).`);
      await ds.destroy();
      return;
    } catch (err) {
      if (attempt >= maxAttempts) {
        console.error('[entrypoint] Failed to initialize DB after max attempts:', err?.message || err);
        if (process.env.DEBUG_MIGRATIONS) {
          console.error('[entrypoint] Error details:', err);
        }
        process.exit(1);
      }
      const msg = err && err.message ? `: ${err.message}` : '';
      console.warn(`[entrypoint] DB not ready or migration failed (attempt ${attempt})${msg}. Retrying in ${delayMs}ms...`);
      if (attempt === 1 && process.env.DEBUG_MIGRATIONS) {
        console.warn('[entrypoint] First failure details:', err);
      }
      await sleep(delayMs);
    }
  }
}

(async () => {
  await runMigrationsIfNeeded();
  // Start the API (compiled output)
  // Using require keeps PID 1 as node for proper signal handling in containers
  require(path.resolve(__dirname, '../dist/main.js'));
})();
