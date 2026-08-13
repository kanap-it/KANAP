import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AiAgentControlService } from '../control-plane/agent-control/ai-agent-control.service';
import { AiAgentMonitoringAlertIngestionService } from '../control-plane/agent/ai-agent-monitoring-alert-ingestion.service';
import {
  AiAgentWorkQueueService,
  MONITORING_ALERT_DIAGNOSTIC_WORK_KIND,
  monitoringAlertDedupKey,
} from '../control-plane/agent/ai-agent-work-queue.service';
import { AiAgentDefinition } from '../control-plane/entities/ai-agent-definition.entity';
import { AiAgentTargetState } from '../control-plane/entities/ai-agent-target-state.entity';
import { AiAgentWorkItem } from '../control-plane/entities/ai-agent-work-item.entity';
import { AiEmergencyPause } from '../control-plane/entities/ai-emergency-pause.entity';
import { AiObservation } from '../control-plane/entities/ai-observation.entity';
import { AiAdapterConfig } from '../control-plane/providers/adapter-config.entity';
import { MockMonitoringProvider } from '../control-plane/providers/mocks/mock-monitoring.provider';
import { AiExecutionContextWithManager } from '../ai.types';
import { Subscription, SubscriptionStatus } from '../../billing/subscription.entity';

// ---------------------------------------------------------------------------
// In-memory manager harness (same duck-typed TypeORM subset as
// ai-control-plane.spec.ts — kept local so this spec runs standalone).
// ---------------------------------------------------------------------------

function createMemoryManager() {
  const stores = new Map<string, any[]>();
  let idCounter = 0;
  const matchesValue = (rowValue: any, expected: any) => {
    if (expected && typeof expected === 'object' && '_type' in expected && '_value' in expected) {
      if ((expected as any)._type === 'moreThan') {
        return rowValue > (expected as any)._value;
      }
      if ((expected as any)._type === 'lessThan') {
        return rowValue < (expected as any)._value;
      }
      if ((expected as any)._type === 'in') {
        return Array.isArray((expected as any)._value) && (expected as any)._value.includes(rowValue);
      }
    }
    return rowValue === expected;
  };
  const matchesWhere = (row: any, where: any) =>
    Object.entries(where).every(([key, value]) => matchesValue(row[key], value));
  const fieldValue = (row: any, rawField: string) => row[String(rawField).split('.').pop() ?? rawField];
  const matchesQueryCondition = (row: any, rawCondition: string, params: Record<string, any> = {}) => {
    const condition = rawCondition.replace(/\s+/g, ' ').trim();
    if (condition.includes('tenant_id = :tenantId OR') && condition.includes('tenant_id IS NULL')) {
      return row.tenant_id === params.tenantId || row.tenant_id == null;
    }
    if (condition.includes('expires_at IS NULL OR') && condition.includes('expires_at > now()')) {
      const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
      return expiresAt == null || expiresAt > Date.now();
    }
    if (condition.includes('agent_definition_id IS NULL OR (:agentDefinitionId IS NOT NULL')) {
      return row.agent_definition_id == null || (!!params.agentDefinitionId && row.agent_definition_id === params.agentDefinitionId);
    }
    const nullOrEqual = condition.match(/^\(?[a-z]+\.(\w+) IS NULL OR [a-z]+\.\1 = :(\w+)\)?$/i);
    if (nullOrEqual) {
      const [, field, param] = nullOrEqual;
      return row[field] == null || row[field] === params[param];
    }
    const equality = condition.match(/^[a-z]+\.(\w+) = :(\w+)$/i);
    if (equality) {
      const [, field, param] = equality;
      return row[field] === params[param];
    }
    const booleanEquality = condition.match(/^[a-z]+\.(\w+) = (true|false)$/i);
    if (booleanEquality) {
      const [, field, value] = booleanEquality;
      return row[field] === (value === 'true');
    }
    const isNull = condition.match(/^[a-z]+\.(\w+) IS NULL$/i);
    if (isNull) {
      const [, field] = isNull;
      return row[field] == null;
    }
    const inList = condition.match(/^[a-z]+\.(\w+) IN \(:\.\.\.(\w+)\)$/i);
    if (inList) {
      const [, field, param] = inList;
      const values = Array.isArray(params[param]) ? params[param] : [];
      return values.includes(row[field]);
    }
    throw new Error(`Unsupported in-memory query condition: ${rawCondition}`);
  };
  const applyOrderAndTake = (items: any[], opts: any) => {
    let result = [...items];
    const order = opts?.order ?? null;
    if (order && typeof order === 'object') {
      const [[field, direction]] = Object.entries(order);
      result.sort((left, right) => {
        const leftValue = fieldValue(left, field);
        const rightValue = fieldValue(right, field);
        const leftTime = leftValue instanceof Date ? leftValue.getTime() : Date.parse(String(leftValue ?? ''));
        const rightTime = rightValue instanceof Date ? rightValue.getTime() : Date.parse(String(rightValue ?? ''));
        const diff = Number.isFinite(leftTime) && Number.isFinite(rightTime)
          ? leftTime - rightTime
          : String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
        return String(direction).toUpperCase() === 'DESC' ? -diff : diff;
      });
    }
    if (typeof opts?.take === 'number') {
      result = result.slice(0, opts.take);
    }
    return result;
  };
  const repoFor = (entity: any) => {
    const name = typeof entity === 'function' ? entity.name : String(entity);
    const rows = stores.get(name) ?? [];
    stores.set(name, rows);
    return {
      create: (payload: any) => ({
        id: payload.id ?? `${name}-${++idCounter}`,
        ...payload,
      }),
      save: async (record: any) => {
        if (Array.isArray(record)) {
          return Promise.all(record.map((entry) => repoFor(entity).save(entry)));
        }
        const existingIndex = rows.findIndex((row) => row.id === record.id);
        if (existingIndex >= 0) {
          rows[existingIndex] = record;
        } else {
          rows.push(record);
        }
        return record;
      },
      findOne: async (opts: any) => {
        const where = Array.isArray(opts?.where) ? opts.where[0] : opts?.where;
        if (!where) return rows[0] ?? null;
        return rows.find((row) => matchesWhere(row, where)) ?? null;
      },
      find: async (opts: any) => {
        const where = Array.isArray(opts?.where) ? opts.where[0] : opts?.where;
        const filtered = where ? rows.filter((row) => matchesWhere(row, where)) : [...rows];
        return applyOrderAndTake(filtered, opts);
      },
      delete: async (criteria: any) => {
        let affected = 0;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(rows[index], criteria ?? {})) {
            rows.splice(index, 1);
            affected += 1;
          }
        }
        return { affected };
      },
      createQueryBuilder: (_alias: string) => {
        const filters: Array<{ condition: string; params?: Record<string, any> }> = [];
        let order: { field: string; direction: 'ASC' | 'DESC' } | null = null;
        let secondaryOrder: { field: string; direction: 'ASC' | 'DESC' } | null = null;
        let distinctOnFields: string[] | null = null;
        let takeValue: number | null = null;
        const builder: any = {
          where: (condition: string, params?: Record<string, any>) => {
            filters.length = 0;
            filters.push({ condition, params });
            return builder;
          },
          andWhere: (condition: string, params?: Record<string, any>) => {
            filters.push({ condition, params });
            return builder;
          },
          orderBy: (field: string, direction: 'ASC' | 'DESC' = 'ASC') => {
            order = { field, direction };
            return builder;
          },
          addOrderBy: (field: string, direction: 'ASC' | 'DESC' = 'ASC') => {
            secondaryOrder = { field, direction };
            return builder;
          },
          distinctOn: (fields: string[]) => {
            distinctOnFields = fields;
            return builder;
          },
          take: (value: number) => {
            takeValue = value;
            return builder;
          },
          getMany: async () => {
            let result = rows.filter((row) => filters.every((filter) => matchesQueryCondition(row, filter.condition, filter.params)));
            if (order) {
              result = applyOrderAndTake(result, { order: { [order.field]: order.direction } });
              if (secondaryOrder) {
                // Postgres DISTINCT ON semantics: stable-sort by the secondary
                // key within equal primary keys, then keep the first per key.
                const primary = order;
                result = [...result].sort((left, right) => {
                  const leftPrimary = String(fieldValue(left, primary.field) ?? '');
                  const rightPrimary = String(fieldValue(right, primary.field) ?? '');
                  if (leftPrimary !== rightPrimary) {
                    const diff = leftPrimary.localeCompare(rightPrimary);
                    return primary.direction === 'DESC' ? -diff : diff;
                  }
                  const leftTime = Date.parse(String(fieldValue(left, secondaryOrder!.field) ?? ''));
                  const rightTime = Date.parse(String(fieldValue(right, secondaryOrder!.field) ?? ''));
                  const diff = (Number.isFinite(leftTime) ? leftTime : 0) - (Number.isFinite(rightTime) ? rightTime : 0);
                  return secondaryOrder!.direction === 'DESC' ? -diff : diff;
                });
              }
            }
            if (distinctOnFields) {
              const seen = new Set<string>();
              result = result.filter((row) => {
                const key = distinctOnFields!.map((field) => String(fieldValue(row, field) ?? '')).join('|');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            }
            if (takeValue != null) {
              result = result.slice(0, takeValue);
            }
            return result;
          },
          getOne: async () => {
            const result = await builder.getMany();
            return result[0] ?? null;
          },
        };
        return builder;
      },
    };
  };
  return {
    stores,
    manager: {
      getRepository: repoFor,
    } as any,
  };
}

function createContext(manager: any): AiExecutionContextWithManager {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    isPlatformHost: false,
    surface: 'chat' as const,
    authMethod: 'jwt' as const,
    manager,
  } as AiExecutionContextWithManager;
}

// ---------------------------------------------------------------------------
// SRE definition fixtures
// ---------------------------------------------------------------------------

async function enableSreMonitoring(
  context: AiExecutionContextWithManager,
  queue: AiAgentWorkQueueService,
  overrides?: {
    maxAlertsPerCycle?: number;
    maxProviderRequestsPerCycle?: number;
    targetingPredicates?: Array<Record<string, unknown>>;
  },
): Promise<AiAgentDefinition> {
  const adapterRepo = context.manager.getRepository(AiAdapterConfig);
  const existing = await adapterRepo.findOne({
    where: { tenant_id: context.tenantId, provider_kind: 'monitoring', provider_key: 'mock' },
  });
  if (!existing) {
    await adapterRepo.save(adapterRepo.create({
      id: randomUUID(),
      tenant_id: context.tenantId,
      provider_kind: 'monitoring',
      provider_key: 'mock',
      implementation: 'mock',
      enabled: true,
    }));
  }
  const definition = await queue.ensureSreMonitoringDefinition(context);
  assert.ok(definition, 'seed should create the SRE definition once a monitoring adapter config exists');
  definition!.status = 'enabled';
  definition!.trigger_policy_json = {
    ...(definition!.trigger_policy_json ?? {}),
    scheduled_poll: { enabled: true },
    automatic_writes_enabled: false,
  };
  definition!.scope_policy_json = {
    ...(definition!.scope_policy_json ?? {}),
    targeting: {
      schema_version: 1,
      combinator: 'and',
      predicates: overrides?.targetingPredicates ?? [],
    },
    ingestion: {
      enabled_at: '2026-07-01T00:00:00.000Z',
      max_alerts_per_cycle: overrides?.maxAlertsPerCycle ?? 10,
      max_provider_requests_per_cycle: overrides?.maxProviderRequestsPerCycle ?? 20,
    },
  };
  definition!.updated_at = new Date();
  return context.manager.getRepository(AiAgentDefinition).save(definition!);
}

// Provider wrapper: delegates to a base provider (or a mutable dataset) while
// counting list calls and capturing requested scopes.
function wrapListProvider(base: MockMonitoringProvider | null, dataset?: { alerts: any[] }) {
  const scopes: any[] = [];
  let listCalls = 0;
  const provider: any = {
    kind: 'monitoring',
    providerKey: 'mock',
    listAlertsForScope: async (context: any, input: any) => {
      listCalls += 1;
      scopes.push(input.scope);
      if (base) {
        return base.listAlertsForScope(context, input);
      }
      return { ok: true, data: { alerts: [...(dataset?.alerts ?? [])] }, evidence: [] };
    },
  };
  if (base) {
    provider.getAlert = base.getAlert.bind(base);
    provider.getSensorHistory = base.getSensorHistory.bind(base);
    provider.getCurrentState = base.getCurrentState.bind(base);
    provider.listRelatedAlerts = base.listRelatedAlerts.bind(base);
  }
  return { provider, scopes, listCallCount: () => listCalls };
}

function stubAlert(input: {
  id: string;
  status?: string;
  severity?: string;
  occurrenceStartedAt?: string | null;
}) {
  return {
    id: input.id,
    status: input.status ?? 'down',
    severity: input.severity ?? 'high',
    ackState: 'unacknowledged',
    message: 'stub alert',
    sensorId: input.id,
    observedAt: '2026-07-01T12:00:00.000Z',
    // Explicit null means "provider exposes no occurrence timestamp" (a
    // contractual possibility) — only an omitted field gets the default.
    occurrenceStartedAt: input.occurrenceStartedAt === undefined ? '2026-07-01T10:00:00.000Z' : input.occurrenceStartedAt,
    lastCheckedAt: '2026-07-01T12:00:00.000Z',
    lastValue: null,
    objectKind: 'check',
    deviceName: 'stub-device',
    groupPath: ['Probe', 'Prod'],
    sourceUri: `https://monitoring.stub.local/${input.id}`,
    dedupKey: `stub:${input.id}`,
  };
}

// Control stub that completes items without the full skeleton (poller-focused
// tests); occurrence bookkeeping was already written at enqueue time.
function completingControl(queue: AiAgentWorkQueueService, processed: string[] = []) {
  return {
    runMonitoringDiagnosis: async (runContext: AiExecutionContextWithManager, input: { work_item_id?: string | null }) => {
      const repo = runContext.manager.getRepository(AiAgentWorkItem);
      const workItem = await repo.findOne({ where: { id: input.work_item_id, tenant_id: runContext.tenantId } });
      if (!workItem) {
        throw new Error('missing test work item');
      }
      processed.push(workItem.id);
      workItem.status = 'completed';
      workItem.updated_at = new Date();
      await repo.save(workItem);
      await queue.releaseWorkItemTargetClaim(runContext, workItem, 'test_completed');
      return { status: 'completed', work_item: workItem };
    },
  };
}

function createMonitoringIngestionService(input: {
  queue: AiAgentWorkQueueService;
  provider: any;
  control?: any;
  builtinQuota?: any;
  stripeConfig?: any;
}) {
  const providers = {
    getApplicability: async () => ({ available: true }),
    monitoring: async () => input.provider,
  };
  const control = input.control ?? {
    runMonitoringDiagnosis: async () => ({ status: 'noop' }),
  };
  return new AiAgentMonitoringAlertIngestionService(
    {} as any,
    { register: () => undefined } as any,
    providers as any,
    input.queue,
    control as any,
    input.builtinQuota,
    input.stripeConfig,
  );
}

const DEFAULT_TARGETING_ALERT_IDS = [
  'mock-check-db01-http-refired',
  'mock-check-db01-ping',
  'mock-check-labfw-http',
  'mock-check-labfw-ping-malicious',
  'mock-check-sap-disk-flap',
  'mock-check-sap-traffic',
  'mock-sensor-cpu-001',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testDetectEnqueuesDefaultTargetingSetAndDedups() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const { provider } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });

  const first = await service.pollTenant(context);
  assert.equal(first.status, 'completed');
  assert.equal(first.listed, 7, 'default non-up scope excludes paused and up checks');
  assert.equal(first.enqueued, 7);
  assert.equal(first.deduped, 0);

  const workItems = stores.get(AiAgentWorkItem.name) ?? [];
  assert.deepEqual(
    workItems.map((item) => item.source_object_ref).sort(),
    DEFAULT_TARGETING_ALERT_IDS,
  );
  for (const item of workItems) {
    assert.equal(item.work_kind, MONITORING_ALERT_DIAGNOSTIC_WORK_KIND);
    assert.equal(item.source_provider_kind, 'monitoring');
    assert.equal(item.source_provider_key, 'mock');
    assert.equal(item.source_object_type, 'sensor');
    assert.equal(item.status, 'queued', 'no-op control leaves items queued');
    const snapshot = (item.metadata_json as any)?.alert ?? {};
    assert.equal('message' in snapshot, false, 'work items must not persist untrusted alert message text');
    assert.equal(typeof snapshot.status, 'string');
  }
  const dbPing = workItems.find((item) => item.source_object_ref === 'mock-check-db01-ping');
  assert.equal(
    dbPing?.dedup_key,
    'monitoring:mock:mock-check-db01-ping:2026-05-26T10:07',
    'dedup key = monitoring:<providerKey>:<alertId>:<occurrence minute bucket>',
  );
  assert.equal(
    dbPing?.dedup_key,
    monitoringAlertDedupKey('mock', 'mock-check-db01-ping', '2026-05-26T10:07:00.000Z'),
  );

  // Occurrence recorded at enqueue + whole-target claim held for the work item.
  const states = stores.get(AiAgentTargetState.name) ?? [];
  const pingState = states.find((state) => state.target_ref === 'mock-check-db01-ping');
  assert.equal((pingState?.state_json as any)?.occurrence_started_at, '2026-05-26T10:07:00.000Z');
  assert.equal(pingState?.claim_status, 'claimed');
  assert.equal(pingState?.claim_owner_work_item_id, dbPing?.id);

  // Second poll: everything active -> deduped, nothing new.
  const second = await service.pollTenant(context);
  assert.equal(second.enqueued, 0);
  assert.equal(second.deduped, 7);
  assert.equal((stores.get(AiAgentWorkItem.name) ?? []).length, 7);
}

async function testOccurrenceToleranceAndEscalation() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const dataset = { alerts: [stubAlert({ id: 'chk-a', occurrenceStartedAt: '2026-07-01T10:00:00.000Z' })] };
  const { provider } = wrapListProvider(null, dataset);
  const service = createMonitoringIngestionService({ queue, provider, control: completingControl(queue) });

  const first = await service.pollTenant(context);
  assert.equal(first.enqueued, 1);
  assert.equal(first.processed, 1);

  // Same occurrence with 30s provider jitter: inside the ±60s tolerance, no new work.
  dataset.alerts = [stubAlert({ id: 'chk-a', occurrenceStartedAt: '2026-07-01T10:00:30.000Z' })];
  const jitter = await service.pollTenant(context);
  assert.equal(jitter.enqueued, 0);
  assert.equal(jitter.deduped, 1);

  // Occurrence moved by 5 minutes: a genuinely new occurrence.
  dataset.alerts = [stubAlert({ id: 'chk-a', occurrenceStartedAt: '2026-07-01T10:05:00.000Z' })];
  const refire = await service.pollTenant(context);
  assert.equal(refire.enqueued, 1);
  const itemsForA = (stores.get(AiAgentWorkItem.name) ?? []).filter((item) => item.source_object_ref === 'chk-a');
  assert.equal(itemsForA.length, 2);

  // Severity escalation inside the same occurrence is new work.
  dataset.alerts = [stubAlert({ id: 'chk-a', severity: 'critical', occurrenceStartedAt: '2026-07-01T10:05:00.000Z' })];
  const escalated = await service.pollTenant(context);
  assert.equal(escalated.enqueued, 1, 'severity ladder increase escalates the same occurrence');

  // warning -> down class change is an escalation too.
  dataset.alerts = [stubAlert({ id: 'chk-b', status: 'warning', severity: 'medium', occurrenceStartedAt: '2026-07-01T11:00:00.000Z' })];
  const warned = await service.pollTenant(context);
  assert.equal(warned.enqueued, 1);
  dataset.alerts = [stubAlert({ id: 'chk-b', status: 'down', severity: 'medium', occurrenceStartedAt: '2026-07-01T11:00:00.000Z' })];
  const classEscalated = await service.pollTenant(context);
  assert.equal(classEscalated.enqueued, 1, 'warning->down class change escalates the same occurrence');
}

async function testRearmAfterClearanceProducesNewItem() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  const definition = await enableSreMonitoring(context, queue);
  const dataset = { alerts: [stubAlert({ id: 'chk-clear', occurrenceStartedAt: '2026-07-01T09:00:00.000Z' })] };
  const { provider } = wrapListProvider(null, dataset);
  const service = createMonitoringIngestionService({ queue, provider, control: completingControl(queue) });

  const first = await service.pollTenant(context);
  assert.equal(first.enqueued, 1);

  // Alert gone from an untruncated fetch -> occurrence cleared (re-armed).
  dataset.alerts = [];
  const cleared = await service.pollTenant(context);
  assert.equal(cleared.enqueued, 0);
  const state = (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'chk-clear');
  assert.equal((state?.state_json as any)?.occurrence_started_at, null);
  assert.equal(typeof (state?.state_json as any)?.cleared_at, 'string');

  // Refire — even with the SAME occurrence timestamp the re-arm makes it new work.
  dataset.alerts = [stubAlert({ id: 'chk-clear', occurrenceStartedAt: '2026-07-01T09:00:00.000Z' })];
  const refired = await service.pollTenant(context);
  assert.equal(refired.enqueued, 1);
  const items = (stores.get(AiAgentWorkItem.name) ?? []).filter((item) => item.source_object_ref === 'chk-clear');
  assert.equal(items.length, 2);

  // A truncated fetch proves nothing about absence: no re-arm.
  const rearmResult = await queue.reconcileMonitoringOccurrenceClearances(context, {
    definition,
    fetchedAlerts: [],
    fetchTruncated: true,
  });
  assert.equal(rearmResult.rearmed, 0);
}

// Regression (adversarial review 2026-07-06): alerts whose provider exposes NO
// occurrence timestamp (contractually nullable; PRTG warning/unusual states)
// were treated as first_occurrence on EVERY cycle — the same persistent alert
// was re-diagnosed and re-billed every 5 minutes forever. The occurrence-open
// marker, not the timestamp, now decides whether an occurrence is recorded.
async function testNullOccurrenceAlertIsDiagnosedOnceNotEveryCycle() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const dataset = { alerts: [stubAlert({ id: 'chk-null-occ', status: 'warning', severity: 'medium', occurrenceStartedAt: null })] };
  const { provider } = wrapListProvider(null, dataset);
  const service = createMonitoringIngestionService({ queue, provider, control: completingControl(queue) });

  const first = await service.pollTenant(context);
  assert.equal(first.enqueued, 1);
  assert.equal(first.processed, 1);

  // Same alert, still no occurrence timestamp: duplicate, NOT a new first
  // occurrence — no new work item, no new diagnosis, on any later cycle.
  const second = await service.pollTenant(context);
  assert.equal(second.enqueued, 0, 'null-occurrence alert must not re-enter first_occurrence every cycle');
  assert.equal(second.deduped, 1);
  const third = await service.pollTenant(context);
  assert.equal(third.enqueued, 0);
  assert.equal(
    (stores.get(AiAgentWorkItem.name) ?? []).filter((item) => item.source_object_ref === 'chk-null-occ').length,
    1,
  );

  // Escalation inside the null-occurrence alarm still surfaces as new work.
  dataset.alerts = [stubAlert({ id: 'chk-null-occ', status: 'down', severity: 'medium', occurrenceStartedAt: null })];
  const escalated = await service.pollTenant(context);
  assert.equal(escalated.enqueued, 1, 'warning->down class change still escalates without a timestamp');

  // Clearance re-arms null-occurrence states too (the old timestamp-based
  // re-arm skipped them): vanished from an untruncated fetch, then refired.
  dataset.alerts = [];
  await service.pollTenant(context);
  const state = (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'chk-null-occ');
  assert.equal((state?.state_json as any)?.occurrence_open, false, 'clearance closes the occurrence marker');
  dataset.alerts = [stubAlert({ id: 'chk-null-occ', status: 'warning', severity: 'medium', occurrenceStartedAt: null })];
  const refired = await service.pollTenant(context);
  assert.equal(refired.enqueued, 1, 'a refire after clearance is a new occurrence');
}

// Regression (adversarial review 2026-07-06): group/device/check_type
// predicates authored by the UI pickers store provider object IDS; adapters
// now attach the matching ids on their alerts, so the local authority matcher
// accepts them (previously: listed > 0, enqueued = 0, every cycle, silently).
async function testProviderRefIdPredicatesEnqueueOnPavedPath() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue, {
    targetingPredicates: [
      { field: 'group', operator: 'in', value: ['mock-group-prod'] },
      { field: 'device', operator: 'in', value: ['mock-device-db-01'] },
      { field: 'check_type', operator: 'in', value: ['mock-checktype-ping'] },
    ],
  });
  const { provider, scopes } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });

  const result = await service.pollTenant(context);
  assert.equal(result.status, 'completed');
  assert.deepEqual(scopes[0].groupIds, ['mock-group-prod']);
  assert.deepEqual(scopes[0].deviceIds, ['mock-device-db-01']);
  assert.deepEqual(scopes[0].checkTypeIds, ['mock-checktype-ping']);
  assert.equal(result.listed, 1);
  assert.equal(result.enqueued, 1, 'id-authored predicates must survive the local re-filter');
  assert.deepEqual(
    (stores.get(AiAgentWorkItem.name) ?? []).map((item) => item.source_object_ref),
    ['mock-check-db01-ping'],
  );
}

// Regression (adversarial review 2026-07-06): touched_by is occurrence-scoped.
// The lifetime agent_touched flag alone made a sensor the agent had EVER
// diagnosed permanently invisible to a "touched_by not self" agent — a brand
// new outage weeks after a recovery was filtered out forever.
async function testTouchedByPredicateIsOccurrenceScoped() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue, {
    targetingPredicates: [{ field: 'touched_by', operator: 'not', value: 'self' }],
  });
  const dataset = { alerts: [stubAlert({ id: 'chk-touch', occurrenceStartedAt: '2026-07-01T10:00:00.000Z' })] };
  const { provider } = wrapListProvider(null, dataset);
  // Control that records the real diagnosis outcome (sets agent_touched).
  const control = {
    runMonitoringDiagnosis: async (runContext: AiExecutionContextWithManager, input: { work_item_id?: string | null }) => {
      const repo = runContext.manager.getRepository(AiAgentWorkItem);
      const workItem = await repo.findOne({ where: { id: input.work_item_id, tenant_id: runContext.tenantId } });
      const definitionRow = await runContext.manager.getRepository(AiAgentDefinition).findOne({
        where: { id: workItem.agent_definition_id, tenant_id: runContext.tenantId },
      });
      const snapshot = (workItem.metadata_json as any)?.alert ?? {};
      await queue.recordMonitoringDiagnosisOutcome(runContext, {
        definition: definitionRow,
        workItem,
        runId: null,
        alert: {
          id: workItem.source_object_ref,
          status: snapshot.status ?? null,
          severity: snapshot.severity ?? null,
          occurrenceStartedAt: snapshot.occurrence_started_at ?? null,
        },
      });
      return { status: 'completed' };
    },
  };
  const service = createMonitoringIngestionService({ queue, provider, control });

  const first = await service.pollTenant(context);
  assert.equal(first.enqueued, 1);
  assert.equal(first.processed, 1);
  const touchedState = (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'chk-touch');
  assert.equal(touchedState?.agent_touched, true);

  // Same occurrence: already handled -> filtered out locally.
  const sameOccurrence = await service.pollTenant(context);
  assert.equal(sameOccurrence.enqueued, 0, 'the handled occurrence stays filtered');

  // Occurrence moved beyond the jitter tolerance (flap between polls): the
  // touched marker no longer applies — this is new work.
  dataset.alerts = [stubAlert({ id: 'chk-touch', occurrenceStartedAt: '2026-07-01T10:05:00.000Z' })];
  const flapped = await service.pollTenant(context);
  assert.equal(flapped.enqueued, 1, 'a new occurrence is visible despite the lifetime agent_touched flag');
  assert.equal(flapped.processed, 1);

  // Recovery clears the occurrence; a much later outage must be visible even
  // though agent_touched remains true on the target state.
  dataset.alerts = [];
  await service.pollTenant(context);
  dataset.alerts = [stubAlert({ id: 'chk-touch', occurrenceStartedAt: '2026-07-03T08:00:00.000Z' })];
  const newOutage = await service.pollTenant(context);
  assert.equal(newOutage.enqueued, 1, 'a post-recovery outage must not be hidden by lifetime touched state');
  assert.equal(
    (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'chk-touch')?.agent_touched,
    true,
    'the lifetime flag itself is untouched — only its targeting interpretation is occurrence-scoped',
  );
}

// Regression (adversarial review 2026-07-06): ROLLBACK TO SAVEPOINT undid the
// failWorkItem bookkeeping written inside the diagnosis (attempt_count,
// failed status, backoff, dead-letter) while the detached built-in quota
// reservation survived — a deterministically failing diagnosis retried at
// full cost every cron tick forever. The poller now re-applies the failure
// bookkeeping after the rollback.
async function testSavepointRollbackKeepsFailureBookkeeping() {
  const { manager, stores } = createMemoryManager();
  // Simulated savepoint semantics for the in-memory store: SAVEPOINT
  // snapshots every table, ROLLBACK restores it — mirroring what Postgres
  // does to the cycle transaction (and what erased the bookkeeping).
  const savepoints = new Map<string, Map<string, any[]>>();
  (manager as any).query = async (sql: string) => {
    const text = String(sql).trim();
    if (text.includes('pg_try_advisory_xact_lock')) {
      return [{ locked: true }];
    }
    if (text.startsWith('ROLLBACK TO SAVEPOINT ')) {
      const name = text.slice('ROLLBACK TO SAVEPOINT '.length).trim();
      const snapshot = savepoints.get(name);
      if (snapshot) {
        for (const [table, rows] of stores.entries()) {
          const saved = snapshot.get(table) ?? [];
          rows.splice(0, rows.length, ...saved.map((row: any) => ({ ...row })));
        }
      }
      return [];
    }
    if (text.startsWith('SAVEPOINT ')) {
      const name = text.slice('SAVEPOINT '.length).trim();
      savepoints.set(name, new Map([...stores.entries()].map(([table, rows]) => [table, rows.map((row: any) => ({ ...row }))])));
      return [];
    }
    return [];
  };
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const dataset = { alerts: [stubAlert({ id: 'chk-fail' })] };
  const { provider } = wrapListProvider(null, dataset);
  const mockProvider = new MockMonitoringProvider();
  // Real control service; the history read fails deterministically AFTER the
  // built-in quota reservation, like a provider hard failure would.
  let runCounter = 0;
  const dispatcher = {
    execute: async (ctx: AiExecutionContextWithManager, request: any) => {
      runCounter += 1;
      if (request.capabilityName === 'monitoring.alert.get') {
        const output = await mockProvider.getAlert(ctx as any, { alertId: request.input.alert_id });
        return { run_id: `run-${runCounter}`, tool_execution_id: `tool-${runCounter}`, output };
      }
      if (request.capabilityName === 'monitoring.sensor.history') {
        throw new Error('history backend exploded');
      }
      throw new Error(`Unexpected capability in savepoint harness: ${request.capabilityName}`);
    },
  };
  const providers = {
    getApplicability: async () => ({ available: true }),
    monitoring: async () => mockProvider,
  };
  // Detached-reservation stand-in: lives OUTSIDE the stores, so the simulated
  // rollback cannot revert it — exactly like reserveMessageDetached.
  const quota = {
    reserved: 0,
    reserveRun: async () => { quota.reserved += 1; },
    assertQuotaAvailable: async () => undefined,
  };
  const control = new AiAgentControlService(
    {} as any,
    {} as any,
    dispatcher as any,
    {} as any,
    providers as any,
    queue,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    quota as any,
  );
  const service = createMonitoringIngestionService({ queue, provider, control, builtinQuota: quota });
  const itemFor = (ref: string) => (stores.get(AiAgentWorkItem.name) ?? []).find((row) => row.source_object_ref === ref);

  // Attempt 1: the failure bookkeeping must survive the savepoint rollback.
  const first = await service.pollTenant(context);
  assert.equal(first.enqueued, 1);
  assert.equal(first.errors.length, 1);
  let item = itemFor('chk-fail');
  assert.equal(item?.status, 'failed', 'rollback must not restore the item to queued');
  assert.equal(item?.attempt_count, 1, 'the rolled-back lease still consumed an attempt');
  assert.ok(item?.next_attempt_at instanceof Date && item.next_attempt_at.getTime() > Date.now(), 'retry backoff scheduled');
  assert.equal(quota.reserved, 1);

  // Attempts 2 and 3 (backoff bypassed explicitly): counting continues, and
  // the final attempt dead-letters instead of retrying forever.
  for (const expectedAttempt of [2, 3]) {
    item = itemFor('chk-fail');
    item.next_attempt_at = new Date(Date.now() - 1000);
    const summary = await service.pollTenant(context);
    item = itemFor('chk-fail');
    assert.equal(item?.attempt_count, expectedAttempt, `attempt ${expectedAttempt} recorded`);
    assert.equal(summary.errors.length, 1);
  }
  item = itemFor('chk-fail');
  assert.equal(item?.status, 'dead_letter', 'max_attempts dead-letters on the poller path');
  assert.equal(quota.reserved, 3, 'quota burn is bounded by max_attempts, not unbounded');

  // Later cycles: the dead-lettered occurrence is neither re-processed nor
  // re-enqueued, and burns no further quota.
  const after = await service.pollTenant(context);
  assert.equal(after.enqueued, 0);
  assert.equal(after.processed, 0);
  assert.equal(quota.reserved, 3);
  assert.equal((stores.get(AiAgentWorkItem.name) ?? []).filter((row) => row.source_object_ref === 'chk-fail').length, 1);
}

async function testFlapGuardAgePredicateExcludesYoungOccurrence() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue, {
    targetingPredicates: [
      { field: 'status', operator: 'in', value: ['down', 'down_partial'] },
      { field: 'age_minutes', operator: 'gte', value: 2 },
    ],
  });
  const { provider, scopes } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });

  const result = await service.pollTenant(context);
  assert.equal(result.status, 'completed');
  assert.equal(scopes[0].minAgeMinutes, 2, 'flap guard pushes down as minAgeMinutes');
  const refs = (stores.get(AiAgentWorkItem.name) ?? []).map((item) => item.source_object_ref);
  assert.equal(refs.includes('mock-check-db01-ping'), true);
  assert.equal(refs.includes('mock-check-sap-disk-flap'), false, 'occurrence younger than the age guard is excluded');
}

async function testPerCycleCapsBoundFetchAndEnqueue() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue, { maxAlertsPerCycle: 2, maxProviderRequestsPerCycle: 5 });
  const { provider, scopes } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });

  const result = await service.pollTenant(context);
  assert.equal(scopes[0].maxResults, 2, 'fetch bound = min(maxAlertsPerCycle, maxProviderRequestsPerCycle)');
  assert.equal(result.listed, 2);
  assert.equal(result.enqueued, 2);
  assert.equal((stores.get(AiAgentWorkItem.name) ?? []).length, 2);

  const { manager: manager2 } = createMemoryManager();
  const context2 = createContext(manager2);
  const queue2 = new AiAgentWorkQueueService();
  await enableSreMonitoring(context2, queue2, { maxAlertsPerCycle: 10, maxProviderRequestsPerCycle: 3 });
  const { provider: provider2, scopes: scopes2 } = wrapListProvider(new MockMonitoringProvider());
  const service2 = createMonitoringIngestionService({ queue: queue2, provider: provider2 });
  await service2.pollTenant(context2);
  assert.equal(scopes2[0].maxResults, 3, 'provider-request cap also bounds the fetch');
}

async function testFrozenSubscriptionSkipsBeforeProviderCalls() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const subscriptionRepo = context.manager.getRepository(Subscription);
  await subscriptionRepo.save(subscriptionRepo.create({
    id: randomUUID(),
    tenant_id: context.tenantId,
    status: SubscriptionStatus.TRIALING,
    trial_end: new Date(Date.now() - 24 * 60 * 60 * 1000),
    created_at: new Date(),
  }));
  const { provider, listCallCount } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({
    queue,
    provider,
    stripeConfig: { isConfigured: () => true },
  });

  const result = await service.pollTenant(context);
  assert.equal(result.status, 'skipped');
  assert.match(result.reason ?? '', /trial expired/i);
  assert.equal(listCallCount(), 0, 'frozen tenant must be skipped before any provider call');
  assert.equal(result.enqueued, 0);
}

async function testEmergencyPauseSkipsProviderWork() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  const definition = await enableSreMonitoring(context, queue);
  const pauseRepo = context.manager.getRepository(AiEmergencyPause);
  await pauseRepo.save(pauseRepo.create({
    id: randomUUID(),
    tenant_id: context.tenantId,
    agent_definition_id: null,
    scope: 'tenant',
    active: true,
    reason: 'incident response drill',
    created_at: new Date(),
    expires_at: null,
  }));
  const { provider, listCallCount } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });

  const result = await service.pollTenant(context);
  assert.equal(result.status, 'paused');
  assert.match(result.reason ?? '', /emergency pause/i);
  assert.equal(listCallCount(), 0, 'emergency pause must stop the cycle before provider calls');
  const savedDefinition = (stores.get(AiAgentDefinition.name) ?? []).find((row) => row.id === definition.id);
  assert.equal((savedDefinition?.metadata_json as any)?.monitoring_ingestion_state?.status, 'paused');
}

function createSkeletonHarness(queue: AiAgentWorkQueueService) {
  const mockProvider = new MockMonitoringProvider();
  const dispatched: string[] = [];
  let runCounter = 0;
  const dispatcher = {
    execute: async (ctx: AiExecutionContextWithManager, request: any) => {
      dispatched.push(request.capabilityName);
      let output: unknown;
      if (request.capabilityName === 'monitoring.alert.get') {
        output = await mockProvider.getAlert(ctx as any, { alertId: request.input.alert_id });
      } else if (request.capabilityName === 'monitoring.sensor.history') {
        output = await mockProvider.getSensorHistory(ctx as any, {
          sensorId: request.input.sensor_id,
          windowMinutes: request.input.window_minutes ?? null,
        });
      } else if (request.capabilityName === 'monitoring.state.get') {
        output = await mockProvider.getCurrentState(ctx as any, { sensorId: request.input.sensor_id });
      } else if (request.capabilityName === 'monitoring.alert.related.list') {
        output = await mockProvider.listRelatedAlerts(ctx as any, {
          sensorId: request.input.sensor_id,
          limit: request.input.limit ?? null,
        });
      } else if (request.capabilityName === 'monitoring.object.get') {
        // Device-context read for the KANAP IP tiebreak; mock check objects
        // carry no host address, so the pipeline degrades to name matching.
        output = await mockProvider.getMonitoredObject(ctx as any, { objectId: request.input.object_id });
      } else {
        // Enrichment capabilities (kanap.entity.*, search_knowledge, ...) are
        // deliberately unavailable in this poller-focused harness: the
        // diagnosis pipeline must degrade them to skipped sources.
        throw new Error(`Unexpected capability in monitoring harness: ${request.capabilityName}`);
      }
      runCounter += 1;
      return { run_id: `run-${runCounter}`, tool_execution_id: `tool-${runCounter}`, output };
    },
  };
  const providers = {
    getApplicability: async () => ({ available: true }),
    monitoring: async () => mockProvider,
  };
  const control = new AiAgentControlService(
    {} as any,
    {} as any,
    dispatcher as any,
    {} as any,
    providers as any,
    queue,
  );
  const { provider } = wrapListProvider(mockProvider);
  const service = createMonitoringIngestionService({ queue, provider, control });
  return { control, service, dispatched };
}

async function testDiagnosisSkeletonEndToEnd() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  await enableSreMonitoring(context, queue);
  const { service, dispatched } = createSkeletonHarness(queue);

  const result = await service.pollTenant(context);
  assert.equal(result.status, 'completed');
  assert.equal(result.enqueued, 7);
  assert.equal(result.processed, 7, 'pass 2 runs the skeleton for every enqueued alert');
  assert.equal(result.errors.length, 0, `no processing errors expected: ${result.errors.join(' | ')}`);

  const workItems = stores.get(AiAgentWorkItem.name) ?? [];
  assert.equal(workItems.length, 7);
  for (const item of workItems) {
    assert.equal(item.status, 'completed');
    assert.equal(typeof item.last_run_id, 'string');
  }

  const observations = (stores.get(AiObservation.name) ?? [])
    .filter((row) => row.observation_type === 'monitoring_alert_diagnostic');
  assert.equal(observations.length, 7);
  const pingObservation = observations.find((row) => row.source_object_id === 'mock-check-db01-ping');
  assert.ok(pingObservation);
  assert.equal(pingObservation.source_provider, 'monitoring:mock');
  assert.equal(pingObservation.source_object_type, 'sensor');
  assert.equal((pingObservation.metadata_json as any)?.diagnosis_stage, 'llm_brief');
  // Without a diagnostic-brief service the pipeline records the conservative fallback.
  assert.equal((pingObservation.metadata_json as any)?.synthesis_fallback, true);
  assert.equal((pingObservation.metadata_json as any)?.synthesis_fallback_reason, 'synthesis_service_unavailable');
  // Plan 38: the diagnosis observation (review surface) stores a clamped
  // excerpt of the alert message; work items above still must not.
  assert.equal(((pingObservation.metadata_json as any)?.alert ?? {}).message, 'Ping timed out (100% packet loss).');

  const pingState = (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'mock-check-db01-ping');
  assert.ok(pingState);
  assert.equal(pingState.agent_touched, true);
  assert.equal(pingState.claim_status, 'none', 'claim released after diagnosis completion');
  assert.equal((pingState.claim_metadata_json as any)?.source, 'work_item_acquire', 'generalized acquireWorkItem claim path fired for monitoring items');
  assert.equal((pingState.claim_metadata_json as any)?.released_reason, 'diagnosis_completed_without_pending_proposals');
  assert.equal((pingState.state_json as any)?.occurrence_started_at, '2026-05-26T10:07:00.000Z');
  assert.ok(pingState.next_review_at instanceof Date);

  assert.equal(dispatched.includes('monitoring.alert.get'), true);
  assert.equal(dispatched.includes('monitoring.sensor.history'), true);
  assert.equal(dispatched.includes('monitoring.state.get'), true, 'current-state read goes through the dispatcher');
  assert.equal(dispatched.includes('monitoring.alert.related.list'), true, 'related-alerts read goes through the dispatcher');
  assert.equal(dispatched.includes('monitoring.object.get'), true, 'monitored-object read goes through the dispatcher (IP tiebreak input)');

  // Second poll: completed occurrences dedupe; nothing new runs.
  const second = await service.pollTenant(context);
  assert.equal(second.enqueued, 0);
  assert.equal(second.deduped, 7);

  // Overview: SRE definition + monitoring work items flow through the generic lists.
  const overview = await queue.listOverview(context);
  assert.equal(overview.definitions.some((row) => row.agent_type === 'sre'), true);
  assert.equal(overview.workItems.some((row) => row.work_kind === MONITORING_ALERT_DIAGNOSTIC_WORK_KIND), true);
  assert.equal(overview.targetStates.some((row) => row.target_type === 'sensor'), true);
}

async function testManualDiagnosisTestPath() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  const definition = await enableSreMonitoring(context, queue);
  const { control } = createSkeletonHarness(queue);

  await assert.rejects(
    () => control.runMonitoringDiagnosis(context, { agent_definition_id: definition.id }),
    (error: unknown) => error instanceof BadRequestException,
  );

  const result = await control.runMonitoringDiagnosis(context, {
    agent_definition_id: definition.id,
    alert_id: 'mock-sensor-cpu-001',
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.diagnostic.diagnosis_stage, 'llm_brief');
  assert.equal(result.diagnostic.brief.fallback, true, 'no brief service in this harness -> conservative fallback');
  assert.equal(result.diagnostic.alert.id, 'mock-sensor-cpu-001');
  assert.equal(result.work_item.status, 'completed');
  assert.equal(result.work_item.work_kind, MONITORING_ALERT_DIAGNOSTIC_WORK_KIND);
  assert.equal(typeof result.diagnostic.observation_id, 'string');
  assert.equal(result.diagnostic.related_alert_count <= 5, true);

  const state = (stores.get(AiAgentTargetState.name) ?? []).find((row) => row.target_ref === 'mock-sensor-cpu-001');
  assert.equal(state?.agent_touched, true);
  assert.equal(state?.claim_status, 'none');

  // An operator can explicitly re-run the same alert: the completed item does
  // not block a fresh manual test.
  const rerun = await control.runMonitoringDiagnosis(context, {
    agent_definition_id: definition.id,
    alert_id: 'mock-sensor-cpu-001',
  });
  assert.equal(rerun.status, 'completed');
}

// Run modes (plan 39, PR A): Off = nothing, Manual = "Check for alerts" only,
// Watching = cron + manual. A manual check must therefore work while the
// scheduled poll is off, the cron must still refuse to run it, and an agent
// that is turned off must stay a no-op with a readable reason.
async function testManualCheckRunsWithoutWatchingAndOffStaysInert() {
  const { manager, stores } = createMemoryManager();
  const context = createContext(manager);
  const queue = new AiAgentWorkQueueService();
  const definition = await enableSreMonitoring(context, queue);

  // Manual run mode: enabled, but not watching.
  definition.trigger_policy_json = {
    ...(definition.trigger_policy_json ?? {}),
    scheduled_poll: { enabled: false },
  };
  definition.updated_at = new Date();
  const definitionRepo = manager.getRepository(AiAgentDefinition);
  await definitionRepo.save(definition);

  // The scheduled (cron) resolution still requires watching...
  assert.throws(
    () => queue.resolveMonitoringScopeIngestionConfig(definition),
    (error: unknown) => error instanceof ForbiddenException,
    'the cron path must keep requiring the scheduled poll',
  );
  // ...while the manual trigger resolves the very same scope.
  const manualConfig = queue.resolveMonitoringScopeIngestionConfig(definition, { trigger: 'manual' });
  assert.equal(manualConfig.enabled, true);
  assert.equal(manualConfig.maxAlertsPerCycle, 10);

  const { provider } = wrapListProvider(new MockMonitoringProvider());
  const service = createMonitoringIngestionService({ queue, provider });
  const manualPoll = await service.pollTenant(context);
  assert.equal(manualPoll.status, 'completed', 'a manual check runs in Manual mode');
  assert.equal(manualPoll.enqueued, 7);
  assert.equal((stores.get(AiAgentWorkItem.name) ?? []).length, 7);

  // Off: the agent is excluded entirely and the operator gets a plain reason.
  const off = await definitionRepo.findOne({ where: { id: definition.id, tenant_id: context.tenantId } });
  assert.ok(off);
  off.status = 'disabled';
  off.updated_at = new Date();
  await definitionRepo.save(off);
  const offPoll = await service.pollTenant(context);
  assert.equal(offPoll.status, 'disabled');
  assert.match(String(offPoll.reason ?? ''), /turned on/i);
}

async function run() {
  await testDetectEnqueuesDefaultTargetingSetAndDedups();
  await testOccurrenceToleranceAndEscalation();
  await testRearmAfterClearanceProducesNewItem();
  await testNullOccurrenceAlertIsDiagnosedOnceNotEveryCycle();
  await testProviderRefIdPredicatesEnqueueOnPavedPath();
  await testTouchedByPredicateIsOccurrenceScoped();
  await testSavepointRollbackKeepsFailureBookkeeping();
  await testFlapGuardAgePredicateExcludesYoungOccurrence();
  await testPerCycleCapsBoundFetchAndEnqueue();
  await testFrozenSubscriptionSkipsBeforeProviderCalls();
  await testEmergencyPauseSkipsProviderWork();
  await testDiagnosisSkeletonEndToEnd();
  await testManualDiagnosisTestPath();
  await testManualCheckRunsWithoutWatchingAndOffStaysInert();
  console.log('ai-monitoring-ingestion.spec: all tests passed');
}

void run();
