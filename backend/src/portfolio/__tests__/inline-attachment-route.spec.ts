import * as assert from 'node:assert/strict';
import { PortfolioAttachmentsService } from '../services/portfolio-attachments.service';

// Exercises the projects inline route's service (getInlineAttachmentMeta): the access
// gate must run BEFORE commit, the SELECT must filter source_field, and a denial must
// roll back and return null (never commit / never serve). The requests/tasks controllers
// use the same inline pattern; this validates the shared behavior.
function makeRunner(attachmentRows: any[]) {
  const calls = { committed: false, rolledBack: false, sqls: [] as string[] };
  const runner: any = {
    manager: {},
    isTransactionActive: true,
    connect: async () => {},
    startTransaction: async () => {},
    query: async (sql: string) => {
      calls.sqls.push(sql);
      if (/FROM tenants/i.test(sql)) return [{ id: 'tenant-1' }];
      if (/set_config/i.test(sql)) return [];
      if (/portfolio_project_attachments/i.test(sql)) return attachmentRows;
      return [];
    },
    commitTransaction: async () => { calls.committed = true; runner.isTransactionActive = false; },
    rollbackTransaction: async () => { calls.rolledBack = true; runner.isTransactionActive = false; },
    release: async () => {},
  };
  return { runner, calls };
}

function makeService(allowed: boolean, attachmentRows: any[]) {
  const { runner, calls } = makeRunner(attachmentRows);
  const svc: any = Object.create(PortfolioAttachmentsService.prototype);
  svc.projectRepo = { manager: { connection: { createQueryRunner: () => runner } } };
  svc.knowledge = { canAccessInlineAttachment: async () => allowed };
  return { svc, calls };
}

const ROW = [{ storage_path: 's3/key', mime_type: 'image/png', size: 10 }];

async function run() {
  // 1) gate denies -> null, rolled back, never committed
  {
    const { svc, calls } = makeService(false, ROW);
    const meta = await svc.getInlineAttachmentMeta('acme', 'att-1', undefined);
    assert.equal(meta, null);
    assert.equal(calls.committed, false, 'must not commit on denial');
    assert.equal(calls.rolledBack, true, 'must roll back on denial');
  }
  // 2) gate allows + row present -> meta returned, committed
  {
    const { svc, calls } = makeService(true, ROW);
    const meta = await svc.getInlineAttachmentMeta('acme', 'att-1', 'tok');
    assert.deepEqual(meta, { storagePath: 's3/key', mimeType: 'image/png', size: 10 });
    assert.equal(calls.committed, true);
  }
  // 3) no attachment row (e.g. source_field NULL filtered out) -> null even if gate would allow
  {
    const { svc, calls } = makeService(true, []);
    const meta = await svc.getInlineAttachmentMeta('acme', 'att-1', 'tok');
    assert.equal(meta, null);
    assert.equal(calls.committed, false);
    assert.equal(calls.rolledBack, true);
  }
  // 4) the attachment SELECT restricts to embedded images (source_field IS NOT NULL)
  {
    const { svc, calls } = makeService(true, ROW);
    await svc.getInlineAttachmentMeta('acme', 'att-1', 'tok');
    assert.ok(
      calls.sqls.some((sql) => /portfolio_project_attachments/i.test(sql) && /source_field IS NOT NULL/i.test(sql)),
      'attachment query must filter source_field IS NOT NULL',
    );
  }

  console.log('inline-attachment-route.spec: all assertions passed');
}

run().catch((e) => { console.error(e); process.exit(1); });
