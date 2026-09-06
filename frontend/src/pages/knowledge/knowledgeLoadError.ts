/**
 * Load failures of a single document, split by what the user can do about it.
 *
 * `access` covers 404 and 403: the document does not exist, was deleted, or the
 * viewer lost access to it (an incident review follows the confidentiality of
 * its incident, so access can disappear between two visits). Retrying is
 * pointless and the cached copy must not stay on screen.
 *
 * `failure` covers everything else (network, 5xx): the document may well still
 * be readable, so the screen offers a retry.
 */
export type KnowledgeLoadErrorKind = 'access' | 'failure';

export function classifyKnowledgeLoadError(error: unknown): KnowledgeLoadErrorKind | null {
  if (!error) return null;
  const status = Number((error as { response?: { status?: unknown } })?.response?.status || 0);
  if (status === 403 || status === 404) return 'access';
  return 'failure';
}
