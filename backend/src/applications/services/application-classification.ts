import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClassificationCatalog, ClassificationVersions, deriveBusinessCriticality, resolveClassificationOption, validateBusinessMtdChoice, validateDuration } from '../../it-ops-settings/classification-catalog';

export type ClassificationReview = { user_id: string; reviewed_at: string; revision: number; versions: ClassificationVersions };
export const CLASSIFICATION_INPUT_FIELDS = ['business_mtd_minutes', 'cyber_criticality', 'data_class', 'recovery_wave', 'rto_minutes', 'rpo_minutes', 'classification_justification', 'contains_pii', 'last_dr_test'] as const;
export const CLASSIFICATION_SERVER_FIELDS = ['legacy_criticality', 'business_criticality_origin', 'classification_revision', 'classification_review', 'classification_review_state', 'classification_review_reason', 'classification_reviewed_at', 'classification_reviewer_name', 'classification_catalog_versions'] as const;

export function classificationPatch(input: Record<string, any>, existing: Record<string, any> | null, catalog: ClassificationCatalog): Record<string, any> {
  for (const field of CLASSIFICATION_SERVER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) throw new BadRequestException(`${field} is server-managed`);
  }
  if (input.expected_classification_revision !== undefined && input.expected_classification_revision !== (existing?.classification_revision ?? 0)) throw new ConflictException('Classification changed; reload before saving');
  if (input.expected_classification_versions !== undefined && !versionsEqual(input.expected_classification_versions, catalog.classificationVersions)) throw new ConflictException('Classification methodology changed; reload the catalog and preview again');
  const patch: Record<string, any> = {};
  for (const field of CLASSIFICATION_INPUT_FIELDS) {
    if (input[field] !== undefined) patch[field] = input[field];
    else if (!existing && !['contains_pii', 'last_dr_test'].includes(field)) patch[field] = null;
  }
  for (const field of ['business_mtd_minutes', 'rto_minutes', 'rpo_minutes']) {
    if (patch[field] !== undefined) patch[field] = validateDuration(patch[field], field, field === 'rpo_minutes');
  }
  if (patch.business_mtd_minutes !== undefined) validateBusinessMtdChoice(patch.business_mtd_minutes, catalog.businessMtdPresets, existing?.business_mtd_minutes);
  for (const [field, options] of [['cyber_criticality', catalog.cyberCriticalityLevels], ['data_class', catalog.dataClasses], ['recovery_wave', catalog.recoveryWaves]] as const) {
    if (patch[field] !== undefined) patch[field] = resolveClassificationOption(patch[field], options, existing?.[field]);
  }
  if (patch.classification_justification !== undefined && patch.classification_justification !== null) {
    if (typeof patch.classification_justification !== 'string' || patch.classification_justification.length > 8000) throw new BadRequestException('classification_justification must be text of at most 8000 characters or null');
    patch.classification_justification = patch.classification_justification.trim() || null;
  }
  if (patch.business_mtd_minutes !== undefined) {
    patch.criticality = deriveBusinessCriticality(patch.business_mtd_minutes, catalog.businessCriticalityLevels);
    patch.business_criticality_origin = patch.business_mtd_minutes === null ? 'unset' : 'derived';
  }
  if (input.criticality !== undefined) {
    const computed = patch.criticality !== undefined ? patch.criticality : existing?.criticality ?? null;
    // A read/export echo is accepted, but never becomes authoritative.
    if (input.criticality !== computed) throw new BadRequestException('criticality is calculated from business_mtd_minutes; provide the MTD in minutes instead of changing criticality');
  }
  const changed = Object.entries(patch).some(([key, value]) => comparable(value) !== comparable(existing?.[key] ?? null));
  patch.classification_revision = (existing?.classification_revision ?? 0) + (changed ? 1 : 0);
  if (!existing) { patch.classification_review = null; patch.legacy_criticality = null; }
  return patch;
}

function comparable(value: any): string { return value instanceof Date ? value.toISOString().slice(0, 10) : JSON.stringify(value); }
export function versionsEqual(a: ClassificationVersions, b: ClassificationVersions): boolean {
  return !!a && !!b && (['business', 'cyber', 'confidentiality', 'recovery'] as const).every((key) => a[key] === b[key]);
}
export function classificationReadState(app: Record<string, any>, catalog: ClassificationCatalog) {
  const complete = app.business_mtd_minutes != null && !!app.cyber_criticality && !!app.data_class && !!app.recovery_wave && !!app.classification_justification?.trim();
  const review = app.classification_review as ClassificationReview | null;
  const reason = !complete ? 'missing_fields' : !review ? 'never_reviewed' : review.revision !== app.classification_revision ? 'data_changed' : !versionsEqual(review.versions, catalog.classificationVersions) ? 'method_changed' : null;
  return {
    classification_review_state: !complete ? 'incomplete' : reason ? 'stale' : 'reviewed',
    classification_review_reason: reason,
    classification_reviewed_at: review?.reviewed_at ?? null,
    classification_catalog_versions: catalog.classificationVersions,
  };
}

export function copyClassification(source: Record<string, any>, catalog: ClassificationCatalog): Record<string, any> {
  const inputs = Object.fromEntries(CLASSIFICATION_INPUT_FIELDS.map((field) => [field, source[field] ?? null]));
  inputs.last_dr_test = null;
  // Existing deprecated decisions may be carried as historical values in a copy.
  const result = classificationPatch(inputs, source, catalog);
  return { ...inputs, ...result, criticality: source.business_mtd_minutes == null ? source.criticality ?? null : result.criticality,
    business_criticality_origin: source.business_mtd_minutes == null ? (source.criticality ? 'legacy' : 'unset') : 'derived',
    legacy_criticality: source.business_mtd_minutes == null ? source.legacy_criticality ?? source.criticality ?? null : null,
    classification_revision: 0, classification_review: null, last_dr_test: null };
}
