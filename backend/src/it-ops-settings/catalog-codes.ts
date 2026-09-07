import { BadRequestException } from '@nestjs/common';

/**
 * Catalog codes are stable identifiers generated from the name at creation and never shown to users.
 * Names (labels) are the visible identity: import and the API accept a code or a name, so every alias
 * (code or name, normalized) must designate a single entry of a list.
 */

const MAX_CODE_LENGTH = 64;
const GENERATED_BASE_LENGTH = 56;

export function normalizeAlias(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Slug of a name: accents stripped, lowercase, non-alphanumerics folded to `_`. Empty when nothing usable remains. */
export function slugifyCatalogCode(label: unknown): string {
  return String(label ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, GENERATED_BASE_LENGTH)
    .replace(/_+$/g, '');
}

/** Generates a code for `label` that is not in `taken`, and reserves it. */
export function generateCatalogCode(label: unknown, taken: Set<string>): string {
  const base = slugifyCatalogCode(label) || 'value';
  let candidate = base;
  for (let suffix = 2; taken.has(candidate); suffix += 1) candidate = `${base}_${suffix}`;
  taken.add(candidate);
  return candidate;
}

export type CatalogRowLike = { code?: unknown; label?: unknown; [key: string]: unknown };
export type PrepareListOptions = {
  /** Human name of the list for error messages. */
  listName: string;
  /** Names of this list are serialized as a comma-separated CSV cell: commas are refused. */
  commaSeparatedInCsv?: boolean;
  /** Rows whose code is in this set are managed by the server and skipped by the checks. */
  skipCodes?: Set<string>;
};

/**
 * Write-time preparation of a catalog list: reserves explicit codes, generates missing ones from the
 * name, and enforces the alias rule. Reads stay tolerant; this runs only on the lists a PATCH carries.
 */
export function prepareCatalogListForWrite<T extends CatalogRowLike>(rows: unknown, options: PrepareListOptions): T[] {
  if (!Array.isArray(rows)) throw new BadRequestException(`${options.listName}: a list of values is expected`);
  const list = rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];
  const taken = new Set<string>();
  // Reserve every explicit code first so generation never depends on row order.
  for (const row of list) {
    const code = normalizeAlias(row.code);
    if (!code) continue;
    if (!/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(code) || code.length > MAX_CODE_LENGTH) throw new BadRequestException(`${options.listName}: "${String(row.code)}" is not a valid code`);
    if (taken.has(code) && !options.skipCodes?.has(code)) throw new BadRequestException(`${options.listName}: the code "${code}" appears twice`);
    taken.add(code);
    row.code = code;
  }
  const aliases = new Map<string, number>();
  list.forEach((row, index) => {
    const label = String(row.label ?? '').trim();
    if (options.skipCodes?.has(String(row.code))) return;
    if (!label) throw new BadRequestException(`${options.listName}: every value needs a name`);
    if (label.length > 200) throw new BadRequestException(`${options.listName}: "${label}" is too long (200 characters maximum)`);
    if (options.commaSeparatedInCsv && /[,;]/.test(label)) throw new BadRequestException(`${options.listName}: "${label}" cannot contain a comma or a semicolon`);
    row.label = label;
    if (!normalizeAlias(row.code)) row.code = generateCatalogCode(label, taken);
    for (const alias of [normalizeAlias(row.code), normalizeAlias(label)]) {
      const owner = aliases.get(alias);
      if (owner !== undefined && owner !== index) throw new BadRequestException(`${options.listName}: "${label}" clashes with "${String(list[owner].label)}" (names and codes must be unique)`);
      aliases.set(alias, index);
    }
  });
  return list;
}
