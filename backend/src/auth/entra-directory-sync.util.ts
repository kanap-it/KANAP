/**
 * Pure helpers shared by the Entra login-time enrichment and the scheduled
 * directory sync. No I/O here so the merge rules can be unit-tested.
 */

/** Subset of a Microsoft Graph `user` resource that KANAP consumes. */
export type DirectoryProfile = {
  id?: string;
  givenName?: string | null;
  surname?: string | null;
  displayName?: string | null;
  jobTitle?: string | null;
  businessPhones?: string[] | null;
  mobilePhone?: string | null;
  department?: string | null;
  companyName?: string | null;
  preferredLanguage?: string | null;
  accountEnabled?: boolean | null;
};

export const SUPPORTED_DIRECTORY_LOCALES = ['en', 'fr', 'de', 'es'] as const;

export type DirectoryAction = 'sync' | 'disable_removed' | 'disable_deactivated';

/** What the sync should do for a user given what the directory returned. */
export function decideDirectoryAction(profile: DirectoryProfile | undefined | null): DirectoryAction {
  if (!profile) return 'disable_removed';
  if (profile.accountEnabled === false) return 'disable_deactivated';
  return 'sync';
}

/** Graph `preferredLanguage` ("fr-FR", "en-US", "de") → KANAP locale or null. */
export function normalizeDirectoryLocale(raw: string | null | undefined): string | null {
  const base = String(raw ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_DIRECTORY_LOCALES as readonly string[]).includes(base) ? base : null;
}

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = String(displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * First/last name from the directory: givenName/surname first, then
 * displayName, then the id_token `name` claim as a last resort.
 */
export function resolveDirectoryNames(
  profile: DirectoryProfile,
  claims?: { given_name?: string; family_name?: string; name?: string } | null,
): { firstName: string; lastName: string } {
  const firstName = (profile.givenName || claims?.given_name || '').trim();
  const lastName = (profile.surname || claims?.family_name || '').trim();
  if (firstName || lastName) return { firstName, lastName };
  if (profile.displayName) return splitDisplayName(profile.displayName);
  if (claims?.name) return splitDisplayName(claims.name);
  return { firstName: '', lastName: '' };
}

export type DirectoryScalarTarget = {
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  business_phone: string | null;
  mobile_phone: string | null;
  locale: string | null;
};

/**
 * Directory-owned scalar fields. Rule: a non-empty directory value wins, an
 * empty one never clears local data. Locale is the exception — it is set
 * only when the user has not chosen one (never overrides a user's choice).
 * Returns true when anything changed.
 */
export function mergeScalarFields(
  target: DirectoryScalarTarget,
  profile: DirectoryProfile,
  names: { firstName: string; lastName: string },
): boolean {
  let changed = false;
  const set = (key: keyof DirectoryScalarTarget, value: string | null | undefined) => {
    const next = typeof value === 'string' ? value.trim() : '';
    if (!next || target[key] === next) return;
    target[key] = next;
    changed = true;
  };
  set('first_name', names.firstName);
  set('last_name', names.lastName);
  set('job_title', profile.jobTitle);
  set('business_phone', Array.isArray(profile.businessPhones) ? profile.businessPhones[0] : null);
  set('mobile_phone', profile.mobilePhone);
  if (!target.locale) {
    const locale = normalizeDirectoryLocale(profile.preferredLanguage);
    if (locale) {
      target.locale = locale;
      changed = true;
    }
  }
  return changed;
}
