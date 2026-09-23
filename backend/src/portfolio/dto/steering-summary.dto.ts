/** Movement of one entity over the period, plus how many of it are open right now. */
export type SteeringFlow = {
  /** Items created during the period and still present. */
  created: number;
  /** Items whose last status event of the period (creation included) leaves them closed: the period review rule. */
  closed: number;
  /** Items that moved from a closed status back to an open one during the period. */
  reopened: number;
  /** Items open at this instant, whatever happened during the period. */
  openNow: number;
  /** created + reopened - closed. */
  netChange: number;
};

/** One project that has had no activity at all for the stale window. */
export type SteeringStaleProject = {
  id: string;
  /** Business reference as the projects list shows it, e.g. `PRJ-12`. */
  ref: string;
  name: string;
  status: string;
  /** Day of the last activity found, in the viewer's zone. Null when nothing was ever recorded. */
  lastActivityAt: string | null;
};

export type SteeringSummaryResponse = {
  days: number;
  /** First and last day of the period, in the viewer's zone. */
  startDate: string;
  endDate: string;
  tasks: SteeringFlow;
  requests: SteeringFlow;
  projects: SteeringFlow;
  attention: {
    overdueTasks: number;
    unassignedTasks: number;
    staleProjects: SteeringStaleProject[];
  };
};
