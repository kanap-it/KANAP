/**
 * Shared shape of the synthetic "creation" entry of a portfolio activity feed.
 *
 * Creation is not a stored activity: the feed appends this entry last (the list
 * is newest first) so it renders exactly like the other rows — same box, same
 * timestamp with the time — instead of a separate header line.
 */
export const CREATED_ENTRY_ID = '__created__';

export interface CreatedFeedEntry {
  id: string;
  type: 'change';
  content: null;
  context: null;
  decision_outcome: null;
  author_id: null;
  first_name: null;
  last_name: null;
  /** Display label resolved by the API (name, or email when there is no name). */
  full_name: string | null;
  created_at: string;
}

export const isCreatedEntry = (activity: { id: string }): boolean =>
  activity.id === CREATED_ENTRY_ID;

export function buildCreatedEntry(
  createdAt: string | null | undefined,
  createdByName: string | null | undefined,
): CreatedFeedEntry | null {
  if (!createdAt) return null;
  return {
    id: CREATED_ENTRY_ID,
    type: 'change',
    content: null,
    context: null,
    decision_outcome: null,
    author_id: null,
    first_name: null,
    last_name: null,
    full_name: createdByName ?? null,
    created_at: createdAt,
  };
}
