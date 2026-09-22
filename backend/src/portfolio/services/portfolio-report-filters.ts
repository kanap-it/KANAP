/**
 * The classification filters the portfolio reports share: a report narrowed to a source or a
 * category has to narrow every one of its queries the same way, and the weekly report, the
 * flow report and the lists they link to all have to count the same population.
 *
 * The values are always identifiers coming from `GET /portfolio/reports/weekly/filter-values`,
 * and they always travel as bound parameters: nothing here is interpolated into SQL.
 */

/** A query string value as Nest hands it over: `a,b`, `['a','b']` or nothing at all. */
export const parseCsvIds = (value?: unknown): string[] => {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

/** The list without blanks and without duplicates. An empty list means "no filter". */
export const normalizeIdList = (values?: string[]): string[] => {
  if (!values) return [];
  const normalized = values
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
};

/**
 * Appends one set predicate to a statement's own parameter list and returns it, or `null` when
 * the filter is empty. The index is read off the list it was just pushed onto, so the same
 * filter can be built again for a statement that takes a different number of parameters.
 */
export const pushSetFilter = (
  sqlParams: any[],
  alias: string,
  column: string,
  values: string[] | undefined,
): string | null => {
  const normalized = normalizeIdList(values);
  if (normalized.length === 0) return null;
  sqlParams.push(normalized);
  return `${alias}.${column}::text = ANY($${sqlParams.length}::text[])`;
};
