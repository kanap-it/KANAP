/**
 * Shared object guards.
 *
 * `isRecord` used to be redefined in 27 modules (in four spellings, all logically
 * identical). It lives here so there is one definition to reason about.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
