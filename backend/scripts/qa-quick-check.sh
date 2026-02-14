#!/bin/bash

# ========================================
# QA Quick Check - Core Index Rollout
# ========================================

set -euo pipefail

DB_USER="${DB_USER:-app}"
DB_NAME="${DB_NAME:-appdb}"
API_CONTAINER="${API_CONTAINER:-$(docker ps -q -f name=api)}"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  QA Environment - Core Index Migration Quick Check     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "Configuration:"
echo "  Database User: $DB_USER"
echo "  Database Name: $DB_NAME"
echo "  API Container: ${API_CONTAINER:-<not found>}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. PostgreSQL Version"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -1
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Migration Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT timestamp, name
FROM migrations
WHERE timestamp IN (1756700500000, 1756700600000)
ORDER BY timestamp;
"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Expected Indexes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql -U "$DB_USER" -d "$DB_NAME" -c "
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
  CASE WHEN i.indexname IS NOT NULL THEN '✓ EXISTS'
       ELSE '✗ MISSING'
  END AS status
FROM expected e
LEFT JOIN pg_indexes i
  ON i.indexname = e.index_name AND i.schemaname = 'public'
ORDER BY e.index_name;
"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Index Usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql -U "$DB_USER" -d "$DB_NAME" -c "
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
"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Table Statistics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT relname AS table_name,
       last_analyze,
       last_autoanalyze,
       n_live_tup AS rows
FROM pg_stat_user_tables
WHERE relname IN ('spend_versions', 'spend_amounts', 'spend_allocations', 'company_metrics')
ORDER BY relname;
"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Recent API Errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "${API_CONTAINER:-}" ]; then
  docker logs "$API_CONTAINER" --tail 50 | grep -i "error" || echo "✓ No recent errors in API logs"
else
  echo "⚠ API container not detected (set API_CONTAINER environment variable)."
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MIGRATION_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM migrations
WHERE timestamp = 1756700600000;
" | xargs)

MISSING_INDEXES=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
WITH expected AS (
  SELECT unnest(ARRAY[
    'idx_spend_versions_tenant_item_year',
    'idx_spend_versions_tenant_year',
    'idx_spend_amounts_version_period',
    'idx_spend_allocations_version',
    'idx_company_metrics_tenant_year_company'
  ]) AS index_name
)
SELECT COUNT(*)
FROM expected e
LEFT JOIN pg_indexes i
  ON i.indexname = e.index_name AND i.schemaname = 'public'
WHERE i.indexname IS NULL;
" | xargs)

if [ "$MIGRATION_COUNT" = "0" ]; then
  echo "❌ Migration 1756700600000 has not run."
  echo "   Run migrations or restart the API container."
elif [ "$MISSING_INDEXES" -gt "0" ]; then
  echo "❌ Some core indexes are missing."
  echo "   Action:"
  echo "     DELETE FROM migrations WHERE timestamp IN (1756700500000, 1756700600000);"
  echo "     -- then rerun migrations / restart API container"
else
  echo "✓ Core index migration looks good."
  echo "   If performance issues persist, analyze query plans and consider VACUUM ANALYZE."
fi

echo ""
echo "Done."
