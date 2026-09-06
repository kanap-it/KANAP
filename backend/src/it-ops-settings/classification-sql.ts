/** SQL shared by scoped application lists, exports and Plaid. Alias must be code-owned. */
export function classificationSqlExpressions(alias = 'a'): Record<string, string> {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new Error('Invalid classification SQL alias');
  const a = alias;
  const rank = (field: string, catalog: string, property = 'rank') => `(SELECT (level->>'${property}')::integer FROM tenants classification_tenant CROSS JOIN LATERAL jsonb_array_elements(classification_tenant.metadata->'it_ops'->'${catalog}') level WHERE classification_tenant.id = ${a}.tenant_id AND level->>'code' = ${a}.${field} LIMIT 1)`;
  const complete = `${a}.business_mtd_minutes IS NOT NULL AND ${a}.cyber_criticality IS NOT NULL AND ${a}.data_class IS NOT NULL AND ${a}.recovery_wave IS NOT NULL AND NULLIF(BTRIM(${a}.classification_justification), '') IS NOT NULL`;
  const versions = `(SELECT classification_tenant.metadata->'it_ops'->'classification_versions' FROM tenants classification_tenant WHERE classification_tenant.id = ${a}.tenant_id)`;
  return {
    criticality_rank: rank('criticality', 'business_criticality_levels'),
    business_criticality_rank: rank('criticality', 'business_criticality_levels'),
    cyber_criticality_rank: rank('cyber_criticality', 'cyber_criticality_levels'),
    data_class_rank: rank('data_class', 'data_classes'),
    recovery_wave_order: rank('recovery_wave', 'recovery_waves', 'order'),
    classification_review_state: `(CASE WHEN NOT (${complete}) THEN 'incomplete' WHEN ${a}.classification_review IS NOT NULL AND (${a}.classification_review->>'revision')::integer = ${a}.classification_revision AND ${a}.classification_review->'versions' = ${versions} THEN 'reviewed' ELSE 'stale' END)`,
    classification_reviewed_at: `(${a}.classification_review->>'reviewed_at')::timestamptz`,
  };
}
