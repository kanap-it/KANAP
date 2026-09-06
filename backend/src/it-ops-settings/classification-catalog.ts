import { BadRequestException } from '@nestjs/common';

export type ClassificationLevel = { code: string; label: string; description: string; rank: number; deprecated?: boolean };
export type BusinessCriticalityLevel = ClassificationLevel & { maxMtdMinutes: number | null };
export type RecoveryWave = Omit<ClassificationLevel, 'rank'> & { order: number };
export type ClassificationVersions = { business: number; cyber: number; confidentiality: number; recovery: number };
export type ClassificationCatalog = {
  businessCriticalityLevels: BusinessCriticalityLevel[];
  businessMtdPresets: number[];
  cyberCriticalityLevels: ClassificationLevel[];
  dataClasses: ClassificationLevel[];
  recoveryWaves: RecoveryWave[];
  classificationVersions: ClassificationVersions;
  classificationSettingsRevision: number;
};

// Versioned defaults: migration materializes these values; edits to software defaults
// must never alter an existing tenant's methodology.
export const DEFAULT_CLASSIFICATION_CATALOG: ClassificationCatalog = {
  businessCriticalityLevels: [
    { code: 'business_critical', label: 'Critical', description: 'The activity tolerates at most four hours of interruption.', rank: 4, maxMtdMinutes: 240 },
    { code: 'high', label: 'High', description: 'The activity tolerates more than four hours, up to one day of interruption.', rank: 3, maxMtdMinutes: 1440 },
    { code: 'medium', label: 'Moderate', description: 'The activity tolerates more than one day, up to three days of interruption.', rank: 2, maxMtdMinutes: 4320 },
    { code: 'low', label: 'Low', description: 'The activity tolerates more than three days of interruption.', rank: 1, maxMtdMinutes: null },
  ],
  businessMtdPresets: [240, 1440, 4320, 10080],
  cyberCriticalityLevels: [
    { code: 'low', label: 'Low', description: 'Limited, local consequences of a compromise.', rank: 1 },
    { code: 'moderate', label: 'Moderate', description: 'Significant but contained harm.', rank: 2 },
    { code: 'high', label: 'High', description: 'Major harm to data, an important activity or several systems.', rank: 3 },
    { code: 'critical', label: 'Critical', description: 'Catastrophic consequences, serious harm to people or the environment, or widespread compromise of information systems.', rank: 4 },
  ],
  dataClasses: [
    { code: 'public', label: 'Public', description: 'Information approved for public disclosure.', rank: 1 },
    { code: 'internal', label: 'Internal', description: 'Information intended for internal use; disclosure has limited consequences.', rank: 2 },
    { code: 'confidential', label: 'Confidential', description: 'Disclosure could cause significant harm; access is limited to authorised recipients.', rank: 3 },
    { code: 'restricted', label: 'Restricted', description: 'Disclosure could cause severe harm; access is strictly limited to those who need it.', rank: 4 },
  ],
  recoveryWaves: [
    { code: 'foundation', label: 'V0 — Foundation', description: 'Shared prerequisites and foundation services.', order: 0 },
    { code: 'vital', label: 'V1 — Vital activities', description: 'Restore vital activities after their prerequisites.', order: 1 },
    { code: 'priority', label: 'V2 — Priority activities', description: 'Restore priority activities.', order: 2 },
    { code: 'normal', label: 'V3 — Normal operation', description: 'Return to normal operation.', order: 3 },
  ],
  classificationVersions: { business: 1, cyber: 1, confidentiality: 1, recovery: 1 },
  classificationSettingsRevision: 1,
};

export const CLASSIFICATION_CATALOG_KEYS = ['businessCriticalityLevels', 'businessMtdPresets', 'cyberCriticalityLevels', 'dataClasses', 'recoveryWaves'] as const;
export const CATALOG_METADATA_KEYS = {
  businessCriticalityLevels: 'business_criticality_levels', businessMtdPresets: 'business_mtd_presets',
  cyberCriticalityLevels: 'cyber_criticality_levels', dataClasses: 'data_classes', recoveryWaves: 'recovery_waves',
  classificationVersions: 'classification_versions', classificationSettingsRevision: 'classification_settings_revision',
} as const;

export function catalogFromMetadata(raw: Record<string, any> = {}): ClassificationCatalog {
  const result = structuredClone(DEFAULT_CLASSIFICATION_CATALOG);
  for (const key of Object.keys(CATALOG_METADATA_KEYS) as Array<keyof ClassificationCatalog>) {
    if (raw[CATALOG_METADATA_KEYS[key]] !== undefined) (result as any)[key] = structuredClone(raw[CATALOG_METADATA_KEYS[key]]);
  }
  // Preserve the old confidentiality order when upgrading a customised tenant.
  result.dataClasses = result.dataClasses.map((item, index) => ({ ...item, rank: item.rank ?? index + 1, description: item.description ?? DEFAULT_CLASSIFICATION_CATALOG.dataClasses.find((d) => d.code === item.code)?.description ?? '' }));
  return result;
}

export function catalogToMetadata(catalog: ClassificationCatalog): Record<string, unknown> {
  return Object.fromEntries(Object.entries(CATALOG_METADATA_KEYS).map(([key, value]) => [value, catalog[key as keyof ClassificationCatalog]]));
}

export function validateDuration(value: unknown, field: string, allowZero = false): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < (allowZero ? 0 : 1) || value > 2147483647) {
    throw new BadRequestException(`${field} must be ${allowZero ? 'a non-negative' : 'a positive'} integer number of minutes, at most 2147483647, or null`);
  }
  return value;
}

export function validateBusinessMtdChoice(value: number | null, presets: number[], existing?: number | null): number | null {
  if (value === null || value === existing) return value;
  if (!presets.includes(value)) throw new BadRequestException(`business_mtd_minutes must be one of the tenant-configured presets (${presets.join(', ')}) or null`);
  return value;
}

export function validateClassificationCatalog(catalog: ClassificationCatalog): ClassificationCatalog {
  const next = structuredClone(catalog);
  for (const key of ['businessCriticalityLevels', 'cyberCriticalityLevels', 'dataClasses', 'recoveryWaves'] as const) {
    const list = next[key];
    if (!Array.isArray(list) || list.length === 0 || list.length > 100) throw new BadRequestException(`${key} requires 1 to 100 options`);
    const codes = new Set<string>();
    const ranks = new Set<number>();
    for (const item of list) {
      if (typeof item.code !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(item.code) || codes.has(item.code)) throw new BadRequestException(`${key}: codes must be unique, stable lowercase identifiers`);
      codes.add(item.code);
      if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 200 || typeof item.description !== 'string' || item.description.length > 4000) throw new BadRequestException(`${key}: label and description are required strings`);
      if (item.deprecated !== undefined && typeof item.deprecated !== 'boolean') throw new BadRequestException(`${key}: deprecated must be boolean`);
      const rank = 'order' in item ? item.order : item.rank;
      if (!Number.isInteger(rank) || rank < (key === 'recoveryWaves' ? 0 : 1) || rank > 2147483647 || ranks.has(rank)) throw new BadRequestException(`${key}: ranks/orders must be unique non-negative integers (severity starts at 1)`);
      ranks.add(rank);
      item.label = item.label.trim();
      item.description = item.description.trim();
    }
    if (!list.some((item) => !item.deprecated)) throw new BadRequestException(`${key}: at least one active option is required`);
  }
  const active = next.businessCriticalityLevels.filter((item) => !item.deprecated).sort((a, b) => b.rank - a.rank);
  let previous = 0;
  active.forEach((item, index) => {
    if (index === active.length - 1) {
      if (item.maxMtdMinutes !== null) throw new BadRequestException('The last business interval must be unbounded (maxMtdMinutes: null)');
    } else {
      const bound = validateDuration(item.maxMtdMinutes, 'maxMtdMinutes');
      if (bound === null || bound <= previous) throw new BadRequestException('Business thresholds must increase strictly as severity decreases');
      previous = bound;
    }
  });
  if (!Array.isArray(next.businessMtdPresets) || next.businessMtdPresets.length < 1 || next.businessMtdPresets.length > 30) throw new BadRequestException('businessMtdPresets must contain 1 to 30 allowed durations');
  next.businessMtdPresets.forEach((value) => { if (validateDuration(value, 'businessMtdPresets') === null) throw new BadRequestException('A duration preset cannot be null'); });
  if (new Set(next.businessMtdPresets).size !== next.businessMtdPresets.length) throw new BadRequestException('Duration presets must be unique');
  return next;
}

export function deriveBusinessCriticality(minutes: number | null, levels: BusinessCriticalityLevel[]): string | null {
  if (minutes === null) return null;
  validateDuration(minutes, 'business_mtd_minutes');
  const match = levels.filter((item) => !item.deprecated).sort((a, b) => b.rank - a.rank).find((item) => item.maxMtdMinutes === null || minutes <= item.maxMtdMinutes);
  if (!match) throw new BadRequestException('Business classification rules do not cover this duration');
  return match.code;
}

export function resolveClassificationOption(value: unknown, options: Array<{ code: string; label: string; deprecated?: boolean }>, existing?: string | null): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Classification must be a tenant code or unambiguous label; use null to clear it');
  const text = value.trim().toLowerCase();
  const code = options.find((item) => item.code.toLowerCase() === text);
  const matches = code ? [code] : options.filter((item) => item.label.trim().toLowerCase() === text);
  if (matches.length !== 1) throw new BadRequestException(`Unknown or ambiguous classification "${value}"; consult the tenant classification catalog`);
  if (matches[0].deprecated && matches[0].code !== existing) throw new BadRequestException(`Classification "${value}" is deprecated and cannot be newly assigned`);
  return matches[0].code;
}

export function highestClassification(values: Array<string | null | undefined>, levels: Array<{ code: string; rank: number }>): { code: string | null; incomplete: boolean } {
  const byCode = new Map(levels.map((item) => [item.code, item]));
  const known = values.flatMap((value) => value && byCode.has(value) ? [byCode.get(value)!] : []);
  return { code: known.sort((a, b) => b.rank - a.rank)[0]?.code ?? null, incomplete: known.length !== values.length || !values.length };
}

export function semanticCatalogValue(items: Array<Record<string, any>>): string {
  return JSON.stringify(items.map(({ label, ...item }) => ({ ...item, deprecated: !!item.deprecated })).sort((a, b) => String((a as any).code).localeCompare(String((b as any).code))));
}
