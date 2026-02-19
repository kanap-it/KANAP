import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PortfolioProject, ProjectStatus } from '../portfolio-project.entity';
import { TeamMemberConfigService } from '../team-member-config.service';
import { PortfolioProjectsCrudService } from './portfolio-projects-crud.service';
import {
  RoadmapApplyDto,
  RoadmapGenerateDto,
  RoadmapReservation,
  RoadmapReservationReason,
  RoadmapResponse,
  ScheduledProject,
  TeamOccupationEntry,
  UnschedulableProject,
  OccupationEntry,
  OnHoldRange,
  parseRoadmapApply,
  parseRoadmapGenerate,
  BottleneckEntry,
} from '../dto/roadmap.dto';
import { Allocation, computeAutoAllocations } from '../utils/allocation-utils';

type ServiceOpts = { manager?: EntityManager };

type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  category_id: string | null;
  source_id: string | null;
  stream_id: string | null;
  priority_score: number | null;
  execution_progress: number | null;
  estimated_effort_it: number | null;
  estimated_effort_business: number | null;
  it_effort_allocation_mode: 'auto' | 'manual';
  business_effort_allocation_mode: 'auto' | 'manual';
  it_lead_id: string | null;
  business_lead_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
};

type DependencyRow = {
  project_id: string;
  depends_on_project_id: string | null;
};

type ManualAllocationRow = {
  project_id: string;
  user_id: string;
  effort_type: 'it' | 'business';
  allocation_pct: number;
};

type TeamAssignmentRow = {
  project_id: string;
  user_id: string;
  role: 'it_team' | 'business_team';
};

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type TeamMemberConfigRow = {
  config_id: string;
  user_id: string;
  team_id: string | null;
  team_name: string | null;
  project_availability: number | null;
  user_display_name: string | null;
  user_email: string | null;
  first_name: string | null;
  last_name: string | null;
};

type Person = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type ContributorInfo = {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  monthlyCapacity: number;
  weeklyCapacity: number;
};

type ProjectComputation = {
  id: string;
  name: string;
  status: ProjectStatus;
  categoryId: string | null;
  sourceId: string | null;
  streamId: string | null;
  priorityScore: number | null;
  executionProgress: number;
  remainingIt: number;
  remainingBusiness: number;
  remainingTotal: number;
  contributorDays: Map<string, number>;
  blockers: string[];
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
};

type CapacityReservation = {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  categoryId: string | null;
  sourceId: string | null;
  streamId: string | null;
  executionProgress: number;
  reason: RoadmapReservationReason;
  startDate: Date;
  endDate: Date;
  startWeek: Date;
  endWeek: Date;
  weeklyLoads: Map<string, Map<string, number>>;
};

type PreparedData = {
  options: RoadmapGenerateDto;
  contributors: Map<string, ContributorInfo>;
  candidates: Map<string, ProjectComputation>;
  blockersByProject: Map<string, string[]>;
  existingEndByProject: Map<string, Date>;
  preUnschedulable: Map<string, UnschedulableProject>;
  reservations: CapacityReservation[];
  projectNameById: Map<string, string>;
};

type CommittedLoadLedger = Map<string, Map<string, number>>;
type ActiveProjectsLedger = Map<string, Map<string, Set<string>>>;
type WeeklyProjectLoadLedger = Map<string, Map<string, Map<string, number>>>;

type SchedulerResult = {
  schedule: ScheduledProject[];
  reservations: RoadmapReservation[];
  unschedulable: UnschedulableProject[];
  roadmapEndDate: string | null;
  weeklyProjectLoad: WeeklyProjectLoadLedger | null;
};

const CAPACITY_CONSUMING_STATUSES: ProjectStatus[] = [
  'waiting_list',
  'planned',
  'in_progress',
  'in_testing',
];

const SLOT_OCCUPANCY_THRESHOLD_DAYS = 0.5;

const EPSILON = 0.0001;
const MAX_WEEKS_TO_SCAN = 520;
const MAX_WEEKS_TO_SCAN_HARD_CAP = 5200;
const MAX_SENSITIVITY_CONTRIBUTORS = 30;
const WORK_DAYS_PER_WEEK = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseYmdUtc(input: string): Date {
  const [y, m, d] = input.split('-').map((part) => Number(part));
  return new Date(Date.UTC(y, m - 1, d));
}

function toYmdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function getWeekStartMondayUtc(date: Date): Date {
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  return addDaysUtc(date, -offset);
}

function ceilToMondayUtc(date: Date): Date {
  const monday = getWeekStartMondayUtc(date);
  return monday.getTime() < date.getTime() ? addDaysUtc(monday, 7) : monday;
}

function compareNullableNumberDesc(a: number | null, b: number | null): number {
  return (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);
}

@Injectable()
export class PortfolioRoadmapService {
  constructor(
    @InjectRepository(PortfolioProject)
    private readonly projectRepo: Repository<PortfolioProject>,
    private readonly teamMemberConfigService: TeamMemberConfigService,
    private readonly projectsCrudService: PortfolioProjectsCrudService,
  ) {}

  async generateRoadmap(
    tenantId: string,
    input: RoadmapGenerateDto | unknown,
    svcOpts?: ServiceOpts,
  ): Promise<RoadmapResponse> {
    const startedAt = Date.now();
    const mg = svcOpts?.manager ?? this.projectRepo.manager;
    const now = new Date();
    const asOfDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let options: RoadmapGenerateDto;
    try {
      options = parseRoadmapGenerate(input);
    } catch (error: any) {
      throw new BadRequestException(this.extractErrorMessage(error));
    }

    const prepared = await this.prepareData(tenantId, options, mg);
    const baseResult = this.runScheduler(prepared, null, true, asOfDate);

    const contributorsForSensitivity = Array.from(prepared.contributors.values())
      .filter((c) => c.monthlyCapacity > EPSILON)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const sensitivityTruncated = contributorsForSensitivity.length > MAX_SENSITIVITY_CONTRIBUTORS;
    const sampledContributors = contributorsForSensitivity.slice(0, MAX_SENSITIVITY_CONTRIBUTORS);

    const baseEndDate = baseResult.roadmapEndDate ? parseYmdUtc(baseResult.roadmapEndDate) : null;
    const bottlenecks: BottleneckEntry[] = [];

    for (const contributor of sampledContributors) {
      const overriddenMonthlyCap = new Map<string, number>([
        [contributor.id, contributor.monthlyCapacity + 1],
      ]);
      const rerun = this.runScheduler(prepared, overriddenMonthlyCap, false, asOfDate);
      const rerunEndDate = rerun.roadmapEndDate ? parseYmdUtc(rerun.roadmapEndDate) : null;
      let impactDays = 0;
      if (baseEndDate && rerunEndDate) {
        impactDays = Math.max(0, Math.round((baseEndDate.getTime() - rerunEndDate.getTime()) / MS_PER_DAY));
      }
      bottlenecks.push({
        contributorId: contributor.id,
        contributorName: contributor.name,
        impactDays,
      });
    }

    bottlenecks.sort((a, b) =>
      b.impactDays - a.impactDays
      || a.contributorName.localeCompare(b.contributorName)
      || a.contributorId.localeCompare(b.contributorId));

    // Attach on-hold ranges to scheduled projects via batched audit query.
    if (baseResult.schedule.length > 0) {
      const onHoldRangesByProject = await this.buildOnHoldRanges(
        tenantId,
        baseResult.schedule,
        mg,
      );
      for (const item of baseResult.schedule) {
        const ranges = onHoldRangesByProject.get(item.projectId);
        if (ranges && ranges.length > 0) {
          item.onHoldRanges = ranges;
        }
      }
    }

    const occupation = this.buildOccupation(
      baseResult.weeklyProjectLoad,
      prepared.contributors,
      prepared.projectNameById,
    );
    const teamOccupation = this.buildTeamOccupation(occupation);
    const reservationByReason = {
      not_recalculated: baseResult.reservations.filter((r) => r.reason === 'not_recalculated').length,
      external_blocker: baseResult.reservations.filter((r) => r.reason === 'external_blocker').length,
    };

    return {
      schedule: baseResult.schedule,
      reservations: baseResult.reservations,
      bottlenecks,
      occupation,
      teamOccupation,
      roadmapEndDate: baseResult.roadmapEndDate,
      unschedulable: baseResult.unschedulable,
      options,
      diagnostics: {
        modeLabel: options.optimizationMode,
        runDurationMs: Date.now() - startedAt,
        candidateProjects: prepared.candidates.size,
        scheduledProjects: baseResult.schedule.length,
        reservationProjects: baseResult.reservations.length,
        reservationByReason,
        hiddenCapacityProjects: 0,
        frozenProjects: baseResult.reservations.length,
        unschedulableProjects: baseResult.unschedulable.length,
        sensitivityReruns: sampledContributors.length,
        sensitivityTruncated,
      },
    };
  }

  async applyDates(
    tenantId: string,
    input: RoadmapApplyDto | unknown,
    userId: string | null,
    svcOpts?: ServiceOpts,
  ): Promise<{ updated: number }> {
    const mg = svcOpts?.manager ?? this.projectRepo.manager;
    let parsed: RoadmapApplyDto;
    try {
      parsed = parseRoadmapApply(input);
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Roadmap apply failed',
        code: 'ROADMAP_APPLY_FAILED',
        details: [{ projectId: 'request', error: this.extractErrorMessage(error) }],
      });
    }

    let currentProjectId: string | null = null;
    try {
      await mg.transaction(async (trx) => {
        for (const project of parsed.projects) {
          currentProjectId = project.projectId;
          await this.projectsCrudService.update(
            project.projectId,
            ({
              planned_start: project.plannedStart,
              planned_end: project.plannedEnd,
            } as any),
            tenantId,
            userId,
            { manager: trx },
          );
        }
      });
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Roadmap apply failed',
        code: 'ROADMAP_APPLY_FAILED',
        details: currentProjectId
          ? [{ projectId: currentProjectId, error: this.extractErrorMessage(error) }]
          : [],
      });
    }

    return { updated: parsed.projects.length };
  }

  private extractErrorMessage(error: any): string {
    if (Array.isArray(error?.issues)) {
      return error.issues.map((issue: any) => issue?.message).filter(Boolean).join(', ');
    }
    const response = error?.response;
    if (Array.isArray(response?.message)) {
      return response.message.join(', ');
    }
    if (typeof response?.message === 'string') {
      return response.message;
    }
    if (typeof response === 'string') {
      return response;
    }
    if (Array.isArray(error?.message)) {
      return error.message.join(', ');
    }
    if (typeof error?.message === 'string') {
      return error.message;
    }
    return 'Unknown error';
  }

  private async prepareData(
    tenantId: string,
    options: RoadmapGenerateDto,
    mg: EntityManager,
  ): Promise<PreparedData> {
    const projectRows: ProjectRow[] = await mg.query(
      `
      SELECT
        p.id,
        p.name,
        p.status,
        p.category_id,
        p.source_id,
        p.stream_id,
        p.priority_score,
        p.execution_progress,
        p.estimated_effort_it,
        p.estimated_effort_business,
        p.it_effort_allocation_mode,
        p.business_effort_allocation_mode,
        p.it_lead_id,
        p.business_lead_id,
        p.planned_start,
        p.planned_end,
        p.actual_start,
        p.actual_end
      FROM portfolio_projects p
      WHERE p.tenant_id = $1
        AND p.status <> 'cancelled'
      ORDER BY p.id ASC
    `,
      [tenantId],
    );

    const projectById = new Map<string, ProjectRow>();
    const projectNameById = new Map<string, string>();
    for (const row of projectRows) {
      projectById.set(row.id, row);
      projectNameById.set(row.id, row.name);
    }
    const excludedProjectIds = new Set<string>(options.excludedProjectIds ?? []);

    const candidateIds = new Set<string>();
    for (const project of projectRows) {
      if (excludedProjectIds.has(project.id)) continue;
      const hasPlannedDates = !!project.planned_start && !!project.planned_end;
      const candidateByStatus = options.statuses.includes(project.status);
      if (!candidateByStatus) continue;
      if (project.status === 'on_hold') continue;
      if (!options.includeAlreadyScheduled && hasPlannedDates) continue;
      candidateIds.add(project.id);
    }

    const reservationReasonByProject = new Map<string, RoadmapReservationReason>();
    for (const project of projectRows) {
      if (excludedProjectIds.has(project.id)) continue;
      const hasPlannedDates = !!project.planned_start && !!project.planned_end;
      if (!hasPlannedDates) continue;
      if (!CAPACITY_CONSUMING_STATUSES.includes(project.status)) continue;
      if (candidateIds.has(project.id)) continue;
      reservationReasonByProject.set(project.id, 'not_recalculated');
    }

    const dependencyRows: DependencyRow[] = candidateIds.size > 0
      ? await mg.query(
        `
        SELECT d.project_id, d.depends_on_project_id
        FROM portfolio_project_dependencies d
        WHERE d.tenant_id = $1
          AND d.project_id = ANY($2)
          AND d.dependency_type = 'blocks'
          AND d.depends_on_project_id IS NOT NULL
        ORDER BY d.project_id ASC, d.depends_on_project_id ASC
      `,
        [tenantId, Array.from(candidateIds)],
      )
      : [];

    const blockersByProject = new Map<string, string[]>();
    for (const dep of dependencyRows) {
      if (!dep.depends_on_project_id) continue;
      const blockers = blockersByProject.get(dep.project_id) ?? [];
      if (!blockers.includes(dep.depends_on_project_id)) {
        blockers.push(dep.depends_on_project_id);
      }
      blockersByProject.set(dep.project_id, blockers);
    }
    for (const [projectId, blockers] of blockersByProject.entries()) {
      blockers.sort((a, b) => a.localeCompare(b));
      blockersByProject.set(projectId, blockers);
    }

    // Ensure external blockers of candidates are treated as capacity reservations.
    for (const dep of dependencyRows) {
      if (!dep.depends_on_project_id) continue;
      const blocker = projectById.get(dep.depends_on_project_id);
      if (!blocker) continue;
      if (excludedProjectIds.has(blocker.id)) continue;
      const hasPlannedDates = !!blocker.planned_start && !!blocker.planned_end;
      if (!hasPlannedDates) continue;
      if (!CAPACITY_CONSUMING_STATUSES.includes(blocker.status)) continue;
      if (candidateIds.has(blocker.id)) continue;
      reservationReasonByProject.set(blocker.id, 'external_blocker');
    }

    const relevantProjectIds = Array.from(new Set([...candidateIds, ...reservationReasonByProject.keys()]))
      .sort((a, b) => a.localeCompare(b));

    const manualAllocationRows: ManualAllocationRow[] = relevantProjectIds.length > 0
      ? await mg.query(
        `
        SELECT project_id, user_id, effort_type, allocation_pct
        FROM portfolio_project_effort_allocations
        WHERE tenant_id = $1
          AND project_id = ANY($2)
      `,
        [tenantId, relevantProjectIds],
      )
      : [];

    const teamAssignmentRows: TeamAssignmentRow[] = relevantProjectIds.length > 0
      ? await mg.query(
        `
        SELECT project_id, user_id, role
        FROM portfolio_project_team
        WHERE tenant_id = $1
          AND project_id = ANY($2)
      `,
        [tenantId, relevantProjectIds],
      )
      : [];

    const userIds = new Set<string>();
    for (const row of manualAllocationRows) userIds.add(row.user_id);
    for (const row of teamAssignmentRows) userIds.add(row.user_id);
    for (const projectId of relevantProjectIds) {
      const row = projectById.get(projectId);
      if (!row) continue;
      if (row.it_lead_id) userIds.add(row.it_lead_id);
      if (row.business_lead_id) userIds.add(row.business_lead_id);
    }

    const users: UserRow[] = userIds.size > 0
      ? await mg.query(
        `SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1)`,
        [Array.from(userIds)],
      )
      : [];
    const userById = new Map<string, Person>();
    for (const user of users) {
      userById.set(user.id, {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      });
    }

    const teamConfigs: TeamMemberConfigRow[] = await mg.query(
      `
      SELECT
        tmc.id AS config_id,
        tmc.user_id,
        tmc.team_id,
        tmc.project_availability,
        TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_display_name,
        u.email AS user_email,
        u.first_name,
        u.last_name,
        pt.name AS team_name
      FROM portfolio_team_member_configs tmc
      LEFT JOIN users u ON u.id = tmc.user_id
      LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id
      WHERE tmc.tenant_id = $1
      ORDER BY tmc.user_id ASC
    `,
      [tenantId],
    );

    const historicalStats = options.capacityMode === 'historical'
      ? (await this.teamMemberConfigService.getAllTimeStats(tenantId, { manager: mg })).stats
      : {};

    const contributors = new Map<string, ContributorInfo>();
    for (const config of teamConfigs) {
      const theoreticalCapacity = Math.max(0, toNumber(config.project_availability));
      const historicalCapacity = Math.max(0, toNumber(historicalStats?.[config.config_id]?.avgProjectDays));
      let monthlyCapacity = 0;
      if (options.capacityMode === 'historical') {
        monthlyCapacity = historicalCapacity > EPSILON
          ? historicalCapacity
          : theoreticalCapacity;
      } else {
        monthlyCapacity = theoreticalCapacity;
      }
      const weeklyCapacity = monthlyCapacity > EPSILON ? (monthlyCapacity * 12) / 52 : 0;

      const fallbackUser = userById.get(config.user_id);
      const displayName = (config.user_display_name || '').trim()
        || [fallbackUser?.first_name, fallbackUser?.last_name].filter(Boolean).join(' ').trim()
        || config.user_email
        || fallbackUser?.email
        || config.user_id;

      contributors.set(config.user_id, {
        id: config.user_id,
        name: displayName,
        teamId: config.team_id ?? null,
        teamName: config.team_name ?? null,
        monthlyCapacity: round2(monthlyCapacity),
        weeklyCapacity,
      });
    }

    const manualByKey = new Map<string, Allocation[]>();
    for (const row of manualAllocationRows) {
      const key = `${row.project_id}:${row.effort_type}`;
      const list = manualByKey.get(key) ?? [];
      list.push({ user_id: row.user_id, allocation_pct: toNumber(row.allocation_pct) });
      manualByKey.set(key, list);
    }
    for (const [key, list] of manualByKey.entries()) {
      list.sort((a, b) => a.user_id.localeCompare(b.user_id));
      manualByKey.set(key, list);
    }

    const teamByProject = new Map<string, { it: Person[]; business: Person[] }>();
    const personFor = (userId: string): Person => (
      userById.get(userId) ?? {
        id: userId,
        first_name: '',
        last_name: '',
        email: null,
      }
    );
    for (const row of teamAssignmentRows) {
      const entry = teamByProject.get(row.project_id) ?? { it: [], business: [] };
      const person = personFor(row.user_id);
      if (row.role === 'it_team') entry.it.push(person);
      if (row.role === 'business_team') entry.business.push(person);
      teamByProject.set(row.project_id, entry);
    }
    for (const entry of teamByProject.values()) {
      entry.it.sort((a, b) => a.id.localeCompare(b.id));
      entry.business.sort((a, b) => a.id.localeCompare(b.id));
    }

    const ensureContributor = (userId: string): void => {
      if (contributors.has(userId)) return;
      const person = personFor(userId);
      const displayName = [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
        || person.email
        || userId;
      contributors.set(userId, {
        id: userId,
        name: displayName,
        teamId: null,
        teamName: null,
        monthlyCapacity: 0,
        weeklyCapacity: 0,
      });
    };

    const candidates = new Map<string, ProjectComputation>();
    const preUnschedulable = new Map<string, UnschedulableProject>();

    const allRelevantProjects = new Map<string, ProjectComputation>();
    for (const projectId of relevantProjectIds) {
      const row = projectById.get(projectId);
      if (!row) continue;

      const progress = Math.max(0, Math.min(100, toNumber(row.execution_progress)));
      const remainingIt = Math.max(0, toNumber(row.estimated_effort_it) * (1 - progress / 100));
      const remainingBusiness = Math.max(0, toNumber(row.estimated_effort_business) * (1 - progress / 100));
      const remainingTotal = remainingIt + remainingBusiness;

      const members = teamByProject.get(projectId) ?? { it: [], business: [] };
      const itLead = row.it_lead_id ? personFor(row.it_lead_id) : null;
      const businessLead = row.business_lead_id ? personFor(row.business_lead_id) : null;

      const itManual = manualByKey.get(`${projectId}:it`) ?? [];
      const businessManual = manualByKey.get(`${projectId}:business`) ?? [];

      const itAllocations = row.it_effort_allocation_mode === 'manual'
        ? itManual
        : (itManual.length > 0 ? itManual : computeAutoAllocations(itLead, members.it));
      const businessAllocations = row.business_effort_allocation_mode === 'manual'
        ? businessManual
        : (businessManual.length > 0 ? businessManual : computeAutoAllocations(businessLead, members.business));

      const contributorDays = new Map<string, number>();
      for (const alloc of itAllocations) {
        if (!alloc.user_id) continue;
        const value = remainingIt * (toNumber(alloc.allocation_pct) / 100);
        contributorDays.set(alloc.user_id, (contributorDays.get(alloc.user_id) ?? 0) + value);
      }
      for (const alloc of businessAllocations) {
        if (!alloc.user_id) continue;
        const value = remainingBusiness * (toNumber(alloc.allocation_pct) / 100);
        contributorDays.set(alloc.user_id, (contributorDays.get(alloc.user_id) ?? 0) + value);
      }
      for (const [userId, days] of Array.from(contributorDays.entries())) {
        if (days <= EPSILON) {
          contributorDays.delete(userId);
          continue;
        }
        ensureContributor(userId);
      }

      const blockers = (blockersByProject.get(projectId) ?? []).slice().sort((a, b) => a.localeCompare(b));
      const computation: ProjectComputation = {
        id: row.id,
        name: row.name,
        status: row.status,
        categoryId: row.category_id ?? null,
        sourceId: row.source_id ?? null,
        streamId: row.stream_id ?? null,
        priorityScore: row.priority_score != null ? toNumber(row.priority_score) : null,
        executionProgress: progress,
        remainingIt,
        remainingBusiness,
        remainingTotal,
        contributorDays,
        blockers,
        plannedStart: row.planned_start,
        plannedEnd: row.planned_end,
        actualStart: row.actual_start,
        actualEnd: row.actual_end,
      };
      allRelevantProjects.set(projectId, computation);

      if (candidateIds.has(projectId)) {
        candidates.set(projectId, computation);
      }
    }

    for (const projectId of Array.from(candidates.keys()).sort((a, b) => a.localeCompare(b))) {
      const project = candidates.get(projectId)!;
      if (project.remainingTotal <= EPSILON) {
        preUnschedulable.set(projectId, {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          reason: 'zero_remaining_effort',
        });
        continue;
      }
      if (project.contributorDays.size === 0) {
        preUnschedulable.set(projectId, {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          reason: 'no_assigned_contributors',
        });
        continue;
      }
      const missingCapacityUsers = Array.from(project.contributorDays.keys())
        .filter((userId) => (contributors.get(userId)?.weeklyCapacity ?? 0) <= EPSILON);
      if (missingCapacityUsers.length > 0) {
        for (const userId of missingCapacityUsers) {
          project.contributorDays.delete(userId);
        }

        const names = missingCapacityUsers
          .map((userId) => contributors.get(userId)?.name ?? userId)
          .sort((a, b) => a.localeCompare(b))
          .join(', ');

        // Best effort scheduling: continue with contributors that have capacity.
        // If none remain, keep the project unschedulable.
        if (project.contributorDays.size === 0) {
          preUnschedulable.set(projectId, {
            projectId: project.id,
            projectName: project.name,
            status: project.status,
            reason: 'missing_contributor_capacity',
            details: `No contributor capacity configured for: ${names}`,
          });
          continue;
        }
      }
    }

    const existingEndByProject = new Map<string, Date>();
    for (const project of projectRows) {
      const preferredEnd = project.status === 'done'
        ? (project.actual_end || project.planned_end)
        : (project.planned_end || project.actual_end);
      const parsed = toUtcDate(preferredEnd);
      if (parsed) {
        existingEndByProject.set(project.id, parsed);
      }
    }

    const reservations: CapacityReservation[] = [];
    for (const projectId of Array.from(reservationReasonByProject.keys()).sort((a, b) => a.localeCompare(b))) {
      const row = projectById.get(projectId);
      if (!row || !row.planned_start || !row.planned_end) continue;
      const startDate = toUtcDate(row.planned_start);
      const endDate = toUtcDate(row.planned_end);
      if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) continue;
      const reason = reservationReasonByProject.get(projectId);
      if (!reason) continue;

      const project = allRelevantProjects.get(projectId);
      const startWeek = getWeekStartMondayUtc(startDate);
      const endWeek = getWeekStartMondayUtc(endDate);
      const weekKeys: string[] = [];
      for (
        let cursor = startWeek;
        cursor.getTime() <= endWeek.getTime();
        cursor = addDaysUtc(cursor, 7)
      ) {
        weekKeys.push(toYmdUtc(cursor));
      }

      const weeklyLoads = new Map<string, Map<string, number>>();
      if (project && project.contributorDays.size > 0 && weekKeys.length > 0) {
        for (const [userId, totalDays] of Array.from(project.contributorDays.entries())) {
          if (totalDays <= EPSILON) continue;
          const perWeekDays = totalDays / weekKeys.length;
          if (perWeekDays <= EPSILON) continue;
          for (const weekKey of weekKeys) {
            const byUser = weeklyLoads.get(weekKey) ?? new Map<string, number>();
            byUser.set(userId, (byUser.get(userId) ?? 0) + perWeekDays);
            weeklyLoads.set(weekKey, byUser);
          }
        }
      }

      reservations.push({
        projectId,
        projectName: row.name,
        status: row.status,
        categoryId: row.category_id ?? null,
        sourceId: row.source_id ?? null,
        streamId: row.stream_id ?? null,
        executionProgress: round2(project?.executionProgress ?? toNumber(row.execution_progress ?? 0)),
        reason,
        startDate,
        endDate,
        startWeek,
        endWeek,
        weeklyLoads,
      });
    }

    return {
      options,
      contributors,
      candidates,
      blockersByProject,
      existingEndByProject,
      preUnschedulable,
      reservations,
      projectNameById,
    };
  }

  private runScheduler(
    prepared: PreparedData,
    monthlyCapacityOverride: Map<string, number> | null,
    collectOccupation: boolean,
    asOfDate: Date,
  ): SchedulerResult {
    const options = prepared.options;
    const startDate = parseYmdUtc(options.startDate);
    const firstWeekToPlan = ceilToMondayUtc(startDate);

    const weeklyCapacityByUser = new Map<string, number>();
    for (const contributor of prepared.contributors.values()) {
      const monthlyCapacity = monthlyCapacityOverride?.has(contributor.id)
        ? Math.max(0, toNumber(monthlyCapacityOverride.get(contributor.id)))
        : contributor.monthlyCapacity;
      const weeklyCapacity = monthlyCapacity > EPSILON ? (monthlyCapacity * 12) / 52 : 0;
      weeklyCapacityByUser.set(contributor.id, weeklyCapacity);
    }

    const committedLoad: CommittedLoadLedger = new Map();
    const activeProjects: ActiveProjectsLedger = new Map();
    const weeklyProjectLoad: WeeklyProjectLoadLedger | null = collectOccupation ? new Map() : null;

    // Reservations consume capacity before candidate scheduling.
    for (const reservation of prepared.reservations) {
      const weeks = Array.from(reservation.weeklyLoads.keys()).sort((a, b) => a.localeCompare(b));
      for (const weekKey of weeks) {
        const loadsByUser = reservation.weeklyLoads.get(weekKey);
        if (!loadsByUser) continue;
        const users = Array.from(loadsByUser.keys()).sort((a, b) => a.localeCompare(b));
        for (const userId of users) {
          const days = loadsByUser.get(userId) ?? 0;
          if (days <= EPSILON) continue;
          this.addCommittedLoad(committedLoad, userId, weekKey, days);
          if (days >= SLOT_OCCUPANCY_THRESHOLD_DAYS) {
            this.addActiveProject(activeProjects, userId, weekKey, reservation.projectId);
          }
          if (weeklyProjectLoad) {
            this.addWeeklyProjectLoad(weeklyProjectLoad, userId, weekKey, reservation.projectId, days);
          }
        }
      }
    }

    const unschedulableMap = new Map<string, UnschedulableProject>();
    for (const [projectId, unsched] of prepared.preUnschedulable.entries()) {
      unschedulableMap.set(projectId, { ...unsched });
    }

    const knownEndByProject = new Map<string, Date>(prepared.existingEndByProject);
    for (const reservation of prepared.reservations) {
      knownEndByProject.set(reservation.projectId, reservation.endDate);
    }

    const candidateIds = new Set<string>(
      Array.from(prepared.candidates.keys())
        .filter((id) => !unschedulableMap.has(id)),
    );

    // Drop candidates that depend on blockers outside the schedulable set without a known end date.
    const pruneMissingBlockers = (): void => {
      let changed = true;
      while (changed) {
        changed = false;
        for (const projectId of Array.from(candidateIds).sort((a, b) => a.localeCompare(b))) {
          const project = prepared.candidates.get(projectId);
          if (!project) continue;
          const blockers = prepared.blockersByProject.get(projectId) ?? [];
          const missingBlocker = blockers.find((blockerId) => {
            if (candidateIds.has(blockerId)) return false;
            return !knownEndByProject.has(blockerId);
          });
          if (!missingBlocker) continue;
          candidateIds.delete(projectId);
          unschedulableMap.set(projectId, {
            projectId: project.id,
            projectName: project.name,
            status: project.status,
            reason: 'missing_blocker_date',
            details: `Missing blocker date for ${prepared.projectNameById.get(missingBlocker) || missingBlocker}`,
          });
          changed = true;
        }
      }
    };
    pruneMissingBlockers();

    const buildDependencyGraph = (ids: Set<string>): {
      indegree: Map<string, number>;
      dependents: Map<string, string[]>;
      internalBlockersByProject: Map<string, string[]>;
    } => {
      const indegree = new Map<string, number>();
      const dependents = new Map<string, string[]>();
      const internalBlockersByProject = new Map<string, string[]>();
      for (const projectId of Array.from(ids).sort((a, b) => a.localeCompare(b))) {
        const blockers = (prepared.blockersByProject.get(projectId) ?? [])
          .filter((blockerId) => ids.has(blockerId))
          .sort((a, b) => a.localeCompare(b));
        internalBlockersByProject.set(projectId, blockers);
        indegree.set(projectId, blockers.length);
        for (const blockerId of blockers) {
          const list = dependents.get(blockerId) ?? [];
          list.push(projectId);
          dependents.set(blockerId, list);
        }
      }
      for (const [projectId, list] of dependents.entries()) {
        list.sort((a, b) => a.localeCompare(b));
        dependents.set(projectId, list);
      }
      return { indegree, dependents, internalBlockersByProject };
    };

    let {
      dependents,
      internalBlockersByProject,
    } = buildDependencyGraph(candidateIds);

    // Mark cyclic projects unschedulable before simulation.
    const cycleProbe = buildDependencyGraph(candidateIds);
    const cycleQueue = Array.from(candidateIds)
      .filter((projectId) => (cycleProbe.indegree.get(projectId) ?? 0) === 0)
      .sort((a, b) => a.localeCompare(b));
    const cycleVisited = new Set<string>();
    while (cycleQueue.length > 0) {
      const projectId = cycleQueue.shift()!;
      if (cycleVisited.has(projectId)) continue;
      cycleVisited.add(projectId);
      const outgoing = cycleProbe.dependents.get(projectId) ?? [];
      for (const dependentId of outgoing) {
        if (!cycleProbe.indegree.has(dependentId)) continue;
        cycleProbe.indegree.set(dependentId, (cycleProbe.indegree.get(dependentId) ?? 0) - 1);
        if ((cycleProbe.indegree.get(dependentId) ?? 0) === 0) {
          cycleQueue.push(dependentId);
        }
      }
      cycleQueue.sort((a, b) => a.localeCompare(b));
    }

    for (const projectId of Array.from(candidateIds).sort((a, b) => a.localeCompare(b))) {
      if (cycleVisited.has(projectId)) continue;
      const project = prepared.candidates.get(projectId);
      if (!project) continue;
      candidateIds.delete(projectId);
      unschedulableMap.set(projectId, {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        reason: 'cyclic_dependency',
      });
    }

    // Re-check blockers after cycle pruning: cycle removals may expose external blockers
    // without known end dates.
    pruneMissingBlockers();

    ({
      dependents,
      internalBlockersByProject,
    } = buildDependencyGraph(candidateIds));

    const dependencyDepth = new Map<string, number>();
    const depthDfs = (projectId: string, visiting: Set<string>): number => {
      if (dependencyDepth.has(projectId)) return dependencyDepth.get(projectId)!;
      if (visiting.has(projectId)) return 0;
      visiting.add(projectId);
      const children = dependents.get(projectId) ?? [];
      let maxDepth = 0;
      for (const childId of children) {
        const depth = 1 + depthDfs(childId, visiting);
        if (depth > maxDepth) maxDepth = depth;
      }
      visiting.delete(projectId);
      dependencyDepth.set(projectId, maxDepth);
      return maxDepth;
    };
    for (const projectId of candidateIds) {
      depthDfs(projectId, new Set<string>());
    }

    type CandidateRuntimeState = {
      project: ProjectComputation;
      remainingTotal: number;
      remainingByContributor: Map<string, number>;
      contributorTotals: Map<string, number>;
      firstWeek: Date | null;
      lastWeek: Date | null;
      done: boolean;
      activeWeekKeys: Set<string>;
    };

    const runtimeByProject = new Map<string, CandidateRuntimeState>();
    const externalEarliestWeekByProject = new Map<string, Date>();
    for (const projectId of Array.from(candidateIds).sort((a, b) => a.localeCompare(b))) {
      const project = prepared.candidates.get(projectId);
      if (!project) continue;
      const remainingByContributor = new Map(project.contributorDays);
      let schedulableRemaining = 0;
      for (const days of remainingByContributor.values()) {
        if (days > EPSILON) schedulableRemaining += days;
      }
      runtimeByProject.set(projectId, {
        project,
        // Track only effort that is actually allocable to contributors with capacity.
        remainingTotal: schedulableRemaining,
        remainingByContributor,
        contributorTotals: new Map<string, number>(),
        firstWeek: null,
        lastWeek: null,
        done: false,
        activeWeekKeys: new Set<string>(),
      });

      let earliestDate = startDate;
      const blockers = prepared.blockersByProject.get(projectId) ?? [];
      for (const blockerId of blockers) {
        if (candidateIds.has(blockerId)) continue;
        const blockerEnd = knownEndByProject.get(blockerId);
        if (!blockerEnd) continue;
        const nextDay = addDaysUtc(blockerEnd, 1);
        if (nextDay.getTime() > earliestDate.getTime()) {
          earliestDate = nextDay;
        }
      }
      externalEarliestWeekByProject.set(projectId, ceilToMondayUtc(earliestDate));
    }

    const bottleneckWeeksByProject = new Map<string, number>();
    if (options.optimizationMode === 'completion_focused') {
      for (const projectId of candidateIds) {
        const project = prepared.candidates.get(projectId);
        if (!project) continue;
        bottleneckWeeksByProject.set(
          projectId,
          this.estimateBottleneckWeeks(project, weeklyCapacityByUser, options),
        );
      }
    }

    const waitWeeksByProject = new Map<string, number>();

    const computeEffectivePriority = (projectId: string): number => {
      const state = runtimeByProject.get(projectId);
      const project = prepared.candidates.get(projectId);
      const raw = project?.priorityScore ?? 0;
      if (!state) return raw;
      if (state.firstWeek) {
        // Started project: boost by 5 points per week since start, capped at 100
        const weeksSinceStart = Math.max(0, Math.floor(
          (cursor.getTime() - state.firstWeek.getTime()) / (7 * MS_PER_DAY),
        ));
        return Math.min(100, raw + 5 * weeksSinceStart);
      }
      // Ready but not started: boost by weeks waiting, capped at 90
      const weeksWaiting = waitWeeksByProject.get(projectId) ?? 0;
      if (weeksWaiting > 0) {
        return Math.min(90, raw + weeksWaiting);
      }
      return raw;
    };

    const rankProjects = (leftId: string, rightId: string): number => {
      if (options.optimizationMode === 'priority_focused') {
        const leftEP = computeEffectivePriority(leftId);
        const rightEP = computeEffectivePriority(rightId);
        if (leftEP !== rightEP) return rightEP - leftEP;
      } else {
        // completion_focused: bottleneckWeeks ASC, then raw priorityScore DESC
        const leftBottleneck = bottleneckWeeksByProject.get(leftId) ?? Number.POSITIVE_INFINITY;
        const rightBottleneck = bottleneckWeeksByProject.get(rightId) ?? Number.POSITIVE_INFINITY;
        if (leftBottleneck !== rightBottleneck) return leftBottleneck - rightBottleneck;
        const leftProject = prepared.candidates.get(leftId)!;
        const rightProject = prepared.candidates.get(rightId)!;
        const byPriority = compareNullableNumberDesc(leftProject.priorityScore, rightProject.priorityScore);
        if (byPriority !== 0) return byPriority;
      }
      // Shared tiebreakers
      const leftDepth = dependencyDepth.get(leftId) ?? 0;
      const rightDepth = dependencyDepth.get(rightId) ?? 0;
      if (leftDepth !== rightDepth) return rightDepth - leftDepth;
      return leftId.localeCompare(rightId);
    };

    const scheduledEndByProject = new Map<string, Date>();
    let cursor = firstWeekToPlan;
    const contributorIds = Array.from(weeklyCapacityByUser.keys()).sort((a, b) => a.localeCompare(b));

    const contributorDemand = new Map<string, number>();
    for (const state of runtimeByProject.values()) {
      for (const [contributorId, days] of state.remainingByContributor.entries()) {
        contributorDemand.set(contributorId, (contributorDemand.get(contributorId) ?? 0) + days);
      }
    }
    const frozenCommittedDays = new Map<string, number>();
    for (const [contributorId, byWeek] of committedLoad.entries()) {
      let total = 0;
      for (const days of byWeek.values()) total += days;
      if (total > EPSILON) {
        frozenCommittedDays.set(contributorId, total);
      }
    }
    let horizonWeeks = MAX_WEEKS_TO_SCAN;
    let estimatedContributorWeeks = 0;
    for (const [contributorId, demandDays] of contributorDemand.entries()) {
      const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
      if (weeklyBaseCapacity <= EPSILON) continue;
      const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
        weeklyBaseCapacity,
        1,
        options,
      );
      if (effectiveCapacity <= EPSILON) continue;
      const frozenDays = frozenCommittedDays.get(contributorId) ?? 0;
      const contributorWeeks = (demandDays + frozenDays) / effectiveCapacity;
      if (contributorWeeks > estimatedContributorWeeks) {
        estimatedContributorWeeks = contributorWeeks;
      }
    }
    if (estimatedContributorWeeks > 0) {
      const bufferedEstimate = Math.ceil(estimatedContributorWeeks * 1.5) + 52;
      horizonWeeks = Math.max(horizonWeeks, bufferedEstimate);
    }
    horizonWeeks = Math.min(MAX_WEEKS_TO_SCAN_HARD_CAP, horizonWeeks);

    for (let weekIndex = 0; weekIndex < horizonWeeks; weekIndex += 1) {
      const weekKey = toYmdUtc(cursor);
      const remainingProjects = Array.from(runtimeByProject.entries())
        .filter(([, state]) => state.remainingTotal > EPSILON)
        .map(([projectId]) => projectId);
      if (remainingProjects.length === 0) {
        break;
      }

      const readyProjects = remainingProjects.filter((projectId) => {
        const state = runtimeByProject.get(projectId);
        if (!state || state.done) return false;
        const earliestWeek = externalEarliestWeekByProject.get(projectId) ?? firstWeekToPlan;
        if (cursor.getTime() < earliestWeek.getTime()) return false;

        const blockers = internalBlockersByProject.get(projectId) ?? [];
        for (const blockerId of blockers) {
          const blockerEnd = scheduledEndByProject.get(blockerId);
          if (!blockerEnd) return false;
          const nextWeek = ceilToMondayUtc(addDaysUtc(blockerEnd, 1));
          if (cursor.getTime() < nextWeek.getTime()) return false;
        }
        return true;
      }).sort(rankProjects);

      const allocatedProjectsThisWeek = new Set<string>();
      if (readyProjects.length > 0) {
        const frozenActiveByContributor = new Map<string, number>();
        const frozenCommittedByContributor = new Map<string, number>();
        const selectedCountByContributor = new Map<string, number>();
        for (const contributorId of contributorIds) {
          const frozenActive = this.getActiveCount(activeProjects, contributorId, weekKey);
          frozenActiveByContributor.set(contributorId, frozenActive);
          frozenCommittedByContributor.set(
            contributorId,
            this.getCommittedLoad(committedLoad, contributorId, weekKey),
          );
          selectedCountByContributor.set(contributorId, 0);
        }

        // --- Continuity pre-selection (both modes) ---
        // Pre-assign contributors to their ongoing projects before ranked selection.
        const preSelectedProjects = new Set<string>();
        const preSelectedContributorProject = new Set<string>(); // "contributorId:projectId"
        const startedReadyProjects = readyProjects.filter((projectId) => {
          const state = runtimeByProject.get(projectId);
          return state && state.firstWeek !== null && state.remainingTotal > EPSILON;
        });
        // Already sorted by rankProjects via readyProjects sort

        for (const projectId of startedReadyProjects) {
          const state = runtimeByProject.get(projectId)!;
          // Find continuing contributors: have remaining effort AND have previously worked on it
          const continuingContributors = Array.from(state.remainingByContributor.entries())
            .filter(([contributorId, remaining]) =>
              remaining > EPSILON
              && (state.contributorTotals.get(contributorId) ?? 0) > EPSILON
              && (weeklyCapacityByUser.get(contributorId) ?? 0) > EPSILON)
            .map(([contributorId]) => contributorId);
          if (continuingContributors.length === 0) continue;

          if (options.collaborativeScheduling) {
            // Collaborative: ALL continuing contributors must have free slots
            let allFeasible = true;
            for (const contributorId of continuingContributors) {
              const frozenActive = frozenActiveByContributor.get(contributorId) ?? 0;
              const selectedSoFar = selectedCountByContributor.get(contributorId) ?? 0;
              const availableSlots = Math.max(0, options.parallelizationLimit - frozenActive);
              if (selectedSoFar >= availableSlots) {
                allFeasible = false;
                break;
              }
            }
            if (!allFeasible) continue;
            preSelectedProjects.add(projectId);
            for (const contributorId of continuingContributors) {
              preSelectedContributorProject.add(`${contributorId}:${projectId}`);
              selectedCountByContributor.set(
                contributorId,
                (selectedCountByContributor.get(contributorId) ?? 0) + 1,
              );
            }
          } else {
            // Non-collaborative: each continuing contributor with a free slot is individually pre-selected
            for (const contributorId of continuingContributors) {
              const frozenActive = frozenActiveByContributor.get(contributorId) ?? 0;
              const selectedSoFar = selectedCountByContributor.get(contributorId) ?? 0;
              const availableSlots = Math.max(0, options.parallelizationLimit - frozenActive);
              if (selectedSoFar >= availableSlots) continue;
              preSelectedContributorProject.add(`${contributorId}:${projectId}`);
              selectedCountByContributor.set(
                contributorId,
                (selectedCountByContributor.get(contributorId) ?? 0) + 1,
              );
            }
          }
        }

        if (options.collaborativeScheduling) {
          // --- Collaborative scheduling (original all-or-nothing + proportional burn) ---
          const selectedProjects: string[] = [...preSelectedProjects];
          for (const projectId of readyProjects) {
            if (preSelectedProjects.has(projectId)) continue;
            const state = runtimeByProject.get(projectId);
            if (!state || state.done || state.remainingTotal <= EPSILON) continue;

            const neededContributors = Array.from(state.remainingByContributor.entries())
              .filter(([contributorId, demand]) =>
                demand > EPSILON && (weeklyCapacityByUser.get(contributorId) ?? 0) > EPSILON)
              .map(([contributorId]) => contributorId)
              .sort((a, b) => a.localeCompare(b));
            if (neededContributors.length === 0) continue;

            let feasibleForAll = true;
            for (const contributorId of neededContributors) {
              const frozenActive = frozenActiveByContributor.get(contributorId) ?? 0;
              const selectedSoFar = selectedCountByContributor.get(contributorId) ?? 0;
              const availableSlots = Math.max(0, options.parallelizationLimit - frozenActive);
              if (selectedSoFar >= availableSlots) {
                feasibleForAll = false;
                break;
              }

              const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
              if (weeklyBaseCapacity <= EPSILON) {
                feasibleForAll = false;
                break;
              }
              const projectedK = selectedSoFar + 1;
              const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
                weeklyBaseCapacity,
                projectedK,
                options,
              );
              const frozenCommitted = frozenCommittedByContributor.get(contributorId) ?? 0;
              const allocableDays = Math.max(0, effectiveCapacity - frozenCommitted);
              if (allocableDays <= EPSILON) {
                feasibleForAll = false;
                break;
              }
            }
            if (!feasibleForAll) continue;

            selectedProjects.push(projectId);
            for (const contributorId of neededContributors) {
              selectedCountByContributor.set(
                contributorId,
                (selectedCountByContributor.get(contributorId) ?? 0) + 1,
              );
            }
          }

          const availabilityByContributor = new Map<string, number>();
          for (const contributorId of contributorIds) {
            const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
            if (weeklyBaseCapacity <= EPSILON) {
              availabilityByContributor.set(contributorId, 0);
              continue;
            }
            const candidateConcurrency = selectedCountByContributor.get(contributorId) ?? 0;
            if (candidateConcurrency <= 0) {
              availabilityByContributor.set(contributorId, 0);
              continue;
            }
            const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
              weeklyBaseCapacity,
              candidateConcurrency,
              options,
            );
            const frozenCommitted = frozenCommittedByContributor.get(contributorId) ?? 0;
            availabilityByContributor.set(
              contributorId,
              Math.max(0, effectiveCapacity - frozenCommitted),
            );
          }

          for (const projectId of selectedProjects) {
            const state = runtimeByProject.get(projectId);
            if (!state || state.done || state.remainingTotal <= EPSILON) continue;

            const contributorsForProject = Array.from(state.remainingByContributor.entries())
              .filter(([contributorId, demand]) =>
                demand > EPSILON && (weeklyCapacityByUser.get(contributorId) ?? 0) > EPSILON)
              .map(([contributorId]) => contributorId)
              .sort((a, b) => a.localeCompare(b));
            if (contributorsForProject.length === 0) continue;

            const totalBefore = state.remainingTotal;
            if (totalBefore <= EPSILON) continue;

            let projectBurnCap = Number.POSITIVE_INFINITY;
            for (const contributorId of contributorsForProject) {
              const contributorDemand = state.remainingByContributor.get(contributorId) ?? 0;
              if (contributorDemand <= EPSILON) {
                projectBurnCap = 0;
                break;
              }
              const share = contributorDemand / totalBefore;
              if (share <= EPSILON) {
                projectBurnCap = 0;
                break;
              }
              const available = Math.max(0, availabilityByContributor.get(contributorId) ?? 0);
              const contributorBurnCap = available / share;
              if (contributorBurnCap < projectBurnCap) {
                projectBurnCap = contributorBurnCap;
              }
            }

            const burn = Math.min(totalBefore, projectBurnCap);
            if (!Number.isFinite(burn) || burn <= EPSILON) continue;

            let anyConsumed = false;
            for (const contributorId of contributorsForProject) {
              const demandBefore = state.remainingByContributor.get(contributorId) ?? 0;
              if (demandBefore <= EPSILON) continue;
              const share = demandBefore / totalBefore;
              const consumed = Math.min(demandBefore, burn * share);
              if (consumed <= EPSILON) continue;

              const nextDemand = Math.max(0, demandBefore - consumed);
              state.remainingByContributor.set(contributorId, nextDemand);
              state.contributorTotals.set(
                contributorId,
                (state.contributorTotals.get(contributorId) ?? 0) + consumed,
              );
              availabilityByContributor.set(
                contributorId,
                Math.max(0, (availabilityByContributor.get(contributorId) ?? 0) - consumed),
              );
              anyConsumed = true;

              if (weeklyProjectLoad) {
                this.addWeeklyProjectLoad(weeklyProjectLoad, contributorId, weekKey, projectId, consumed);
              }
            }

            if (!anyConsumed) continue;
            state.remainingTotal = Math.max(0, state.remainingTotal - burn);
            if (!state.firstWeek) state.firstWeek = cursor;
            state.lastWeek = cursor;
            state.activeWeekKeys.add(weekKey);
            allocatedProjectsThisWeek.add(projectId);
          }
        } else {
          // --- Non-collaborative scheduling (independent contributor burns) ---
          // Selection: project selected if ANY contributor has a free slot + available capacity.
          // Track which contributors are feasible per project.
          const selectedProjectFeasibleContributors = new Map<string, string[]>();

          // Include pre-selected contributor-project pairs
          for (const projectId of startedReadyProjects) {
            const feasible: string[] = [];
            for (const contributorId of contributorIds) {
              if (preSelectedContributorProject.has(`${contributorId}:${projectId}`)) {
                feasible.push(contributorId);
              }
            }
            if (feasible.length > 0) {
              selectedProjectFeasibleContributors.set(projectId, feasible);
            }
          }

          for (const projectId of readyProjects) {
            if (selectedProjectFeasibleContributors.has(projectId)) continue;
            const state = runtimeByProject.get(projectId);
            if (!state || state.done || state.remainingTotal <= EPSILON) continue;

            const neededContributors = Array.from(state.remainingByContributor.entries())
              .filter(([contributorId, demand]) =>
                demand > EPSILON && (weeklyCapacityByUser.get(contributorId) ?? 0) > EPSILON)
              .map(([contributorId]) => contributorId)
              .sort((a, b) => a.localeCompare(b));
            if (neededContributors.length === 0) continue;

            const feasibleContributors: string[] = [];
            for (const contributorId of neededContributors) {
              if (preSelectedContributorProject.has(`${contributorId}:${projectId}`)) {
                feasibleContributors.push(contributorId);
                continue;
              }
              const frozenActive = frozenActiveByContributor.get(contributorId) ?? 0;
              const selectedSoFar = selectedCountByContributor.get(contributorId) ?? 0;
              const availableSlots = Math.max(0, options.parallelizationLimit - frozenActive);
              if (selectedSoFar >= availableSlots) continue;

              const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
              if (weeklyBaseCapacity <= EPSILON) continue;
              const projectedK = selectedSoFar + 1;
              const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
                weeklyBaseCapacity,
                projectedK,
                options,
              );
              const frozenCommitted = frozenCommittedByContributor.get(contributorId) ?? 0;
              const allocableDays = Math.max(0, effectiveCapacity - frozenCommitted);
              if (allocableDays <= EPSILON) continue;
              feasibleContributors.push(contributorId);
            }
            if (feasibleContributors.length === 0) continue;

            // Minimum-start guard: new starts only (firstWeek is null)
            // Only start a project if expected total burn >= SLOT_OCCUPANCY_THRESHOLD_DAYS
            if (!state.firstWeek) {
              let expectedBurn = 0;
              for (const contributorId of feasibleContributors) {
                const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
                const selectedSoFar = selectedCountByContributor.get(contributorId) ?? 0;
                const projectedK = selectedSoFar + 1;
                const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
                  weeklyBaseCapacity,
                  projectedK,
                  options,
                );
                const frozenCommitted = frozenCommittedByContributor.get(contributorId) ?? 0;
                const available = Math.max(0, effectiveCapacity - frozenCommitted);
                const contributorRemaining = state.remainingByContributor.get(contributorId) ?? 0;
                expectedBurn += Math.min(contributorRemaining, available);
              }
              if (expectedBurn < SLOT_OCCUPANCY_THRESHOLD_DAYS) continue;
            }

            selectedProjectFeasibleContributors.set(projectId, feasibleContributors);
            for (const contributorId of feasibleContributors) {
              if (!preSelectedContributorProject.has(`${contributorId}:${projectId}`)) {
                selectedCountByContributor.set(
                  contributorId,
                  (selectedCountByContributor.get(contributorId) ?? 0) + 1,
                );
              }
            }
          }

          // Compute availability per contributor based on total concurrency
          const availabilityByContributor = new Map<string, number>();
          for (const contributorId of contributorIds) {
            const weeklyBaseCapacity = weeklyCapacityByUser.get(contributorId) ?? 0;
            if (weeklyBaseCapacity <= EPSILON) {
              availabilityByContributor.set(contributorId, 0);
              continue;
            }
            const candidateConcurrency = selectedCountByContributor.get(contributorId) ?? 0;
            if (candidateConcurrency <= 0) {
              availabilityByContributor.set(contributorId, 0);
              continue;
            }
            const effectiveCapacity = this.computeEffectiveWeeklyCapacity(
              weeklyBaseCapacity,
              candidateConcurrency,
              options,
            );
            const frozenCommitted = frozenCommittedByContributor.get(contributorId) ?? 0;
            availabilityByContributor.set(
              contributorId,
              Math.max(0, effectiveCapacity - frozenCommitted),
            );
          }

          // Burn: each feasible contributor burns independently (no proportional throttling)
          for (const [projectId, feasibleContributors] of selectedProjectFeasibleContributors) {
            const state = runtimeByProject.get(projectId);
            if (!state || state.done || state.remainingTotal <= EPSILON) continue;

            let totalBurned = 0;
            let anyConsumed = false;
            for (const contributorId of feasibleContributors) {
              const contributorRemaining = state.remainingByContributor.get(contributorId) ?? 0;
              if (contributorRemaining <= EPSILON) continue;
              const available = Math.max(0, availabilityByContributor.get(contributorId) ?? 0);
              if (available <= EPSILON) continue;

              const consumed = Math.min(contributorRemaining, available);
              if (consumed <= EPSILON) continue;

              const nextDemand = Math.max(0, contributorRemaining - consumed);
              state.remainingByContributor.set(contributorId, nextDemand);
              state.contributorTotals.set(
                contributorId,
                (state.contributorTotals.get(contributorId) ?? 0) + consumed,
              );
              availabilityByContributor.set(
                contributorId,
                Math.max(0, available - consumed),
              );
              totalBurned += consumed;
              anyConsumed = true;

              if (weeklyProjectLoad) {
                this.addWeeklyProjectLoad(weeklyProjectLoad, contributorId, weekKey, projectId, consumed);
              }
            }

            if (!anyConsumed) continue;
            state.remainingTotal = Math.max(0, state.remainingTotal - totalBurned);
            if (!state.firstWeek) state.firstWeek = cursor;
            state.lastWeek = cursor;
            state.activeWeekKeys.add(weekKey);
            allocatedProjectsThisWeek.add(projectId);
          }
        }
      }

      for (const projectId of readyProjects) {
        const state = runtimeByProject.get(projectId);
        if (!state || state.done || state.remainingTotal <= EPSILON) continue;
        if (allocatedProjectsThisWeek.has(projectId)) {
          waitWeeksByProject.set(projectId, 0);
        } else {
          waitWeeksByProject.set(projectId, (waitWeeksByProject.get(projectId) ?? 0) + 1);
        }
      }

      for (const [projectId, state] of runtimeByProject.entries()) {
        if (state.done || state.remainingTotal > EPSILON) continue;
        state.done = true;
        if (!state.lastWeek) continue;
        const computedEnd = addDaysUtc(state.lastWeek, 4);
        scheduledEndByProject.set(projectId, computedEnd);
        knownEndByProject.set(projectId, computedEnd);
      }

      cursor = addDaysUtc(cursor, 7);
    }

    const schedule: ScheduledProject[] = [];
    for (const projectId of Array.from(candidateIds).sort((a, b) => a.localeCompare(b))) {
      const state = runtimeByProject.get(projectId);
      if (!state) continue;
      const project = state.project;

      if (state.remainingTotal > EPSILON || !state.firstWeek || !state.lastWeek) {
        unschedulableMap.set(projectId, {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          reason: 'insufficient_capacity',
          details: state.firstWeek
            ? `Unable to consume remaining effort within scheduling horizon (${horizonWeeks} weeks)`
            : 'No allocable week found under current capacity constraints',
        });
        continue;
      }

      const computedStart = state.firstWeek;
      const computedEnd = addDaysUtc(state.lastWeek, 4);
      const historicalStart = this.resolveHistoricalStart(project, asOfDate);
      const historicalLeadStart = historicalStart
        && historicalStart.getTime() < computedStart.getTime()
        ? historicalStart
        : null;

      const contributorLoads = Array.from(state.contributorTotals.entries())
        .map(([contributorId, days]) => ({
          contributorId,
          contributorName: prepared.contributors.get(contributorId)?.name ?? contributorId,
          days: round2(days),
        }))
        .sort((a, b) =>
          b.days - a.days
          || a.contributorName.localeCompare(b.contributorName)
          || a.contributorId.localeCompare(b.contributorId));

      const durationWeeks = Math.max(
        1,
        Math.round(
          (getWeekStartMondayUtc(computedEnd).getTime() - getWeekStartMondayUtc(computedStart).getTime())
          / (7 * MS_PER_DAY),
        ) + 1,
      );
      const activeWeekStarts = Array.from(state.activeWeekKeys).sort((a, b) => a.localeCompare(b));

      schedule.push({
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        categoryId: project.categoryId,
        sourceId: project.sourceId,
        streamId: project.streamId,
        executionProgress: round2(project.executionProgress),
        priorityScore: project.priorityScore,
        plannedStart: toYmdUtc(computedStart),
        historicalStart: historicalLeadStart ? toYmdUtc(historicalLeadStart) : null,
        plannedEnd: toYmdUtc(computedEnd),
        durationWeeks,
        remainingEffortDays: round2(project.remainingTotal),
        blockerProjectIds: (prepared.blockersByProject.get(project.id) ?? []).slice(),
        contributorLoads,
        activeWeekStarts,
      });
    }

    const reservations: RoadmapReservation[] = prepared.reservations.map((reservation) => {
      const contributorTotals = new Map<string, number>();
      for (const byUser of reservation.weeklyLoads.values()) {
        for (const [contributorId, days] of byUser.entries()) {
          contributorTotals.set(contributorId, (contributorTotals.get(contributorId) ?? 0) + days);
        }
      }
      const contributorLoads = Array.from(contributorTotals.entries())
        .map(([contributorId, days]) => ({
          contributorId,
          contributorName: prepared.contributors.get(contributorId)?.name ?? contributorId,
          days: round2(days),
        }))
        .sort((a, b) =>
          b.days - a.days
          || a.contributorName.localeCompare(b.contributorName)
          || a.contributorId.localeCompare(b.contributorId));

      return {
        projectId: reservation.projectId,
        projectName: reservation.projectName,
        status: reservation.status,
        categoryId: reservation.categoryId,
        sourceId: reservation.sourceId,
        streamId: reservation.streamId,
        executionProgress: reservation.executionProgress,
        plannedStart: toYmdUtc(reservation.startDate),
        plannedEnd: toYmdUtc(reservation.endDate),
        reason: reservation.reason,
        contributorLoads,
      };
    });

    let maxRoadmapEnd: Date | null = null;
    for (const reservation of prepared.reservations) {
      if (!maxRoadmapEnd || reservation.endDate.getTime() > maxRoadmapEnd.getTime()) {
        maxRoadmapEnd = reservation.endDate;
      }
    }
    for (const item of schedule) {
      const end = parseYmdUtc(item.plannedEnd);
      if (!maxRoadmapEnd || end.getTime() > maxRoadmapEnd.getTime()) {
        maxRoadmapEnd = end;
      }
    }

    schedule.sort((a, b) =>
      a.plannedStart.localeCompare(b.plannedStart)
      || compareNullableNumberDesc(a.priorityScore, b.priorityScore)
      || a.projectId.localeCompare(b.projectId));
    reservations.sort((a, b) =>
      a.plannedStart.localeCompare(b.plannedStart)
      || a.projectName.localeCompare(b.projectName)
      || a.projectId.localeCompare(b.projectId));

    const unschedulable = Array.from(unschedulableMap.values())
      .sort((a, b) => a.projectName.localeCompare(b.projectName) || a.projectId.localeCompare(b.projectId));

    return {
      schedule,
      reservations,
      unschedulable,
      roadmapEndDate: maxRoadmapEnd ? toYmdUtc(maxRoadmapEnd) : null,
      weeklyProjectLoad,
    };
  }

  private resolveHistoricalStart(
    project: ProjectComputation,
    asOfDate: Date,
  ): Date | null {
    const actualStart = toUtcDate(project.actualStart);
    const plannedStart = toUtcDate(project.plannedStart);

    const startedByStatus = project.status === 'in_progress'
      || project.status === 'in_testing'
      || project.status === 'on_hold';
    const startedByProgress = project.executionProgress > EPSILON;

    const candidate = actualStart
      ?? ((startedByStatus || startedByProgress) ? plannedStart : null);
    if (!candidate) return null;
    if (candidate.getTime() >= asOfDate.getTime()) return null;
    return candidate;
  }

  private estimateBottleneckWeeks(
    project: ProjectComputation,
    weeklyCapacityByUser: Map<string, number>,
    options: RoadmapGenerateDto,
  ): number {
    let maxWeeks = 0;
    for (const [userId, demandDays] of project.contributorDays.entries()) {
      const weeklyCap = weeklyCapacityByUser.get(userId) ?? 0;
      if (weeklyCap <= EPSILON) return Number.POSITIVE_INFINITY;
      const effective = this.computeEffectiveWeeklyCapacity(weeklyCap, 1, options);
      if (effective <= EPSILON) return Number.POSITIVE_INFINITY;
      maxWeeks = Math.max(maxWeeks, demandDays / effective);
    }
    return maxWeeks;
  }

  private computeEffectiveWeeklyCapacity(
    weeklyBaseCapacity: number,
    concurrency: number,
    options: RoadmapGenerateDto,
  ): number {
    if (weeklyBaseCapacity <= EPSILON) return 0;
    const overload = Math.max(0, concurrency - options.contextSwitchGrace);
    const factor = 1 - (options.contextSwitchPenaltyPct * overload);
    return Math.max(0.05, weeklyBaseCapacity * factor);
  }

  private getCommittedLoad(
    ledger: CommittedLoadLedger,
    userId: string,
    weekKey: string,
  ): number {
    return ledger.get(userId)?.get(weekKey) ?? 0;
  }

  private addCommittedLoad(
    ledger: CommittedLoadLedger,
    userId: string,
    weekKey: string,
    days: number,
  ): void {
    const byWeek = ledger.get(userId) ?? new Map<string, number>();
    byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + days);
    ledger.set(userId, byWeek);
  }

  private getActiveCount(
    ledger: ActiveProjectsLedger,
    userId: string,
    weekKey: string,
  ): number {
    return ledger.get(userId)?.get(weekKey)?.size ?? 0;
  }

  private addActiveProject(
    ledger: ActiveProjectsLedger,
    userId: string,
    weekKey: string,
    projectId: string,
  ): void {
    const byWeek = ledger.get(userId) ?? new Map<string, Set<string>>();
    const projects = byWeek.get(weekKey) ?? new Set<string>();
    projects.add(projectId);
    byWeek.set(weekKey, projects);
    ledger.set(userId, byWeek);
  }

  private addWeeklyProjectLoad(
    ledger: WeeklyProjectLoadLedger,
    userId: string,
    weekKey: string,
    projectId: string,
    days: number,
  ): void {
    const byWeek = ledger.get(userId) ?? new Map<string, Map<string, number>>();
    const byProject = byWeek.get(weekKey) ?? new Map<string, number>();
    byProject.set(projectId, (byProject.get(projectId) ?? 0) + days);
    byWeek.set(weekKey, byProject);
    ledger.set(userId, byWeek);
  }

  private buildOccupation(
    weeklyProjectLoad: WeeklyProjectLoadLedger | null,
    contributors: Map<string, ContributorInfo>,
    projectNames: Map<string, string>,
  ): OccupationEntry[] {
    if (!weeklyProjectLoad) return [];

    const entries: OccupationEntry[] = [];
    const contributorIds = Array.from(weeklyProjectLoad.keys())
      .sort((a, b) => {
        const nameA = contributors.get(a)?.name ?? a;
        const nameB = contributors.get(b)?.name ?? b;
        return nameA.localeCompare(nameB) || a.localeCompare(b);
      });

    for (const contributorId of contributorIds) {
      const contributor = contributors.get(contributorId) ?? {
        id: contributorId,
        name: contributorId,
        teamId: null,
        teamName: null,
        monthlyCapacity: 0,
        weeklyCapacity: 0,
      };
      const byWeek = weeklyProjectLoad.get(contributorId);
      if (!byWeek) continue;
      const weeks = Array.from(byWeek.keys()).sort((a, b) => a.localeCompare(b));

      for (const week of weeks) {
        const projectLoads = byWeek.get(week);
        if (!projectLoads) continue;

        let effortRaw = 0;
        for (const weekDays of projectLoads.values()) {
          if (weekDays <= EPSILON) continue;
          effortRaw += weekDays;
        }
        const effortDays = round2(effortRaw);
        const capacityDays = contributor.weeklyCapacity > EPSILON ? round2(contributor.weeklyCapacity) : null;
        const occupationPct = capacityDays && capacityDays > 0
          ? Math.round((effortDays / capacityDays) * 100)
          : null;

        const projects = Array.from(projectLoads.entries())
          .filter(([, days]) => days > EPSILON)
          .map(([projectId, days]) => ({
            projectId,
            projectName: projectNames.get(projectId) || projectId,
            days: round2(days),
          }))
          .sort((a, b) =>
            b.days - a.days
            || a.projectName.localeCompare(b.projectName)
            || a.projectId.localeCompare(b.projectId));

        entries.push({
          contributorId,
          contributorName: contributor.name,
          teamId: contributor.teamId,
          teamName: contributor.teamName,
          week,
          effortDays,
          capacityDays,
          occupationPct,
          projects,
        });
      }
    }

    return entries;
  }

  private buildTeamOccupation(occupation: OccupationEntry[]): TeamOccupationEntry[] {
    const byTeamWeek = new Map<string, TeamOccupationEntry>();
    for (const entry of occupation) {
      const teamKey = entry.teamId ?? 'no-team';
      const key = `${teamKey}:${entry.week}`;
      const existing = byTeamWeek.get(key) ?? {
        teamId: entry.teamId,
        teamName: entry.teamName ?? 'No team',
        week: entry.week,
        effortDays: 0,
        capacityDays: null,
        occupationPct: null,
      };
      existing.effortDays += entry.effortDays;
      if (entry.capacityDays != null) {
        existing.capacityDays = (existing.capacityDays ?? 0) + entry.capacityDays;
      }
      byTeamWeek.set(key, existing);
    }

    const result = Array.from(byTeamWeek.values()).map((entry) => {
      const effortDays = round2(entry.effortDays);
      const capacityDays = entry.capacityDays != null ? round2(entry.capacityDays) : null;
      const occupationPct = capacityDays && capacityDays > 0
        ? Math.round((effortDays / capacityDays) * 100)
        : null;
      return {
        ...entry,
        effortDays,
        capacityDays,
        occupationPct,
      };
    });

    result.sort((a, b) =>
      (a.teamName ?? '').localeCompare(b.teamName ?? '')
      || (a.teamId ?? '').localeCompare(b.teamId ?? '')
      || a.week.localeCompare(b.week));

    return result;
  }

  /**
   * Build on-hold date ranges for scheduled projects from audit_log history.
   * Single batched query, tenant-scoped. No N+1 loops.
   */
  private async buildOnHoldRanges(
    tenantId: string,
    schedule: ScheduledProject[],
    mg: EntityManager,
  ): Promise<Map<string, OnHoldRange[]>> {
    const projectIds = schedule.map((p) => p.projectId);
    const projectInfoById = new Map(
      schedule.map((p) => [p.projectId, {
        plannedStart: p.plannedStart,
        plannedEnd: p.plannedEnd,
        historicalStart: p.historicalStart,
        currentStatus: p.status,
      }]),
    );

    // Batched query: fetch all status-change audit rows for scheduled projects.
    const auditRows: Array<{
      record_id: string;
      before_json: any;
      after_json: any;
      created_at: Date;
      id: string;
    }> = await mg.query(
      `
      SELECT a.record_id, a.before_json, a.after_json, a.created_at, a.id
      FROM audit_log a
      WHERE a.tenant_id = $1
        AND a.table_name = 'portfolio_projects'
        AND a.record_id = ANY($2)
        AND a.action = 'update'
      ORDER BY a.record_id ASC, a.created_at ASC, a.id ASC
      `,
      [tenantId, projectIds],
    );

    // Group by project and filter to status changes only
    const statusChangesByProject = new Map<string, Array<{ oldStatus: string; newStatus: string; at: Date }>>();
    for (const row of auditRows) {
      const beforeStatus = row.before_json?.status;
      const afterStatus = row.after_json?.status;
      if (!beforeStatus || !afterStatus || beforeStatus === afterStatus) continue;

      const list = statusChangesByProject.get(row.record_id) ?? [];
      list.push({
        oldStatus: String(beforeStatus),
        newStatus: String(afterStatus),
        at: new Date(row.created_at),
      });
      statusChangesByProject.set(row.record_id, list);
    }

    const result = new Map<string, OnHoldRange[]>();

    for (const projectId of projectIds) {
      const info = projectInfoById.get(projectId);
      if (!info) continue;

      const windowStart = info.historicalStart ?? info.plannedStart;
      const windowEnd = info.plannedEnd;
      const windowStartDate = parseYmdUtc(windowStart);
      const windowEndDate = parseYmdUtc(windowEnd);

      const changes = statusChangesByProject.get(projectId);

      // Edge case: project currently on_hold with no audit records at all
      if (!changes || changes.length === 0) {
        if (info.currentStatus === 'on_hold') {
          result.set(projectId, [{
            from: toYmdUtc(windowStartDate),
            to: toYmdUtc(windowEndDate),
          }]);
        }
        continue;
      }

      // Build on-hold intervals from status transitions
      const rawIntervals: Array<{ from: Date; to: Date }> = [];
      let onHoldStart: Date | null = null;

      for (const change of changes) {
        if (change.newStatus === 'on_hold') {
          // Enter on-hold
          if (!onHoldStart) {
            onHoldStart = change.at;
          }
        } else if (change.oldStatus === 'on_hold') {
          // Exit on-hold
          if (onHoldStart) {
            rawIntervals.push({ from: onHoldStart, to: change.at });
            onHoldStart = null;
          } else {
            // Exit without prior enter in history window: backfill from window start
            rawIntervals.push({ from: windowStartDate, to: change.at });
          }
        }
      }

      // If still on-hold at end of history, close at window end
      if (onHoldStart) {
        rawIntervals.push({ from: onHoldStart, to: windowEndDate });
      }

      // Clip intervals to window, convert to YMD, merge overlapping/adjacent
      const clipped: Array<{ from: Date; to: Date }> = [];
      for (const interval of rawIntervals) {
        const clippedFrom = new Date(Math.max(interval.from.getTime(), windowStartDate.getTime()));
        const clippedTo = new Date(Math.min(interval.to.getTime(), windowEndDate.getTime()));
        if (clippedFrom.getTime() <= clippedTo.getTime()) {
          clipped.push({ from: clippedFrom, to: clippedTo });
        }
      }

      // Sort and merge overlapping/adjacent
      clipped.sort((a, b) => a.from.getTime() - b.from.getTime());
      const merged: Array<{ from: Date; to: Date }> = [];
      for (const interval of clipped) {
        const last = merged[merged.length - 1];
        if (last && interval.from.getTime() <= last.to.getTime() + MS_PER_DAY) {
          last.to = new Date(Math.max(last.to.getTime(), interval.to.getTime()));
        } else {
          merged.push({ from: new Date(interval.from), to: new Date(interval.to) });
        }
      }

      if (merged.length > 0) {
        result.set(
          projectId,
          merged.map((interval) => ({
            from: toYmdUtc(interval.from),
            to: toYmdUtc(interval.to),
          })),
        );
      }
    }

    return result;
  }
}
