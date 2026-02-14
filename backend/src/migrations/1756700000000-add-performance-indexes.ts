import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1756700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1756700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration does NOT use  to work with TypeORM's transactional migrations.
    // For zero-downtime production updates, use the separate script: scripts/create-indexes-concurrently.sql
    // This version will briefly lock tables during index creation but works in automated deployments.

    // ========================================
    // SPEND_ITEMS - OPEX grid performance
    // ========================================

    // Composite index for tenant-filtered queries with status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_status
      ON spend_items(tenant_id, status)
      WHERE status = 'enabled'
    `);

    // Composite index for tenant + account filtering (common in reports)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_account
      ON spend_items(tenant_id, account_id)
    `);

    // Composite index for tenant + supplier filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_supplier
      ON spend_items(tenant_id, supplier_id)
      WHERE supplier_id IS NOT NULL
    `);

    // Composite index for tenant + analytics category (for filtering by category)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_category
      ON spend_items(tenant_id, analytics_category_id)
      WHERE analytics_category_id IS NOT NULL
    `);

    // ========================================
    // SPEND_VERSIONS - Critical for all OPEX queries
    // ========================================

    // Most critical: tenant + item_id for fetching item versions
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_versions_tenant_item
      ON spend_versions(tenant_id, spend_item_id)
    `);

    // Critical for budget operations and year-based filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_versions_tenant_year
      ON spend_versions(tenant_id, budget_year)
    `);

    // Composite for tenant + item + year (used in summary endpoint)
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_versions_tenant_item_year
      ON spend_versions(tenant_id, spend_item_id, budget_year)
    `);

    // ========================================
    // SPEND_AMOUNTS - Heavy aggregations
    // ========================================

    // Enhanced version of existing index with tenant isolation
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_amounts_tenant_version
      ON spend_amounts(tenant_id, version_id)
    `);

    // Critical for year-based aggregations (chargeback reports)
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_amounts_version_year
      ON spend_amounts(version_id, period)
      WHERE planned IS NOT NULL OR committed IS NOT NULL OR actual IS NOT NULL OR expected_landing IS NOT NULL
    `);

    // For date range queries and period-based filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_amounts_period
      ON spend_amounts(period)
    `);

    // ========================================
    // SPEND_ALLOCATIONS - Chargeback reports
    // ========================================

    // Enhanced for tenant-aware allocation queries
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_allocations_tenant_version
      ON spend_allocations(tenant_id, version_id)
    `);

    // For company-level chargeback reports
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_allocations_tenant_company
      ON spend_allocations(tenant_id, company_id)
    `);

    // For department-level drill-down
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_allocations_tenant_dept
      ON spend_allocations(tenant_id, department_id)
      WHERE department_id IS NOT NULL
    `);

    // Composite for company + department filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_allocations_company_dept
      ON spend_allocations(company_id, department_id)
    `);

    // ========================================
    // SPEND_TASKS - Task list performance
    // ========================================

    // Composite for tenant + item (fetching tasks for specific items)
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_tasks_tenant_item
      ON spend_tasks(tenant_id, item_id)
    `);

    // Enhanced status index for tenant-aware filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_tasks_tenant_status
      ON spend_tasks(tenant_id, status)
      WHERE status IN ('open', 'in_progress')
    `);

    // For assignee-based filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_tasks_tenant_assignee
      ON spend_tasks(tenant_id, assignee_user_id)
      WHERE assignee_user_id IS NOT NULL
    `);

    // For due date sorting and filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_spend_tasks_due_date
      ON spend_tasks(tenant_id, due_date)
      WHERE due_date IS NOT NULL AND status IN ('open', 'in_progress')
    `);

    // ========================================
    // CONTRACTS - Contract-spend item linking
    // ========================================

    // Composite for tenant-aware contract queries
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_contracts_tenant_status
      ON contracts(tenant_id, status)
    `);

    // For date-based filtering (renewal tracking)
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_contracts_tenant_start_date
      ON contracts(tenant_id, start_date)
    `);

    // ========================================
    // CONTRACT_SPEND_ITEMS - Join performance
    // ========================================

    // Enhanced for tenant-aware queries
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_contract_spend_tenant_contract
      ON contract_spend_items(tenant_id, contract_id)
    `);

    // For reverse lookup (spend item -> contracts)
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_contract_spend_tenant_item
      ON contract_spend_items(tenant_id, spend_item_id)
    `);

    // For finding latest contract link per item
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_contract_spend_item_created
      ON contract_spend_items(spend_item_id, created_at DESC)
    `);

    // ========================================
    // COMPANIES & DEPARTMENTS
    // ========================================

    // Composite for tenant + status filtering
    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_companies_tenant_status
      ON companies(tenant_id, status)
      WHERE status = 'enabled'
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_departments_tenant_status
      ON departments(tenant_id, status)
      WHERE status = 'enabled'
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_departments_tenant_company
      ON departments(tenant_id, company_id)
      WHERE company_id IS NOT NULL
    `);

    // ========================================
    // METRICS
    // ========================================

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_company_metrics_tenant_company_year
      ON company_metrics(tenant_id, company_id, fiscal_year)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_company_metrics_tenant_year
      ON company_metrics(tenant_id, fiscal_year)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_department_metrics_tenant_dept_year
      ON department_metrics(tenant_id, department_id, fiscal_year)
    `);

    // ========================================
    // SUPPLIERS & ACCOUNTS
    // ========================================

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_suppliers_tenant_status
      ON suppliers(tenant_id, status)
      WHERE status = 'enabled'
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_accounts_tenant_status
      ON accounts(tenant_id, status)
      WHERE status = 'enabled'
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_analytics_categories_tenant_status
      ON analytics_categories(tenant_id, status)
      WHERE status = 'enabled'
    `);

    // ========================================
    // CAPEX tables (similar patterns)
    // ========================================

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_capex_items_tenant_status
      ON capex_items(tenant_id, status)
      WHERE status = 'enabled'
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_capex_versions_tenant_item
      ON capex_versions(tenant_id, capex_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_capex_versions_tenant_year
      ON capex_versions(tenant_id, budget_year)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_capex_amounts_tenant_version
      ON capex_amounts(tenant_id, version_id)
    `);

    // ========================================
    // USERS - Lookup performance
    // ========================================

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_users_tenant_email
      ON users(tenant_id, email)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_users_tenant_company
      ON users(tenant_id, company_id)
      WHERE company_id IS NOT NULL
    `);

    // ========================================
    // AUDIT_LOG - Historical queries
    // ========================================

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_audit_log_tenant_table
      ON audit_log(tenant_id, table_name, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX  IF NOT EXISTS idx_audit_log_tenant_record
      ON audit_log(tenant_id, table_name, record_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_audit_log_tenant_record`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_audit_log_tenant_table`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_users_tenant_company`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_users_tenant_email`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_capex_amounts_tenant_version`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_capex_versions_tenant_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_capex_versions_tenant_item`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_capex_items_tenant_status`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_analytics_categories_tenant_status`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_accounts_tenant_status`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_suppliers_tenant_status`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_company_metrics_tenant_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_department_metrics_tenant_dept_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_company_metrics_tenant_company_year`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_departments_tenant_company`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_departments_tenant_status`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_companies_tenant_status`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_contract_spend_item_created`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_contract_spend_tenant_item`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_contract_spend_tenant_contract`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_contracts_tenant_start_date`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_contracts_tenant_status`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_tasks_due_date`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_tasks_tenant_assignee`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_tasks_tenant_status`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_tasks_tenant_item`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_allocations_company_dept`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_allocations_tenant_dept`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_allocations_tenant_company`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_allocations_tenant_version`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_amounts_period`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_amounts_version_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_amounts_tenant_version`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_versions_tenant_item_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_versions_tenant_year`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_versions_tenant_item`);

    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_items_tenant_category`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_items_tenant_supplier`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_items_tenant_account`);
    await queryRunner.query(`DROP INDEX  IF EXISTS idx_spend_items_tenant_status`);
  }
}
