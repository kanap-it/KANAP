-- GLPI decoupling preflight checks.
--
-- Purpose:
--   Read-only evidence collection before running migration-sensitive parts of
--   planning/agentic-control-plane/36-glpi-decoupling-plan.md.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/scripts/glpi-decoupling-preflight.sql
--
-- Expected interpretation:
--   1. Review every non-empty result set before migrating settings/secrets,
--      renaming persisted discriminators, or changing public tool names.
--   2. This script intentionally returns metadata and booleans only; it never
--      selects encrypted token values.

\echo '== 0. Materializing tenant-scoped AI tables for RLS-safe read-only checks =='
--
-- Most AI tables are FORCE RLS. Running this preflight as the normal app role
-- without app.current_tenant would otherwise hide tenant rows and return false
-- zeroes. The temp tables below are session-local snapshots built by iterating
-- tenants with tenant context set. Production tables are only SELECTed.
SET client_min_messages TO warning;
DROP TABLE IF EXISTS pg_temp.ai_settings;
DROP TABLE IF EXISTS pg_temp.ai_adapter_configs;
DROP TABLE IF EXISTS pg_temp.ai_agent_definitions;
DROP TABLE IF EXISTS pg_temp.ai_agent_target_states;
DROP TABLE IF EXISTS pg_temp.ai_agent_work_items;
DROP TABLE IF EXISTS pg_temp.ai_approval_policies;
DROP TABLE IF EXISTS pg_temp.ai_evaluations;
DROP TABLE IF EXISTS pg_temp.ai_action_requests;
DROP TABLE IF EXISTS pg_temp.ai_observations;
DROP TABLE IF EXISTS pg_temp.ai_recommendations;
DROP TABLE IF EXISTS pg_temp.ai_mutation_previews;
DROP TABLE IF EXISTS pg_temp.ai_agent_triggers;
DROP TABLE IF EXISTS pg_temp.ai_autonomy_routines;
DROP TABLE IF EXISTS pg_temp.ai_autonomy_ceilings;
RESET client_min_messages;

CREATE TEMP TABLE ai_settings AS SELECT * FROM public.ai_settings WITH NO DATA;
CREATE TEMP TABLE ai_adapter_configs AS SELECT * FROM public.ai_adapter_configs WITH NO DATA;
CREATE TEMP TABLE ai_agent_definitions AS SELECT * FROM public.ai_agent_definitions WITH NO DATA;
CREATE TEMP TABLE ai_agent_target_states AS SELECT * FROM public.ai_agent_target_states WITH NO DATA;
CREATE TEMP TABLE ai_agent_work_items AS SELECT * FROM public.ai_agent_work_items WITH NO DATA;
CREATE TEMP TABLE ai_approval_policies AS SELECT * FROM public.ai_approval_policies WITH NO DATA;
CREATE TEMP TABLE ai_evaluations AS SELECT * FROM public.ai_evaluations WITH NO DATA;
CREATE TEMP TABLE ai_action_requests AS SELECT * FROM public.ai_action_requests WITH NO DATA;
CREATE TEMP TABLE ai_observations AS SELECT * FROM public.ai_observations WITH NO DATA;
CREATE TEMP TABLE ai_recommendations AS SELECT * FROM public.ai_recommendations WITH NO DATA;
CREATE TEMP TABLE ai_mutation_previews AS SELECT * FROM public.ai_mutation_previews WITH NO DATA;
CREATE TEMP TABLE ai_agent_triggers AS SELECT * FROM public.ai_agent_triggers WITH NO DATA;
CREATE TEMP TABLE ai_autonomy_routines AS SELECT * FROM public.ai_autonomy_routines WITH NO DATA;
CREATE TEMP TABLE ai_autonomy_ceilings AS SELECT * FROM public.ai_autonomy_ceilings WITH NO DATA;

DO $$
DECLARE
  tenant_row record;
BEGIN
  FOR tenant_row IN
    SELECT id, COALESCE(slug, '') AS slug
    FROM public.tenants
    ORDER BY slug NULLS LAST, id
  LOOP
    PERFORM set_config('app.current_tenant', tenant_row.id::text, true);
    PERFORM set_config('app.default_tenant_slug', tenant_row.slug, true);

    INSERT INTO pg_temp.ai_settings SELECT * FROM public.ai_settings WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_adapter_configs SELECT * FROM public.ai_adapter_configs WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_agent_definitions SELECT * FROM public.ai_agent_definitions WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_agent_target_states SELECT * FROM public.ai_agent_target_states WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_agent_work_items SELECT * FROM public.ai_agent_work_items WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_approval_policies SELECT * FROM public.ai_approval_policies WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_evaluations SELECT * FROM public.ai_evaluations WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_action_requests SELECT * FROM public.ai_action_requests WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_observations SELECT * FROM public.ai_observations WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_recommendations SELECT * FROM public.ai_recommendations WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_mutation_previews SELECT * FROM public.ai_mutation_previews WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_agent_triggers SELECT * FROM public.ai_agent_triggers WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_autonomy_routines SELECT * FROM public.ai_autonomy_routines WHERE tenant_id = tenant_row.id;
    INSERT INTO pg_temp.ai_autonomy_ceilings SELECT * FROM public.ai_autonomy_ceilings WHERE tenant_id = tenant_row.id;
  END LOOP;
END $$;

SELECT
  (SELECT count(*) FROM ai_settings) AS ai_settings_rows,
  (SELECT count(*) FROM ai_adapter_configs) AS ai_adapter_config_rows,
  (SELECT count(*) FROM ai_agent_definitions) AS ai_agent_definition_rows,
  (SELECT count(*) FROM ai_mutation_previews) AS ai_mutation_preview_rows;

\echo '== 1. Legacy GLPI settings and adapter-config coverage =='
SELECT
  t.id AS tenant_id,
  t.slug AS tenant_slug,
  COALESCE(s.glpi_enabled, false) AS legacy_glpi_enabled,
  s.glpi_url IS NOT NULL AS legacy_has_url,
  s.glpi_user_token_encrypted IS NOT NULL AS legacy_has_user_token,
  s.glpi_app_token_encrypted IS NOT NULL AS legacy_has_app_token,
  ac.id IS NOT NULL AS adapter_config_exists,
  ac.enabled AS adapter_config_enabled,
  ac.implementation AS adapter_implementation,
  ac.environment AS adapter_environment,
  ac.base_url IS NOT NULL AS adapter_has_base_url,
  ac.credential_ref_json->>'kind' AS adapter_credential_kind,
  ac.live_test_safety AS adapter_live_test_safety
FROM tenants t
LEFT JOIN ai_settings s
  ON s.tenant_id = t.id
LEFT JOIN ai_adapter_configs ac
  ON ac.tenant_id = t.id
  AND ac.provider_kind = 'ticketing'
  AND ac.provider_key = 'glpi'
WHERE COALESCE(s.glpi_enabled, false) = true
   OR s.glpi_url IS NOT NULL
   OR s.glpi_user_token_encrypted IS NOT NULL
   OR s.glpi_app_token_encrypted IS NOT NULL
   OR ac.id IS NOT NULL
ORDER BY t.slug NULLS LAST, t.id;

\echo '== 2. Legacy GLPI settings that cannot be migrated safely without operator input =='
SELECT
  t.id AS tenant_id,
  t.slug AS tenant_slug,
  COALESCE(s.glpi_enabled, false) AS legacy_glpi_enabled,
  s.glpi_url IS NULL AS missing_url,
  s.glpi_user_token_encrypted IS NULL AS missing_user_token,
  s.glpi_app_token_encrypted IS NULL AS missing_app_token,
  ac.id IS NOT NULL AS adapter_config_exists
FROM tenants t
JOIN ai_settings s
  ON s.tenant_id = t.id
LEFT JOIN ai_adapter_configs ac
  ON ac.tenant_id = t.id
  AND ac.provider_kind = 'ticketing'
  AND ac.provider_key = 'glpi'
WHERE COALESCE(s.glpi_enabled, false) = true
  AND (
    s.glpi_url IS NULL
    OR s.glpi_user_token_encrypted IS NULL
    OR ac.id IS NOT NULL
	  )
	ORDER BY t.slug NULLS LAST, t.id;

\echo '== 2b. Proposed adapter-config secret refs for legacy GLPI migration (no secret values) =='
WITH legacy AS (
  SELECT
    t.id AS tenant_id,
    t.slug AS tenant_slug,
    COALESCE(s.glpi_enabled, false) AS legacy_glpi_enabled,
    s.glpi_url IS NOT NULL AS legacy_has_url,
    s.glpi_user_token_encrypted IS NOT NULL AS legacy_has_user_token,
    s.glpi_app_token_encrypted IS NOT NULL AS legacy_has_app_token,
    ac.id IS NOT NULL AS adapter_config_exists,
    format('tenant/%s/ticketing/glpi', t.id) AS proposed_secret_ref
  FROM tenants t
  JOIN ai_settings s
    ON s.tenant_id = t.id
  LEFT JOIN ai_adapter_configs ac
    ON ac.tenant_id = t.id
    AND ac.provider_kind = 'ticketing'
    AND ac.provider_key = 'glpi'
  WHERE COALESCE(s.glpi_enabled, false) = true
     OR s.glpi_url IS NOT NULL
     OR s.glpi_user_token_encrypted IS NOT NULL
     OR s.glpi_app_token_encrypted IS NOT NULL
)
SELECT
  tenant_id,
  tenant_slug,
  legacy_glpi_enabled,
  legacy_has_url,
  legacy_has_user_token,
  legacy_has_app_token,
  adapter_config_exists,
  legacy_has_url
    AND legacy_has_user_token
    AND NOT adapter_config_exists AS adapter_upsert_ready,
  'ticketing' AS proposed_provider_kind,
  'glpi' AS proposed_provider_key,
  'glpi' AS proposed_implementation,
  'production' AS proposed_environment,
  proposed_secret_ref,
  'KANAP_SECRET_REF_' || upper(substr(encode(digest(tenant_id::text || ':' || proposed_secret_ref || ':', 'sha256'), 'hex'), 1, 32)) AS proposed_local_secret_env_var,
  jsonb_build_object(
    'kind', 'secret_ref',
    'ref', proposed_secret_ref,
    'tenant_id', tenant_id
  ) AS proposed_credential_ref_json,
  CASE
    WHEN legacy_has_app_token THEN jsonb_build_object(
      'glpi_user_token', '<required plaintext copied by operator from legacy secure store>',
      'glpi_app_token', '<optional plaintext copied by operator from legacy secure store>'
    )
    ELSE jsonb_build_object(
      'glpi_user_token', '<required plaintext copied by operator from legacy secure store>'
    )
  END AS required_secret_material_shape
FROM legacy
ORDER BY tenant_slug NULLS LAST, tenant_id;

\echo '== 3. Numeric-only status targeting predicates =='
WITH predicates AS (
  SELECT
    d.tenant_id,
    d.id AS agent_definition_id,
    d.agent_key,
    d.status AS agent_status,
    predicate.value AS predicate
  FROM ai_agent_definitions d
  CROSS JOIN LATERAL jsonb_path_query(COALESCE(d.scope_policy_json, '{}'::jsonb), '$.targeting.predicates[*]') AS predicate(value)
),
status_values AS (
  SELECT
    p.tenant_id,
    p.agent_definition_id,
    p.agent_key,
    p.agent_status,
    p.predicate,
    CASE
      WHEN jsonb_typeof(p.predicate->'value') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p.predicate->'value'))
      WHEN p.predicate ? 'value'
        THEN ARRAY[p.predicate->>'value']
      ELSE ARRAY[]::text[]
    END AS values
  FROM predicates p
  WHERE p.predicate->>'field' = 'status'
)
SELECT
  tenant_id,
  agent_definition_id,
  agent_key,
  agent_status,
  predicate,
  values AS numeric_values
FROM status_values
WHERE EXISTS (
  SELECT 1
  FROM unnest(values) AS item(value)
  WHERE item.value ~ '^[0-9]+$'
)
ORDER BY tenant_id, agent_key;

\echo '== 4. Target states likely misattributed to ticketing/glpi after provider-binding changes =='
SELECT
  ts.tenant_id,
  ts.id AS target_state_id,
  d.agent_key,
  d.provider_bindings_json#>>'{ticketing,provider_key}' AS bound_ticketing_provider_key,
  ts.provider_kind,
  ts.provider_key,
  ts.target_type,
  ts.target_ref,
  ts.claim_status,
  ts.updated_at
FROM ai_agent_target_states ts
JOIN ai_agent_definitions d
  ON d.id = ts.agent_definition_id
  AND d.tenant_id = ts.tenant_id
WHERE ts.provider_kind = 'ticketing'
  AND ts.provider_key = 'glpi'
  AND COALESCE(d.provider_bindings_json#>>'{ticketing,provider_key}', 'glpi') <> 'glpi'
ORDER BY ts.updated_at DESC;

\echo '== 5. Active work items likely misattributed to ticketing/glpi after provider-binding changes =='
SELECT
  wi.tenant_id,
  wi.id AS work_item_id,
  d.agent_key,
  d.provider_bindings_json#>>'{ticketing,provider_key}' AS bound_ticketing_provider_key,
  wi.source_provider_kind,
  wi.source_provider_key,
  wi.source_object_type,
  wi.source_object_ref,
  wi.status,
  wi.updated_at
FROM ai_agent_work_items wi
JOIN ai_agent_definitions d
  ON d.id = wi.agent_definition_id
  AND d.tenant_id = wi.tenant_id
WHERE wi.source_provider_kind = 'ticketing'
  AND wi.source_provider_key = 'glpi'
  AND wi.status NOT IN ('completed', 'skipped', 'dead_letter')
  AND COALESCE(d.provider_bindings_json#>>'{ticketing,provider_key}', 'glpi') <> 'glpi'
ORDER BY wi.updated_at DESC;

\echo '== 6. Open earned-autonomy grants tied to GLPI-branded agent keys or providers =='
SELECT
  p.tenant_id,
  p.id AS policy_id,
  p.policy_key,
  p.status,
  p.enabled,
  p.capability_name,
  p.provider_kind,
  p.provider_key,
  p.environment,
  p.metadata_json->>'agent_definition_id' AS agent_definition_id,
  p.metadata_json->>'agent_key' AS agent_key,
  p.updated_at
FROM ai_approval_policies p
WHERE p.enabled = true
  AND p.status = 'enabled'
  AND (
    p.policy_key LIKE 'agent-autonomy:%'
    OR p.metadata_json->>'created_by' = 'agent_autonomy_grant'
  )
  AND (
    p.provider_key = 'glpi'
    OR p.metadata_json->>'agent_key' LIKE 'helpdesk.glpi.%'
  )
ORDER BY p.updated_at DESC;

\echo '== 7. Pending GLPI-triage evaluations that can be reset by discriminator renames =='
SELECT
  e.tenant_id,
  e.id AS evaluation_id,
  e.status,
  e.outcome,
  e.metadata_json->>'evaluation_type' AS evaluation_type,
  e.metadata_json->>'action_request_id' AS action_request_id,
  e.metadata_json->>'action_class' AS action_class,
  e.metadata_json->>'target_ref' AS target_ref,
  e.created_at,
  e.updated_at
FROM ai_evaluations e
WHERE e.metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
  AND e.status NOT IN ('completed', 'failed', 'cancelled', 'expired')
ORDER BY e.created_at DESC;

\echo '== 8. GLPI ingestion scheduler row and possible operator cron/enabled overrides =='
SELECT
  name,
  description,
  cron_expression,
  enabled,
  last_run_at,
  last_status,
  updated_at
FROM scheduled_tasks
WHERE name IN ('ai-helpdesk-glpi-new-ticket-ingestion')
   OR name LIKE '%glpi%'
ORDER BY name;

\echo '== 9. Legacy GLPI workflow/action metadata rows (sample, newest first) =='
SELECT
  tenant_id,
  id AS action_request_id,
  status,
  capability_name,
  provider_kind,
  provider_key,
  target_type,
  target_ref,
  metadata_json->>'uat_workflow' AS uat_workflow,
  metadata_json->>'source_endpoint' AS source_endpoint,
  created_at,
  updated_at
FROM ai_action_requests
WHERE metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')
   OR metadata_json->>'source_endpoint' = 'uat/glpi-triage'
ORDER BY created_at DESC
LIMIT 100;

\echo '== 10. Legacy GLPI observation/recommendation/evaluation discriminator rows (sample, newest first) =='
WITH discriminator_rows AS (
  SELECT
    'observation' AS row_kind,
    tenant_id,
    id::text AS row_id,
    status,
    observation_type AS discriminator,
    run_id::text AS run_id,
    source_provider AS provider_or_scope,
    source_object_type AS object_type,
    source_object_id AS object_ref,
    created_at,
    updated_at
  FROM ai_observations
  WHERE observation_type = 'glpi_ticket_triage'

  UNION ALL

  SELECT
    'recommendation' AS row_kind,
    tenant_id,
    id::text AS row_id,
    status,
    recommendation_type AS discriminator,
    run_id::text AS run_id,
    metadata_json->>'source_provider' AS provider_or_scope,
    metadata_json->>'target_type' AS object_type,
    metadata_json->>'target_ref' AS object_ref,
    created_at,
    updated_at
  FROM ai_recommendations
  WHERE recommendation_type = 'glpi_triage_actions'

  UNION ALL

  SELECT
    'evaluation' AS row_kind,
    tenant_id,
    id::text AS row_id,
    status,
    metadata_json->>'evaluation_type' AS discriminator,
    run_id::text AS run_id,
    metadata_json->>'workflow' AS provider_or_scope,
    metadata_json->>'target_type' AS object_type,
    metadata_json->>'target_ref' AS object_ref,
    created_at,
    updated_at
  FROM ai_evaluations
  WHERE metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
)
SELECT *
FROM discriminator_rows
ORDER BY created_at DESC
LIMIT 100;

\echo '== 11. Legacy import_glpi_ticket previews and generic-metadata coverage (sample, newest first) =='
SELECT
  tenant_id,
  id AS preview_id,
  status,
  tool_name,
  mutation_input ? 'ticket_provider_key' AS mutation_has_ticket_provider_key,
  COALESCE(current_values, '{}'::jsonb) ? 'ticket_provider_key' AS current_has_ticket_provider_key,
  mutation_input ? 'ticket_id' AS mutation_has_ticket_id,
  COALESCE(current_values, '{}'::jsonb) ? 'ticket_id' AS current_has_ticket_id,
  mutation_input ? 'glpi_ticket_id' AS mutation_has_glpi_ticket_id,
  COALESCE(current_values, '{}'::jsonb) ? 'glpi_ticket_id' AS current_has_glpi_ticket_id,
  expires_at,
  created_at
FROM ai_mutation_previews
WHERE tool_name IN ('import_glpi_ticket', 'import_ticket')
  AND (
    tool_name = 'import_glpi_ticket'
    OR NOT (mutation_input ? 'ticket_provider_key')
    OR NOT (COALESCE(current_values, '{}'::jsonb) ? 'ticket_provider_key')
    OR NOT (mutation_input ? 'ticket_id')
    OR NOT (COALESCE(current_values, '{}'::jsonb) ? 'ticket_id')
  )
ORDER BY created_at DESC
LIMIT 100;

\echo '== 12. GLPI-branded helpdesk definitions/triggers that need rename timing =='
SELECT
  d.tenant_id,
  d.id AS agent_definition_id,
  d.agent_key,
  d.status AS agent_status,
  d.environment,
  d.provider_bindings_json#>>'{ticketing,provider_key}' AS bound_ticketing_provider_key,
  d.scope_policy_json#>>'{provider_key}' AS scope_provider_key,
  t.id AS trigger_id,
  t.trigger_key,
  t.status AS trigger_status,
  t.enabled AS trigger_enabled,
  t.scope_policy_json#>>'{provider_key}' AS trigger_scope_provider_key,
  GREATEST(d.updated_at, COALESCE(t.updated_at, d.updated_at)) AS last_updated_at
FROM ai_agent_definitions d
LEFT JOIN ai_agent_triggers t
  ON t.tenant_id = d.tenant_id
  AND t.agent_definition_id = d.id
WHERE d.agent_key LIKE 'helpdesk.glpi.%'
   OR d.provider_bindings_json#>>'{ticketing,provider_key}' = 'glpi'
   OR d.scope_policy_json#>>'{provider_key}' = 'glpi'
   OR t.scope_policy_json#>>'{provider_key}' = 'glpi'
ORDER BY last_updated_at DESC;

\echo '== 13. Enabled autonomy routines/ceilings tied to GLPI provider keys =='
SELECT
  'routine' AS row_kind,
  tenant_id,
  id::text AS row_id,
  routine_key AS row_key,
  enabled,
  provider_key,
  workflow_type AS scope,
  last_triggered_at,
  updated_at
FROM ai_autonomy_routines
WHERE enabled = true
  AND provider_key = 'glpi'

UNION ALL

SELECT
  'ceiling' AS row_kind,
  tenant_id,
  id::text AS row_id,
  scope AS row_key,
  enabled,
  provider_key,
  COALESCE(capability_name, environment, scope) AS scope,
  NULL::timestamptz AS last_triggered_at,
  updated_at
FROM ai_autonomy_ceilings
WHERE enabled = true
  AND provider_key = 'glpi'

ORDER BY updated_at DESC;

\echo '== 14. Summary counts for go/no-go review =='
WITH
legacy_settings AS (
  SELECT count(*)::int AS count
  FROM ai_settings
  WHERE COALESCE(glpi_enabled, false) = true
     OR glpi_url IS NOT NULL
     OR glpi_user_token_encrypted IS NOT NULL
     OR glpi_app_token_encrypted IS NOT NULL
),
adapter_configs AS (
  SELECT count(*)::int AS count
  FROM ai_adapter_configs
  WHERE provider_kind = 'ticketing'
    AND provider_key = 'glpi'
),
numeric_predicates AS (
  SELECT count(*)::int AS count
  FROM (
    SELECT 1
    FROM ai_agent_definitions d
    CROSS JOIN LATERAL jsonb_path_query(COALESCE(d.scope_policy_json, '{}'::jsonb), '$.targeting.predicates[*]') AS predicate(value)
    WHERE predicate.value->>'field' = 'status'
      AND (
        (jsonb_typeof(predicate.value->'value') = 'string' AND predicate.value->>'value' ~ '^[0-9]+$')
        OR (
          jsonb_typeof(predicate.value->'value') = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(predicate.value->'value') AS item(value)
            WHERE item.value ~ '^[0-9]+$'
          )
        )
      )
  ) rows
),
misattributed_target_states AS (
  SELECT count(*)::int AS count
  FROM ai_agent_target_states ts
  JOIN ai_agent_definitions d
    ON d.id = ts.agent_definition_id
    AND d.tenant_id = ts.tenant_id
  WHERE ts.provider_kind = 'ticketing'
    AND ts.provider_key = 'glpi'
    AND COALESCE(d.provider_bindings_json#>>'{ticketing,provider_key}', 'glpi') <> 'glpi'
),
earned_autonomy AS (
  SELECT count(*)::int AS count
  FROM ai_approval_policies p
  WHERE p.enabled = true
    AND p.status = 'enabled'
    AND (
      p.policy_key LIKE 'agent-autonomy:%'
      OR p.metadata_json->>'created_by' = 'agent_autonomy_grant'
    )
    AND (
      p.provider_key = 'glpi'
      OR p.metadata_json->>'agent_key' LIKE 'helpdesk.glpi.%'
    )
),
legacy_workflows AS (
  SELECT count(*)::int AS count
  FROM ai_action_requests
  WHERE metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')
     OR metadata_json->>'source_endpoint' = 'uat/glpi-triage'
),
legacy_observations AS (
  SELECT count(*)::int AS count
  FROM ai_observations
  WHERE observation_type = 'glpi_ticket_triage'
),
legacy_recommendations AS (
  SELECT count(*)::int AS count
  FROM ai_recommendations
  WHERE recommendation_type = 'glpi_triage_actions'
),
legacy_evaluations AS (
  SELECT count(*)::int AS count
  FROM ai_evaluations
  WHERE metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
),
legacy_import_previews AS (
  SELECT count(*)::int AS count
  FROM ai_mutation_previews
  WHERE tool_name = 'import_glpi_ticket'
),
generic_import_previews_missing_metadata AS (
  SELECT count(*)::int AS count
  FROM ai_mutation_previews
  WHERE tool_name = 'import_ticket'
    AND (
      NOT (mutation_input ? 'ticket_provider_key')
      OR NOT (COALESCE(current_values, '{}'::jsonb) ? 'ticket_provider_key')
      OR NOT (mutation_input ? 'ticket_id')
      OR NOT (COALESCE(current_values, '{}'::jsonb) ? 'ticket_id')
    )
),
glpi_branded_definitions AS (
  SELECT count(*)::int AS count
  FROM ai_agent_definitions d
  WHERE d.agent_key LIKE 'helpdesk.glpi.%'
     OR d.provider_bindings_json#>>'{ticketing,provider_key}' = 'glpi'
     OR d.scope_policy_json#>>'{provider_key}' = 'glpi'
),
glpi_autonomy_routines AS (
  SELECT count(*)::int AS count
  FROM ai_autonomy_routines
  WHERE enabled = true
    AND provider_key = 'glpi'
),
glpi_autonomy_ceilings AS (
  SELECT count(*)::int AS count
  FROM ai_autonomy_ceilings
  WHERE enabled = true
    AND provider_key = 'glpi'
)
SELECT 'legacy_glpi_settings' AS check_name, count FROM legacy_settings
UNION ALL SELECT 'ticketing_glpi_adapter_configs', count FROM adapter_configs
UNION ALL SELECT 'numeric_status_predicates', count FROM numeric_predicates
UNION ALL SELECT 'misattributed_target_states', count FROM misattributed_target_states
UNION ALL SELECT 'glpi_earned_autonomy_policies', count FROM earned_autonomy
UNION ALL SELECT 'legacy_glpi_action_workflows', count FROM legacy_workflows
UNION ALL SELECT 'legacy_glpi_observations', count FROM legacy_observations
UNION ALL SELECT 'legacy_glpi_recommendations', count FROM legacy_recommendations
UNION ALL SELECT 'legacy_glpi_evaluations', count FROM legacy_evaluations
UNION ALL SELECT 'legacy_import_glpi_ticket_previews', count FROM legacy_import_previews
UNION ALL SELECT 'generic_import_previews_missing_metadata', count FROM generic_import_previews_missing_metadata
UNION ALL SELECT 'glpi_branded_agent_definitions', count FROM glpi_branded_definitions
UNION ALL SELECT 'enabled_glpi_autonomy_routines', count FROM glpi_autonomy_routines
UNION ALL SELECT 'enabled_glpi_autonomy_ceilings', count FROM glpi_autonomy_ceilings
ORDER BY check_name;
