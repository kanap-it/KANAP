import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { AGENT_AUTONOMY_POLICY_SOURCE } from '../control-plane/agent/ai-agent-autonomy';
import { AiAgentWorkQueueService } from '../control-plane/agent/ai-agent-work-queue.service';
import { AiAgentControlService } from '../control-plane/agent-control/ai-agent-control.service';

async function seedTenant(runner: QueryRunner, tenantId: string, slug: string, name: string) {
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, slug, name],
  );
}

async function setCurrentTenant(runner: QueryRunner, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

function controlContext(runner: QueryRunner, tenantId: string) {
  return {
    tenantId,
    userId: 'user-1',
    isPlatformHost: false,
    surface: 'chat' as const,
    authMethod: 'jwt' as const,
    manager: runner.manager,
  };
}

function controlService() {
  return new AiAgentControlService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    new AiAgentWorkQueueService(),
  );
}

async function insertDefinition(runner: QueryRunner, id: string, tenantId: string, agentKey: string) {
  await runner.query(
    `INSERT INTO ai_agent_definitions (
       id, tenant_id, agent_key, name, agent_type, status, environment,
       max_autonomy_level, default_approval_requirement
     )
     VALUES ($1, $2, $3, 'Delete integration agent', 'helpdesk', 'enabled', 'sandbox', 'A3', 'human_for_writes')`,
    [id, tenantId, agentKey],
  );
}

async function insertWorkItem(
  runner: QueryRunner,
  input: { id: string; tenantId: string; definitionId: string; triggerId?: string | null; dedupKey: string },
) {
  await runner.query(
    `INSERT INTO ai_agent_work_items (
       id, tenant_id, agent_definition_id, trigger_id, source_provider_kind, source_provider_key,
       source_object_type, source_object_ref, work_kind, status, dedup_key
     )
     VALUES ($1, $2, $3, $4, 'ticketing', 'mock', 'ticket', 'FRO-2213', 'ticket_triage', 'completed', $5)`,
    [input.id, input.tenantId, input.definitionId, input.triggerId ?? null, input.dedupKey],
  );
}

async function testDeleteUsedAgentWithWorkItemLinkedAudit() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const tenantId = randomUUID();
  const definitionId = randomUUID();
  const workItemId = randomUUID();
  const auditEventId = randomUUID();
  const policyId = randomUUID();
  try {
    await seedTenant(runner, tenantId, `ai-del-${tenantId.slice(0, 8)}`, 'Agent delete tenant');
    await setCurrentTenant(runner, tenantId);
    await insertDefinition(runner, definitionId, tenantId, 'fromage.service.desk.agent');
    await insertWorkItem(runner, {
      id: workItemId,
      tenantId,
      definitionId,
      dedupKey: `used-audit-${definitionId}`,
    });
    await runner.query(
      `INSERT INTO ai_agent_audit_events (
         id, tenant_id, agent_definition_id, work_item_id, event_type, severity, message
       )
       VALUES ($1, $2, $3, $4, 'work_item_processing_failed', 'error', 'mock triage failed')`,
      [auditEventId, tenantId, definitionId, workItemId],
    );
    await runner.query(
      `INSERT INTO ai_approval_policies (
         id, tenant_id, policy_key, policy_version, name, status, enabled,
         capability_name, capability_version, effect, live_test_safety, metadata_json
       )
       VALUES (
         $1, $2, $3, 1, 'Autonomy grant', 'enabled', true,
         'ticketing.ticket.internal_note.add_approved', '1.0.0', 'write', 'mock_only',
         $4::jsonb
       )`,
      [
        policyId,
        tenantId,
        `agent-autonomy:${definitionId}:internal_note`,
        JSON.stringify({
          created_by: AGENT_AUTONOMY_POLICY_SOURCE,
          agent_definition_id: definitionId,
          action_class: 'internal_note',
        }),
      ],
    );

    const result = await controlService().deleteAgentDefinition(controlContext(runner, tenantId), definitionId);
    assert.equal(result.deleted, true);

    const definitions = await runner.query(`SELECT 1 FROM ai_agent_definitions WHERE id = $1`, [definitionId]);
    assert.equal(definitions.length, 0);
    const workItems = await runner.query(`SELECT 1 FROM ai_agent_work_items WHERE id = $1`, [workItemId]);
    assert.equal(workItems.length, 0);
    const policies = await runner.query(`SELECT 1 FROM ai_approval_policies WHERE id = $1`, [policyId]);
    assert.equal(policies.length, 0);

    const audit = await runner.query(
      `SELECT event_type, agent_definition_id, work_item_id FROM ai_agent_audit_events WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );
    assert.equal(audit.some((row: { event_type: string }) => row.event_type === 'work_item_processing_failed'), true);
    assert.equal(audit.some((row: { event_type: string }) => row.event_type === 'agent_deleted'), true);
    for (const row of audit) {
      assert.equal(row.agent_definition_id, null);
    }
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testDeleteAgentWithTriggerLinkedWorkItem() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const tenantId = randomUUID();
  const definitionId = randomUUID();
  const triggerId = randomUUID();
  const workItemId = randomUUID();
  try {
    await seedTenant(runner, tenantId, `ai-del-tr-${tenantId.slice(0, 8)}`, 'Agent delete trigger tenant');
    await setCurrentTenant(runner, tenantId);
    await insertDefinition(runner, definitionId, tenantId, 'helpdesk.with.trigger');
    await runner.query(
      `INSERT INTO ai_agent_triggers (
         id, tenant_id, agent_definition_id, trigger_key, trigger_kind, status, enabled
       )
       VALUES ($1, $2, $3, 'manual.safe_target', 'manual', 'enabled', true)`,
      [triggerId, tenantId, definitionId],
    );
    await insertWorkItem(runner, {
      id: workItemId,
      tenantId,
      definitionId,
      triggerId,
      dedupKey: `trigger-linked-${definitionId}`,
    });

    const result = await controlService().deleteAgentDefinition(controlContext(runner, tenantId), definitionId);
    assert.equal(result.deleted, true);
    const leftover = await runner.query(`SELECT 1 FROM ai_agent_definitions WHERE id = $1`, [definitionId]);
    assert.equal(leftover.length, 0);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testCrossTenantWorkItemAssignmentStillBlocked() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const tenantOne = randomUUID();
  const tenantTwo = randomUUID();
  const definitionOne = randomUUID();
  const definitionTwo = randomUUID();
  const workItemTwo = randomUUID();
  try {
    await seedTenant(runner, tenantOne, `ai-del-a-${tenantOne.slice(0, 8)}`, 'Agent delete isolation A');
    await seedTenant(runner, tenantTwo, `ai-del-b-${tenantTwo.slice(0, 8)}`, 'Agent delete isolation B');

    await setCurrentTenant(runner, tenantTwo);
    await insertDefinition(runner, definitionTwo, tenantTwo, 'tenant.two.desk');
    await insertWorkItem(runner, {
      id: workItemTwo,
      tenantId: tenantTwo,
      definitionId: definitionTwo,
      dedupKey: `t2-${definitionTwo}`,
    });

    await setCurrentTenant(runner, tenantOne);
    await insertDefinition(runner, definitionOne, tenantOne, 'tenant.one.desk');
    await assert.rejects(
      () => runner.query(
        `INSERT INTO ai_agent_audit_events (
           tenant_id, agent_definition_id, work_item_id, event_type, severity, message
         )
         VALUES ($1, $2, $3, 'cross-work-item', 'warning', 'must stay blocked')`,
        [tenantOne, definitionOne, workItemTwo],
      ),
      (error: unknown) => error instanceof Error
        && error.message.includes('cross-tenant ai_agent_audit_events.work_item_id link'),
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function run() {
  await dataSource.initialize();
  try {
    await testDeleteUsedAgentWithWorkItemLinkedAudit();
    await testDeleteAgentWithTriggerLinkedWorkItem();
    await testCrossTenantWorkItemAssignmentStillBlocked();
  } finally {
    await dataSource.destroy();
  }
}

void run();
