-- ========================================
-- Core Performance Index Diagnostics (QA)
-- ========================================
--
-- Usage:
--   psql -d appdb -U app -f scripts/diagnose-qa-indexes.sql
--
-- This script verifies that the current index rollout
-- (drop 1756700500000 + add 1756700600000) has been applied
-- and checks for the presence/usage of the five core indexes.
-- ========================================

\echo ''
\echo '====================================================='
\echo 'Core Performance Index Diagnostics (QA)'
\echo '====================================================='
\echo ''

-- 1. Migration status
\echo '1. Migration Status:'
\echo '-------------------'
SELECT timestamp, name
FROM migrations
WHERE timestamp IN (1756700500000, 1756700600000)
ORDER BY timestamp;

\echo ''
\echo '2. Expected Indexes:'
\echo '--------------------'
WITH expected AS (
  SELECT unnest(ARRAY[
    'idx_spend_versions_tenant_item_year',
    'idx_spend_versions_tenant_year',
    'idx_spend_amounts_version_period',
    'idx_spend_allocations_version',
    'idx_company_metrics_tenant_year_company'
  ]) AS index_name
)
SELECT
  e.index_name,
  CASE WHEN i.indexname IS NOT NULL THEN '✓ exists'
       ELSE '✗ missing'
  END AS status
FROM expected e
LEFT JOIN pg_indexes i
  ON i.indexname = e.index_name AND i.schemaname = 'public'
ORDER BY e.index_name;

\echo ''
\echo '3. Index Usage (pg_stat_user_indexes):'
\echo '-------------------------------------'
SELECT indexrelname,
       idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexrelname IN (
  'idx_spend_versions_tenant_item_year',
  'idx_spend_versions_tenant_year',
  'idx_spend_amounts_version_period',
  'idx_spend_allocations_version',
  'idx_company_metrics_tenant_year_company'
)
ORDER BY indexrelname;

\echo ''
\echo '4. Table statistics (consider VACUUM ANALYZE if stale):'
\echo '------------------------------------------------------'
SELECT schemaname,
       tablename,
       last_analyze,
       last_autoanalyze,
       n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE tablename IN (
  'spend_versions',
  'spend_amounts',
  'spend_allocations',
  'company_metrics'
)
ORDER BY tablename;

\echo ''
\echo '5. Suggested Fixes:'
\echo '-------------------'
\echo ''
\echo 'If indexes are missing:'
\echo '  npm run typeorm migration:run'
\echo ''
\echo 'If migration entries are incorrect:'
\echo '  DELETE FROM migrations WHERE timestamp IN (1756700500000, 1756700600000);'
\echo '  -- then rerun migrations / restart API container'
\echo ''
\echo 'If indexes exist but queries remain slow:'
\echo '  VACUUM ANALYZE spend_versions;'
\echo '  VACUUM ANALYZE spend_amounts;'
\echo '  VACUUM ANALYZE spend_allocations;'
\echo '  VACUUM ANALYZE company_metrics;'
\echo ''
\echo '====================================================='
\echo 'Diagnostics Complete'
\echo '====================================================='
\echo ''
