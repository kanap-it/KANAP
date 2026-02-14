-- ========================================
-- Core Performance Indexes (Concurrent build)
-- ========================================
--
-- Mirrors migration 1756700600000-add-core-performance-indexes.ts,
-- but uses CREATE INDEX CONCURRENTLY for zero-downtime maintenance.
--
-- Usage:
--   psql -d appdb -U app -f scripts/create-indexes-concurrently.sql
--
-- Notes:
--   - Each statement runs in its own transaction.
--   - Safe to execute while the application is online.
--   - Typically completes in under a minute per tenant.
--
-- ========================================

\echo 'Creating core performance indexes concurrently...'
\echo ''

\echo 'Creating spend_versions indexes...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spend_versions_tenant_item_year
  ON spend_versions(tenant_id, spend_item_id, budget_year);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spend_versions_tenant_year
  ON spend_versions(tenant_id, budget_year);

\echo 'Creating spend_amounts index...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spend_amounts_version_period
  ON spend_amounts(version_id, period);

\echo 'Creating spend_allocations index...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spend_allocations_version
  ON spend_allocations(version_id);

\echo 'Creating company_metrics index...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_metrics_tenant_year_company
  ON company_metrics(tenant_id, fiscal_year, company_id);

\echo ''
\echo 'Index creation complete.'
\echo 'Consider running VACUUM ANALYZE on the affected tables afterwards.'
