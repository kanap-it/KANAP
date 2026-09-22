/** One local week of the flow window, Monday to Sunday in the viewer's zone. */
export type FlowWeek = {
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string;
  /** Sunday of the week, `YYYY-MM-DD`. The last week ends on today all the same. */
  weekEnd: string;
  /** Items created during the week and still present. */
  created: number;
  /** Items whose last status event of the week left them closed. */
  closed: number;
  /** Items in flight at the end of the week: created by then, not closed then. */
  openAtEnd: number;
};

/** The weekly movement of one entity, plus how many of it are open right now. */
export type FlowSeries = {
  weeks: FlowWeek[];
  openNow: number;
};

/** Age brackets of an open task, in whole days since it was created. */
export type AgeBucket = 'upTo7' | 'from8To30' | 'from31To90' | 'over90';

/** Open tasks of one task type, spread over the age brackets. */
export type AgeRow = {
  taskTypeId: string | null;
  /** Null on the row that gathers the tasks with no type. */
  taskTypeName: string | null;
  buckets: Record<AgeBucket, number>;
  total: number;
};

/** How long it took to close, over the whole window. */
export type LeadTime = {
  closedCount: number;
  /** Median days between creation and closing, one decimal. Null when nothing closed. */
  medianDays: number | null;
};

export type LeadTimeByType = { taskTypeId: string | null; taskTypeName: string | null } & LeadTime;

export type FlowReportResponse = {
  weeks: number;
  /** Monday of the first week and today, both in the viewer's zone. */
  startDate: string;
  endDate: string;
  timeZone: string;
  /** Instant the figures were read, ISO 8601. */
  asOf: string;
  flow: { tasks: FlowSeries; requests: FlowSeries; projects: FlowSeries };
  age: { rows: AgeRow[]; total: AgeRow };
  leadTime: {
    tasks: LeadTime;
    tasksByType: LeadTimeByType[];
    requests: LeadTime;
    projects: LeadTime;
  };
};

/** Periods the report offers, in weeks. Anything else falls back to the middle one. */
export const FLOW_WEEKS = [8, 13, 26] as const;
export const FLOW_DEFAULT_WEEKS = 13;
