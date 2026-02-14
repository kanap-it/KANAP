-- ========================================
-- Check Performance Index Status
-- ========================================
--
-- This script checks which performance indexes exist
-- and reports their status and size.
--
-- USAGE:
--   psql -d appdb -U app -f scripts/check-index-status.sql
--
-- ========================================

\echo 'Checking performance index status...'
\echo ''

-- Create temp table with expected indexes
CREATE TEMP TABLE expected_indexes (index_name text, table_name text, description text);

INSERT INTO expected_indexes VALUES
  ('idx_spend_items_tenant_status', 'spend_items', 'Tenant + status filtering'),
  ('idx_spend_items_tenant_account', 'spend_items', 'Tenant + account filtering'),
  ('idx_spend_items_tenant_supplier', 'spend_items', 'Tenant + supplier filtering'),
  ('idx_spend_items_tenant_category', 'spend_items', 'Tenant + category filtering'),
  ('idx_spend_versions_tenant_item', 'spend_versions', 'Tenant + item lookup'),
  ('idx_spend_versions_tenant_year', 'spend_versions', 'Tenant + year filtering'),
  ('idx_spend_versions_tenant_item_year', 'spend_versions', 'Tenant + item + year'),
  ('idx_spend_amounts_tenant_version', 'spend_amounts', 'Tenant + version aggregation'),
  ('idx_spend_amounts_version_year', 'spend_amounts', 'Version + year filtering'),
  ('idx_spend_amounts_period', 'spend_amounts', 'Period-based queries'),
  ('idx_spend_allocations_tenant_version', 'spend_allocations', 'Tenant + version lookup'),
  ('idx_spend_allocations_tenant_company', 'spend_allocations', 'Tenant + company'),
  ('idx_spend_allocations_tenant_dept', 'spend_allocations', 'Tenant + department'),
  ('idx_spend_allocations_company_dept', 'spend_allocations', 'Company + department'),
  ('idx_spend_tasks_tenant_item', 'spend_tasks', 'Tenant + item lookup'),
  ('idx_spend_tasks_tenant_status', 'spend_tasks', 'Tenant + status filtering'),
  ('idx_spend_tasks_tenant_assignee', 'spend_tasks', 'Tenant + assignee'),
  ('idx_spend_tasks_due_date', 'spend_tasks', 'Due date filtering'),
  ('idx_contracts_tenant_status', 'contracts', 'Tenant + status'),
  ('idx_contracts_tenant_dates', 'contracts', 'Tenant + end_date'),
  ('idx_contract_spend_tenant_contract', 'contract_spend_items', 'Tenant + contract'),
  ('idx_contract_spend_tenant_item', 'contract_spend_items', 'Tenant + spend_item'),
  ('idx_contract_spend_item_created', 'contract_spend_items', 'Latest contract link'),
  ('idx_companies_tenant_status', 'companies', 'Tenant + status'),
  ('idx_departments_tenant_status', 'departments', 'Tenant + status'),
  ('idx_departments_tenant_company', 'departments', 'Tenant + company'),
  ('idx_company_metrics_tenant_company_year', 'company_metrics', 'Tenant + company + year'),
  ('idx_department_metrics_tenant_dept_year', 'department_metrics', 'Tenant + dept + year'),
  ('idx_company_metrics_tenant_year', 'company_metrics', 'Tenant + year'),
  ('idx_suppliers_tenant_status', 'suppliers', 'Tenant + status'),
  ('idx_accounts_tenant_status', 'accounts', 'Tenant + status'),
  ('idx_analytics_categories_tenant_status', 'analytics_categories', 'Tenant + status'),
  ('idx_capex_items_tenant_status', 'capex_items', 'Tenant + status'),
  ('idx_capex_items_tenant_account', 'capex_items', 'Tenant + account'),
  ('idx_capex_versions_tenant_item', 'capex_versions', 'Tenant + item'),
  ('idx_capex_versions_tenant_year', 'capex_versions', 'Tenant + year'),
  ('idx_capex_amounts_tenant_version', 'capex_amounts', 'Tenant + version'),
  ('idx_users_tenant_email', 'users', 'Tenant + email'),
  ('idx_users_tenant_company', 'users', 'Tenant + company'),
  ('idx_audit_log_tenant_table', 'audit_log', 'Tenant + table + date'),
  ('idx_audit_log_tenant_record', 'audit_log', 'Tenant + record history');

-- Report status
\echo 'Index Status Report:'
\echo '==================='
\echo ''

SELECT
  e.table_name,
  e.index_name,
  e.description,
  CASE
    WHEN i.indexname IS NOT NULL THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status,
  CASE
    WHEN i.indexname IS NOT NULL THEN pg_size_pretty(pg_relation_size(quote_ident(i.schemaname) || '.' || quote_ident(i.indexname)))
    ELSE '-'
  END as size
FROM expected_indexes e
LEFT JOIN pg_indexes i ON i.indexname = e.index_name
ORDER BY e.table_name, e.index_name;

\echo ''
\echo 'Summary:'
\echo '--------'

SELECT
  COUNT(*) FILTER (WHERE i.indexname IS NOT NULL) as existing_indexes,
  COUNT(*) FILTER (WHERE i.indexname IS NULL) as missing_indexes,
  COUNT(*) as total_expected
FROM expected_indexes e
LEFT JOIN pg_indexes i ON i.indexname = e.index_name;

\echo ''
\echo 'Total Index Size:'
\echo '-----------------'

SELECT
  pg_size_pretty(SUM(pg_relation_size(quote_ident(i.schemaname) || '.' || quote_ident(i.indexname)))) as total_size
FROM expected_indexes e
INNER JOIN pg_indexes i ON i.indexname = e.index_name;

\echo ''
\echo 'Most Critical Missing Indexes (if any):'
\echo '----------------------------------------'

SELECT
  e.table_name,
  e.index_name,
  e.description
FROM expected_indexes e
LEFT JOIN pg_indexes i ON i.indexname = e.index_name
WHERE i.indexname IS NULL
  AND e.index_name IN (
    'idx_spend_versions_tenant_item_year',
    'idx_spend_amounts_tenant_version',
    'idx_spend_allocations_tenant_version',
    'idx_company_metrics_tenant_company_year',
    'idx_contract_spend_item_created'
  )
ORDER BY e.table_name;

DROP TABLE expected_indexes;

\echo ''
\echo 'Done!'
