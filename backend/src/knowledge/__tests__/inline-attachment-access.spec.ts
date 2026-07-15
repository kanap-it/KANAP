import * as assert from 'node:assert/strict';
import { KnowledgeService } from '../knowledge.service';

// The gate dereferences only this.users, this.permissions, and the passed manager
// (manager.query for refresh_tokens + manager.getRepository(UserRole).find). Build the
// instance via Object.create to skip the (long) constructor and stub just those.
function makeManager(tokenRow: any | null): any {
  return {
    query: async (sql: string) => (/refresh_tokens/i.test(sql) ? (tokenRow ? [tokenRow] : []) : []),
    getRepository: (_e: any) => ({ find: async () => [] }),
  };
}

function makeService(user: any, permissions: Map<string, string>): any {
  const svc: any = Object.create(KnowledgeService.prototype);
  svc.users = { findById: async () => user ?? null };
  svc.permissions = { listForRoles: async () => permissions };
  return svc;
}

async function run() {
  const token = 'tok-abc';
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const future = new Date(Date.now() + 3600_000);
  const past = new Date(Date.now() - 1000);
  const enabled = { id: 'u1', status: 'enabled', role_id: 'r1', role: { role_name: 'Viewer' } };
  const admin = { id: 'u1', status: 'enabled', role_id: 'r1', role: { role_name: 'Administrator' } };

  // 1) no cookie -> false
  assert.equal(
    await makeService(enabled, new Map([['tasks', 'reader']]))
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: future }), tenantId, undefined, 'tasks'),
    false,
  );
  // 2) expired token -> false
  assert.equal(
    await makeService(enabled, new Map([['tasks', 'reader']]))
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: past }), tenantId, token, 'tasks'),
    false,
  );
  // 3) valid token, no permission on the resource -> false
  assert.equal(
    await makeService(enabled, new Map([['knowledge', 'reader']]))
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: future }), tenantId, token, 'tasks'),
    false,
  );
  // 4) valid token + reader on the resource -> true
  assert.equal(
    await makeService(enabled, new Map([['tasks', 'reader']]))
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: future }), tenantId, token, 'tasks'),
    true,
  );
  // 5) administrator -> true even with empty permission map
  assert.equal(
    await makeService(admin, new Map())
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: future }), tenantId, token, 'tasks'),
    true,
  );
  // 6) disabled user -> false
  assert.equal(
    await makeService({ ...enabled, status: 'disabled' }, new Map([['tasks', 'reader']]))
      .canAccessInlineAttachment(makeManager({ user_id: 'u1', expires_at: future }), tenantId, token, 'tasks'),
    false,
  );

  console.log('inline-attachment-access.spec: all assertions passed');
}

run().catch((e) => { console.error(e); process.exit(1); });
