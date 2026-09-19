import * as assert from 'node:assert/strict';
import { PortfolioRoadmapService } from '../services/portfolio-roadmap.service';
import { parseRoadmapGenerate } from '../dto/roadmap.dto';

/**
 * Characterisation tests for runScheduler.
 *
 * A 1,691-line capacity-constrained scheduler had no test at all, so these pin the behaviour
 * it has TODAY rather than the behaviour anyone intended. They exist to make a change to it
 * fail loudly: nothing here is a specification to design against.
 *
 * Two things make it testable without a database:
 *
 *  - `Object.create(PortfolioRoadmapService.prototype)` resolves the eight `this.*` helpers
 *    the scheduler calls (computeEffectiveWeeklyCapacity, addCommittedLoad, …) without running
 *    the constructor, so no repositories or Nest wiring are needed.
 *  - options come from `parseRoadmapGenerate`, exactly as in production. Building a partial
 *    options object by hand is what makes the scheduler report "no effective capacity": the
 *    capacity maths reads `contextSwitchGrace` and `contextSwitchPenaltyPct`, and undefined
 *    values turn the whole factor into NaN.
 */

const start = () => new Date('2026-01-05');

function contributor(id: string, monthlyCapacity: number) {
  return {
    id,
    name: `Contributor ${id}`,
    teamId: null,
    teamName: null,
    monthlyCapacity,
    weeklyCapacity: (monthlyCapacity * 12) / 52,
  };
}

function project(id: string, contributorDays: Map<string, number>, overrides: Record<string, unknown> = {}) {
  const total = [...contributorDays.values()].reduce((a, b) => a + b, 0);
  return {
    id,
    name: `Project ${id}`,
    status: 'planned',
    schedulingMode: 'independent',
    constraint: null,
    categoryId: null,
    sourceId: null,
    streamId: null,
    priorityScore: 100,
    executionProgress: 0,
    remainingIt: total,
    remainingBusiness: 0,
    remainingTotal: total,
    itContributorDays: new Map(contributorDays),
    businessContributorDays: new Map(),
    contributorDays: new Map(contributorDays),
    blockers: [],
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null,
    ...overrides,
  };
}

function prepared(candidates: any[], contributors: any[]) {
  return {
    options: parseRoadmapGenerate({ startDate: '2026-01-05' }),
    contributors: new Map(contributors.map((c) => [c.id, c])),
    candidates: new Map(candidates.map((c) => [c.id, c])),
    projectRowsById: new Map(
      candidates.map((c) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          status: c.status,
          scheduling_mode: c.schedulingMode,
          category_id: null,
          source_id: null,
          stream_id: null,
          priority_score: c.priorityScore,
          execution_progress: 0,
          estimated_effort_it: null,
          estimated_effort_business: null,
          it_effort_allocation_mode: 'auto',
          business_effort_allocation_mode: 'auto',
          it_lead_id: null,
          business_lead_id: null,
          planned_start: null,
          planned_end: null,
          actual_start: null,
          actual_end: null,
        },
      ]),
    ),
    relevantContributorIds: new Set(contributors.map((c) => c.id)),
    expiredFixedPlanProjectIds: new Set<string>(),
    blockersByProject: new Map<string, string[]>(),
    existingEndByProject: new Map<string, Date>(),
    preUnschedulable: new Map<string, unknown>(),
    reservations: [],
    projectNameById: new Map(candidates.map((c) => [c.id, c.name])),
  };
}

function scheduler() {
  const svc: any = Object.create(PortfolioRoadmapService.prototype);
  return (preparedData: any, collectOccupation = false) =>
    svc.runScheduler(preparedData, null, collectOccupation, start());
}

async function testSchedulesASingleProjectAcrossItsWeeks() {
  // 10 days for a contributor at 20 days/month (4.62 d/week) spans three week starts.
  const run = scheduler();
  const result = await run(prepared([project('p1', new Map([['c1', 10]]))], [contributor('c1', 20)]));

  assert.equal(result.schedule.length, 1, 'the project is scheduled');
  assert.equal(result.unschedulable.length, 0);
  const item = result.schedule[0];
  assert.equal(item.projectId, 'p1');
  assert.equal(item.plannedStart, '2026-01-05');
  assert.equal(item.plannedEnd, '2026-01-23');
  assert.equal(item.durationWeeks, 3);
  assert.equal(item.remainingEffortDays, 10);
  assert.deepEqual(item.activeWeekStarts, ['2026-01-05', '2026-01-12', '2026-01-19']);
  assert.deepEqual(item.contributorLoads, [
    { contributorId: 'c1', contributorName: 'Contributor c1', days: 10 },
  ]);
  assert.equal(result.roadmapEndDate, '2026-01-23');
}

async function testSerialisesProjectsSharingAContributor() {
  // parallelizationLimit defaults to 1: two 10-day projects on one contributor queue up
  // rather than overlap, in priority order (p5a 100 before p5b 50).
  const run = scheduler();
  const result = await run(
    prepared(
      [
        project('p5a', new Map([['c1', 10]])),
        project('p5b', new Map([['c1', 10]]), { priorityScore: 50 }),
      ],
      [contributor('c1', 20)],
    ),
  );

  assert.equal(result.schedule.length, 2);
  const byId = new Map(result.schedule.map((s: any) => [s.projectId, s]));
  assert.equal((byId.get('p5a') as any).plannedStart, '2026-01-05');
  assert.equal((byId.get('p5b') as any).plannedStart, '2026-01-26');
  assert.equal(result.roadmapEndDate, '2026-02-13');
}

async function testReportsAProjectWithNoAllocableCapacity() {
  const run = scheduler();
  const result = await run(prepared([project('p0', new Map([['c0', 5]]))], [contributor('c0', 0)]));

  assert.equal(result.schedule.length, 0);
  assert.equal(result.unschedulable.length, 1);
  assert.equal(result.unschedulable[0].projectId, 'p0');
  assert.equal(result.unschedulable[0].reason, 'no_effective_capacity');
  assert.match(result.unschedulable[0].details ?? '', /no allocable weekly capacity/i);
  assert.equal(result.roadmapEndDate, null);
}

async function testSchedulesALongProjectToAFarHorizon() {
  const run = scheduler();
  const result = await run(prepared([project('p2', new Map([['c1', 200]]))], [contributor('c1', 20)]));

  assert.equal(result.schedule.length, 1);
  assert.equal(result.unschedulable.length, 0);
  assert.equal(result.roadmapEndDate, '2026-11-06');
}

async function testIsDeterministic() {
  const run = scheduler();
  const first = await run(prepared([project('p1', new Map([['c1', 10]]))], [contributor('c1', 20)]));
  const second = await run(prepared([project('p1', new Map([['c1', 10]]))], [contributor('c1', 20)]));

  assert.deepEqual(second.schedule, first.schedule, 'the same input yields the same schedule');
  assert.equal(second.roadmapEndDate, first.roadmapEndDate);
}

async function testOccupationLedgerIsProducedOnDemand() {
  const run = scheduler();
  const without = await run(prepared([project('p1', new Map([['c1', 10]]))], [contributor('c1', 20)]), false);
  const with_ = await run(prepared([project('p1', new Map([['c1', 10]]))], [contributor('c1', 20)]), true);

  assert.equal(without.weeklyProjectLoad, null, 'no ledger unless asked for');
  assert.ok(with_.weeklyProjectLoad, 'the ledger is produced when collectOccupation is set');
  assert.ok(with_.weeklyProjectLoad.has('c1'), 'keyed by contributor');
}

async function run() {
  await testSchedulesASingleProjectAcrossItsWeeks();
  await testSerialisesProjectsSharingAContributor();
  await testReportsAProjectWithNoAllocableCapacity();
  await testSchedulesALongProjectToAFarHorizon();
  await testIsDeterministic();
  await testOccupationLedgerIsProducedOnDemand();
}

void run();
