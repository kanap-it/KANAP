import { z } from 'zod';
import { ProjectStatuses } from './create-project.dto';
import { ProjectStatus } from '../portfolio-project.entity';

const DATE_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(value: string): boolean {
  if (!DATE_YMD_REGEX.test(value)) return false;
  const [y, m, d] = value.split('-').map((part) => Number(part));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
}

const YmdDateSchema = z.string()
  .regex(DATE_YMD_REGEX, 'Date must be in YYYY-MM-DD format')
  .refine(isValidYmd, 'Invalid calendar date');

const GenerateStatusesSchema = z.array(z.enum(ProjectStatuses))
  .min(1)
  .default(['waiting_list', 'planned', 'in_progress', 'in_testing']);

export const RoadmapGenerateSchema = z.object({
  startDate: YmdDateSchema,
  statuses: GenerateStatusesSchema,
  capacityMode: z.enum(['theoretical', 'historical']).default('theoretical'),
  parallelizationLimit: z.number().int().min(1).max(3).default(1),
  optimizationMode: z.enum(['priority_focused', 'completion_focused']).default('priority_focused'),
  includeAlreadyScheduled: z.boolean().default(true),
  excludedProjectIds: z.array(z.string().uuid()).default([]),
  contextSwitchPenaltyPct: z.number().min(0).max(0.5).default(0.1),
  contextSwitchGrace: z.number().int().min(0).max(10).default(1),
  collaborativeScheduling: z.boolean().default(false),
});

export type RoadmapGenerateInput = z.input<typeof RoadmapGenerateSchema>;
export type RoadmapGenerateDto = z.output<typeof RoadmapGenerateSchema>;

export const RoadmapApplyProjectSchema = z.object({
  projectId: z.string().uuid(),
  plannedStart: YmdDateSchema,
  plannedEnd: YmdDateSchema,
}).superRefine((val, ctx) => {
  if (val.plannedStart > val.plannedEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'plannedStart must be before or equal to plannedEnd',
      path: ['plannedEnd'],
    });
  }
});

export const RoadmapApplySchema = z.object({
  projects: z.array(RoadmapApplyProjectSchema)
    .min(1, 'At least one project is required')
    .superRefine((projects, ctx) => {
      const seen = new Set<string>();
      projects.forEach((project, index) => {
        if (seen.has(project.projectId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate projectId '${project.projectId}'`,
            path: [index, 'projectId'],
          });
          return;
        }
        seen.add(project.projectId);
      });
    }),
});

export type RoadmapApplyInput = z.input<typeof RoadmapApplySchema>;
export type RoadmapApplyDto = z.output<typeof RoadmapApplySchema>;

export interface ScheduledProjectContributorLoad {
  contributorId: string;
  contributorName: string;
  days: number;
}

export interface ScheduledProject {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  categoryId: string | null;
  executionProgress: number;
  priorityScore: number | null;
  plannedStart: string;
  historicalStart: string | null;
  plannedEnd: string;
  durationWeeks: number;
  remainingEffortDays: number;
  blockerProjectIds: string[];
  contributorLoads: ScheduledProjectContributorLoad[];
}

export type RoadmapReservationReason = 'not_recalculated' | 'external_blocker';

export interface RoadmapReservation {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  categoryId: string | null;
  executionProgress: number;
  plannedStart: string;
  plannedEnd: string;
  reason: RoadmapReservationReason;
  contributorLoads: ScheduledProjectContributorLoad[];
}

export interface UnschedulableProject {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  reason:
    | 'zero_remaining_effort'
    | 'no_assigned_contributors'
    | 'missing_blocker_date'
    | 'cyclic_dependency'
    | 'insufficient_capacity'
    | 'missing_contributor_capacity';
  details?: string;
}

export interface BottleneckEntry {
  contributorId: string;
  contributorName: string;
  impactDays: number;
}

export interface OccupationProjectBreakdown {
  projectId: string;
  projectName: string;
  days: number;
}

export interface OccupationEntry {
  contributorId: string;
  contributorName: string;
  teamId: string | null;
  teamName: string | null;
  week: string;
  effortDays: number;
  capacityDays: number | null;
  occupationPct: number | null;
  projects: OccupationProjectBreakdown[];
}

export interface TeamOccupationEntry {
  teamId: string | null;
  teamName: string | null;
  week: string;
  effortDays: number;
  capacityDays: number | null;
  occupationPct: number | null;
}

export interface RoadmapDiagnostics {
  modeLabel: 'priority_focused' | 'completion_focused';
  runDurationMs: number;
  candidateProjects: number;
  scheduledProjects: number;
  reservationProjects: number;
  reservationByReason: {
    not_recalculated: number;
    external_blocker: number;
  };
  hiddenCapacityProjects: number;
  frozenProjects: number;
  unschedulableProjects: number;
  sensitivityReruns: number;
  sensitivityTruncated: boolean;
}

export interface RoadmapResponse {
  schedule: ScheduledProject[];
  reservations: RoadmapReservation[];
  bottlenecks: BottleneckEntry[];
  occupation: OccupationEntry[];
  teamOccupation: TeamOccupationEntry[];
  roadmapEndDate: string | null;
  unschedulable: UnschedulableProject[];
  options: RoadmapGenerateDto;
  diagnostics: RoadmapDiagnostics;
}

export function parseRoadmapGenerate(input: unknown): RoadmapGenerateDto {
  return RoadmapGenerateSchema.parse(input);
}

export function parseRoadmapApply(input: unknown): RoadmapApplyDto {
  return RoadmapApplySchema.parse(input);
}
