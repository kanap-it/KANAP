import type { TFunction } from 'i18next';

/**
 * Human labels for the columns the weekly report reports as changed.
 *
 * The wording is the one the item history already uses, so a change reads the same
 * in the report and in the item's own history feed: request and project columns come
 * from `activity.history.fields.*` (the map in PortfolioHistory), task columns from
 * `workspace.task.history.fields.*` (the map in TaskHistory).
 */
const PORTFOLIO_FIELD_KEYS: Record<string, string> = {
  name: 'name',
  purpose: 'purpose',
  current_situation: 'currentSituation',
  expected_benefits: 'expectedBenefits',
  risks: 'risks',
  feasibility_review: 'feasibilityReview',
  source_id: 'source',
  category_id: 'category',
  stream_id: 'stream',
  requestor_id: 'requestor',
  target_delivery_date: 'targetDeliveryDate',
  origin_task_id: 'originTask',
  company_id: 'company',
  department_id: 'department',
  business_sponsor_id: 'businessSponsor',
  business_lead_id: 'businessLead',
  it_sponsor_id: 'itSponsor',
  it_lead_id: 'itLead',
  planned_start: 'plannedStart',
  planned_end: 'plannedEnd',
  actual_start: 'actualStart',
  actual_end: 'actualEnd',
  converted_date: 'convertedDate',
  estimated_effort_it: 'estimatedEffortIt',
  estimated_effort_business: 'estimatedEffortBusiness',
  actual_effort_it: 'actualEffortIt',
  actual_effort_business: 'actualEffortBusiness',
  execution_progress: 'progress',
  priority_score: 'priorityScore',
  priority_override: 'priorityOverride',
  override_value: 'overrideValue',
  override_justification: 'overrideJustification',
  criteria_values: 'criteriaValues',
  scheduling_mode: 'schedulingMode',
  it_effort_allocation_mode: 'itEffortAllocationMode',
  business_effort_allocation_mode: 'businessEffortAllocationMode',
};

const TASK_FIELD_KEYS: Record<string, string> = {
  title: 'title',
  description: 'description',
  task_type_id: 'taskType',
  priority_level: 'priority',
  creator_id: 'requestor',
  assignee_user_id: 'assignee',
  due_date: 'dueDate',
  start_date: 'startDate',
  labels: 'labels',
  phase_id: 'phase',
  source_id: 'source',
  category_id: 'category',
  stream_id: 'stream',
  company_id: 'company',
  owner_ids: 'owners',
  viewer_ids: 'viewers',
  related_object_id: 'relatedTo',
  related_object_type: 'relatedTo',
};

const humanize = (field: string): string =>
  field
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

export type WeeklyReportEntity = 'request' | 'project' | 'task';

/** Translated label for one changed column, humanised as a last resort. */
export function getWeeklyFieldLabel(
  t: TFunction,
  entity: WeeklyReportEntity,
  field: string,
): string {
  if (entity === 'task') {
    const key = TASK_FIELD_KEYS[field];
    if (key) return t(`workspace.task.history.fields.${key}`);
    return humanize(field);
  }
  const key = PORTFOLIO_FIELD_KEYS[field];
  if (key) return t(`activity.history.fields.${key}`);
  return humanize(field);
}

/** Distinct labels for a change set, in a stable order and without duplicates. */
export function getWeeklyFieldLabels(
  t: TFunction,
  entity: WeeklyReportEntity,
  fields: string[],
): string[] {
  const labels: string[] = [];
  fields.forEach((field) => {
    const label = getWeeklyFieldLabel(t, entity, field);
    if (!labels.includes(label)) labels.push(label);
  });
  return labels;
}
