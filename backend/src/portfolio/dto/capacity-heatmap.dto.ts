import { ProjectStatus } from '../portfolio-project.entity';

export type CapacityColorBand = 'green' | 'yellow' | 'orange' | 'red' | 'violet' | 'na';
export type CapacityMode = 'historical' | 'theoretical';
export type CapacityGroupBy = 'contributor' | 'team';

export interface ContributorCapacityRow {
  contributorId: string;
  contributorName: string;
  teamId: string | null;
  teamName: string | null;
  remainingDays: number;
  capacityDaysPerMonth: number | null;
  capacitySource: CapacityMode | null;
  monthsOfWork: number | null;
  colorBand: CapacityColorBand;
}

export interface TeamCapacityRow {
  teamId: string;
  teamName: string;
  memberCount: number;
  remainingDays: number;
  capacityDaysPerMonth: number | null;
  monthsOfWork: number | null;
  colorBand: CapacityColorBand;
}

export interface ProjectBreakdownRow {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  estimatedEffort: number;
  executionProgress: number;
  remainingEffort: number;
  allocationPct: number;
  contributorDays: number;
}

export interface UnassignedProjectRow {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  estimatedEffort: number;
  remainingEffort: number;
  unallocatedPct: number;
  unallocatedDays: number;
}

export interface CapacityHeatmapResponse {
  contributors: ContributorCapacityRow[];
  teams: TeamCapacityRow[];
  unassignedSummary: { totalProjects: number; totalUnallocatedDays: number };
  unassignedProjects: UnassignedProjectRow[];
  filters: { teamIds: string[]; statuses: ProjectStatus[]; capacityMode: CapacityMode; groupBy: CapacityGroupBy };
}
