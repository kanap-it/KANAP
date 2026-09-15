export interface DisplayUserLike {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/**
 * Display label of a person: full name, then first + last name, then email.
 *
 * The email is the last resort so accounts without a name (platform, service or
 * integration accounts) stay identifiable in author lines and drawers instead
 * of falling back to a generic "Unknown".
 */
export function formatUserName(user: DisplayUserLike | null | undefined): string | null {
  if (!user) return null;
  const fullName = String(user.full_name || '').trim();
  if (fullName) return fullName;
  const name = [user.first_name, user.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  return name || String(user.email || '').trim() || null;
}

/**
 * Avatar initials: first letter of the first and of the last word, so a
 * compound first name keeps its own initial ("Jean Pierre Dupont" → JD).
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Avatar initials of a person, email included. An author with no display label
 * at all stays a question mark instead of taking the initial of a translated
 * "Unknown" label.
 */
export function getUserInitials(user: DisplayUserLike | null | undefined): string {
  return getInitials(formatUserName(user));
}
