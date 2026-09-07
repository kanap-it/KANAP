/** Write-time rules mirrored from the server: names are the visible identity of catalog values. */
export type CatalogRow = { code?: string; label?: string; localId?: string };
export type CatalogIssue = 'nameRequired' | 'nameExists' | 'nameMatchesCode' | 'noComma';

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Issues keyed by row index. A list with issues must not be sent. */
export function catalogListIssues(rows: CatalogRow[], options: { forbidComma?: boolean; skipCodes?: Set<string> } = {}): Map<number, CatalogIssue> {
  const issues = new Map<number, CatalogIssue>();
  const names = new Map<string, number>();
  const codes = new Map<string, number>();
  rows.forEach((row, index) => { const code = normalize(row.code); if (code) codes.set(code, index); });
  rows.forEach((row, index) => {
    if (options.skipCodes?.has(normalize(row.code))) return;
    const name = normalize(row.label);
    if (!name) { issues.set(index, 'nameRequired'); return; }
    if (options.forbidComma && /[,;]/.test(name)) { issues.set(index, 'noComma'); return; }
    const owner = names.get(name);
    if (owner !== undefined) { issues.set(index, 'nameExists'); issues.set(owner, 'nameExists'); return; }
    names.set(name, index);
    const codeOwner = codes.get(name);
    if (codeOwner !== undefined && codeOwner !== index) issues.set(index, 'nameMatchesCode');
  });
  return issues;
}
