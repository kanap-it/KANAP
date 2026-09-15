/**
 * Pure helpers that turn stored values into the human-readable entries of the
 * portfolio activity feed: item references ("PRJ-3: Name") and scoring diffs.
 *
 * They are kept free of any database or i18n access so the write paths stay
 * thin and the formatting is unit-testable. Numeric comparisons of `numeric`
 * columns belong to `detectChanges(..., { compare: 'number' })`.
 */

export type CriteriaValuesMap = Record<string, unknown> | null | undefined;

export interface CriteriaLabelMaps {
  /** criterion id -> criterion name */
  criterionName: Map<string, string>;
  /** criterion value id -> option label */
  optionLabel: Map<string, string>;
}

/** Criterion ids whose selected option changed between two `criteria_values`. */
export function listChangedCriteria(before: CriteriaValuesMap, after: CriteriaValuesMap): string[] {
  const ids = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed: string[] = [];
  for (const id of ids) {
    if ((before?.[id] ?? null) !== (after?.[id] ?? null)) changed.push(id);
  }
  return changed.sort((a, b) => a.localeCompare(b));
}

/**
 * Readable before/after labels for the criteria that changed. Returns null when
 * nothing can be shown (for example a criterion and its option both deleted),
 * so callers never store an unreadable entry.
 */
export function formatCriteriaDiff(
  before: CriteriaValuesMap,
  after: CriteriaValuesMap,
  labels: CriteriaLabelMaps,
): [string[], string[]] | null {
  const from: string[] = [];
  const to: string[] = [];

  for (const criterionId of listChangedCriteria(before, after)) {
    const criterion = labels.criterionName.get(criterionId)?.trim() || null;
    const describe = (optionId: unknown): string | null => {
      if (optionId === null || optionId === undefined || optionId === '') return null;
      const option = labels.optionLabel.get(String(optionId))?.trim() || null;
      if (criterion && option) return `${criterion}: ${option}`;
      // Never surface a raw identifier: fall back to whatever is readable.
      return option || criterion;
    };

    const beforeLabel = describe(before?.[criterionId]);
    const afterLabel = describe(after?.[criterionId]);
    if (!beforeLabel && !afterLabel) continue;
    if (beforeLabel) from.push(beforeLabel);
    if (afterLabel) to.push(afterLabel);
  }

  if (from.length === 0 && to.length === 0) return null;
  return [from, to];
}

/**
 * Business reference of a record as shown in the activity feed
 * ("PRJ-3: Fromage-as-a-Service"), or the plain name when the tenant has no
 * item number yet.
 */
export function formatItemLabel(
  prefix: string,
  itemNumber: number | null | undefined,
  name: string | null | undefined,
): string {
  const label = String(name || '').trim();
  const numbered = itemNumber == null ? null : `${prefix}-${itemNumber}`;
  if (numbered && label) return `${numbered}: ${label}`;
  return numbered || label || '';
}
