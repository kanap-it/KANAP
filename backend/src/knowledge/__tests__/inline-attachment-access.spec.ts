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

  await runIncidentReviewCases();

  console.log('inline-attachment-access.spec: all assertions passed');
}

/**
 * `ensureInlineAttachmentAccess` on an incident review: identity from the cookie,
 * then `incidents:reader` + the incident's row visibility on the exact parent.
 * A Knowledge permission is never a fallback here.
 */
async function runIncidentReviewCases() {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const documentId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const ownerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const viewerId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const future = new Date(Date.now() + 3600_000);

  function makeIncidentManager(opts: {
    binding: any | null;
    isAdministrator?: boolean;
    levelRank?: number | null;
    userOk?: boolean;
  }): any {
    return {
      query: async (sql: string) => {
        if (/refresh_tokens/i.test(sql)) return [{ user_id: viewerId, expires_at: future }];
        if (/integrated_document_bindings/i.test(sql)) return opts.binding ? [opts.binding] : [];
        if (/role_permissions/i.test(sql)) {
          return [{
            user_ok: opts.userOk !== false,
            is_administrator: opts.isAdministrator === true,
            level_rank: opts.levelRank ?? null,
          }];
        }
        if (/app_current_tenant/i.test(sql)) return [{ tenant_id: tenantId }];
        return [];
      },
      getRepository: () => ({ find: async () => [] }),
    };
  }

  const parent = { documentId, integratedBinding: { source_entity_type: 'incidents' as const } };
  const binding = (over: Record<string, unknown> = {}) => ({
    document_id: documentId,
    tenant_id: tenantId,
    source_entity_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    slot_key: 'review',
    incident_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    item_number: 3,
    status: 'open',
    confidential: false,
    reporter_user_id: null,
    owner_user_id: ownerId,
    ...over,
  });

  const gate = (manager: any) => makeService(
    { id: viewerId, status: 'enabled', role_id: 'r1', role: { role_name: 'Viewer' } },
    new Map([['knowledge', 'admin']]),
  ).ensureInlineAttachmentAccess(manager, tenantId, 'tok-abc', parent);

  // incidents:reader on a non-confidential incident review -> allowed.
  assert.equal(await gate(makeIncidentManager({ binding: binding(), levelRank: 1 })), true);
  // No incidents permission at all: knowledge:admin is not a fallback.
  assert.equal(await gate(makeIncidentManager({ binding: binding(), levelRank: null })), false);
  // Confidential and the viewer is neither owner nor reporter.
  assert.equal(
    await gate(makeIncidentManager({ binding: binding({ confidential: true }), levelRank: 2 })),
    false,
  );
  // Confidential but the viewer owns the incident.
  assert.equal(
    await gate(makeIncidentManager({
      binding: binding({ confidential: true, owner_user_id: viewerId }),
      levelRank: 1,
    })),
    true,
  );
  // Confidential, both owner and reporter null: only the registry admin.
  assert.equal(
    await gate(makeIncidentManager({
      binding: binding({ confidential: true, owner_user_id: null }),
      levelRank: 1,
    })),
    false,
  );
  assert.equal(
    await gate(makeIncidentManager({
      binding: binding({ confidential: true, owner_user_id: null }),
      isAdministrator: true,
    })),
    true,
  );
  // Orphan binding, and a binding that disappeared.
  assert.equal(
    await gate(makeIncidentManager({ binding: binding({ incident_id: null }), levelRank: 4 })),
    false,
  );
  assert.equal(await gate(makeIncidentManager({ binding: null, levelRank: 4 })), false);
  // A closed incident still shows its images (the freeze is about writes only).
  assert.equal(
    await gate(makeIncidentManager({ binding: binding({ status: 'closed' }), levelRank: 1 })),
    true,
  );
}

run().catch((e) => { console.error(e); process.exit(1); });
