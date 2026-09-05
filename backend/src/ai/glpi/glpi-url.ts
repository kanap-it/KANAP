/**
 * Recover the installation root from a GLPI URL, including copied API routes.
 * Both legacy entry points are accepted as input; GlpiService always constructs
 * requests through apirest.php. Preserve installation subdirectories and casing.
 */
export function normalizeGlpiPathname(pathname: string): string {
  const trimmed = (pathname || '/').replace(/\/+$/, '') || '/';
  return trimmed.replace(/\/(?:apirest\.php|api\.php\/v1)(?:\/.*)?$/i, '') || '/';
}
