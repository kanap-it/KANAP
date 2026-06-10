/**
 * SQL fragment matching the bilingual document search vector built by
 * `documents_search_vector_sync()` (migration 1852900000000): the same text is
 * indexed under both `kanap_fr` and `kanap_en` (unaccent + language stemmer),
 * so queries must OR the two configurations to get accent folding and
 * French/English stemming in either direction.
 *
 * `paramRef` is the SQL placeholder holding the raw user query
 * (e.g. `$1` or `:searchTerm`).
 */
export function bilingualDocumentTsQuerySql(paramRef: string): string {
  return `(websearch_to_tsquery('kanap_fr', ${paramRef}) || websearch_to_tsquery('kanap_en', ${paramRef}))`;
}
