/** Open items of one entity, and how many of them miss each classification value. */
export type GapCounts = {
  /** Open items in scope. */
  open: number;
  /** Open items missing at least one of the counted values. */
  anyGap: number;
  source: number;
  category: number;
  stream: number;
};

export type ClassificationGapsResponse = {
  tasks: GapCounts & { taskType: number };
  requests: GapCounts;
  projects: GapCounts;
  /**
   * Names of the categories that offer at least one active stream. The stream figures count
   * only items in those categories, and the UI needs the same names to build a list filter
   * that shows exactly that population.
   */
  categoriesWithStreams: string[];
};
