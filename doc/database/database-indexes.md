# Database Indexes - Complete Guide

**Quick Reference**: Apply core performance indexes to speed up OPEX/CAPEX summaries and chargeback reports by 90-95%.

---

## Quick Start

### What This Does

Adds five low-risk composite indexes that address the heaviest query patterns:
- OPEX grid year-over-year lookups
- Chargeback report aggregations
- Allocation and company metric joins

### How to Apply

**Automatic (Recommended)**:
```bash
cd infra
docker compose up -d --build api
```

The migration runs automatically during startup.

**Manual (Development)**:
```bash
cd backend
npm run typeorm migration:run
```

### Verify It Worked

```bash
# Check migration ran
docker logs cio-assistant-api-1 | grep "AddCorePerformanceIndexes"

# Check indexes exist
docker exec -it cio-assistant-db-1 psql -U app -d appdb -c "
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE indexname LIKE 'idx_%tenant%'
  AND schemaname = 'public';
"
```

Expected result: five new indexes:
- `idx_spend_versions_tenant_item_year`
- `idx_spend_versions_tenant_year`
- `idx_spend_amounts_version_period`
- `idx_spend_allocations_version`
- `idx_company_metrics_tenant_year_company`

### Expected Impact

**Before Indexes**:
- OPEX Summary (1000 items, 3 years): 5-15 seconds
- Chargeback Report (1 year): 10-30 seconds
- Sequential scans on large tables

**After Indexes**:
- OPEX Summary (1000 items, 3 years): 200-800ms (95%+ reduction)
- Chargeback Report (1 year): 500ms - 2 seconds (90%+ reduction)
- Index scans throughout

### Expected Downtime

- **Development**: None (no traffic)
- **Production**: 1-3 minutes during container restart

---

## Overview

This document explains the database indexing strategy for KANAP's multi-tenant PostgreSQL database. The current focus is on a small, low-risk set of indexes that targets the most frequently executed OPEX and chargeback queries.

### Migration File

**Migration**: `backend/src/migrations/1756700600000-add-core-performance-indexes.ts`

**Key features**:
- Adds five composite indexes aligned with hottest read paths
- Uses plain B-tree indexes without partial predicates or custom functions
- Safe to run in every environment; no behavioral changes
- All existing functionality continues to work as before

---

## Core Index Set

| Table             | Index Name                               | Columns                                | Purpose |
|-------------------|-------------------------------------------|----------------------------------------|---------|
| `spend_versions`  | `idx_spend_versions_tenant_item_year`     | `(tenant_id, spend_item_id, budget_year)` | Fast version lookups for OPEX and chargeback |
| `spend_versions`  | `idx_spend_versions_tenant_year`          | `(tenant_id, budget_year)`             | Efficient year-level scans for reports |
| `spend_amounts`   | `idx_spend_amounts_version_period`        | `(version_id, period)`                 | Aggregating monthly/annual totals per version |
| `spend_allocations` | `idx_spend_allocations_version`        | `(version_id)`                         | Fetching allocation shares when computing recipients |
| `company_metrics` | `idx_company_metrics_tenant_year_company` | `(tenant_id, fiscal_year, company_id)` | Retrieving headcount/metric data during chargeback |

These indexes were selected based on production traffic (OPEX edits with live totals, chargeback reports) and validated in QA/production.

### Index Sizes (Estimated)

| Table | Index | Size (MB) | Rows Covered |
|-------|-------|-----------|--------------|
| spend_items | tenant_status | 0.2 | 1,000 |
| spend_versions | tenant_item_year | 0.5 | 3,000 |
| spend_amounts | tenant_version | 2.0 | 36,000 |
| spend_allocations | tenant_version | 0.5 | 9,000 |
| company_metrics | tenant_company_year | 0.1 | 300 |

**Total estimated overhead**: ~15-20 MB per tenant

For 100 tenants: ~1.5-2 GB total index overhead

---

## Performance Impact

### Problem Statement

Users reported sluggish performance when:
1. Browsing the OPEX page (loading multi-year summaries, opening edit dialogs)
2. Generating chargeback reports (yearly aggregations with allocation breakdowns)

### Root Cause

The affected endpoints perform repeated joins/aggregations across:
- `spend_versions` (per-item, per-year versions)
- `spend_amounts` (monthly totals per version)
- `spend_allocations` (allocation recipients)
- `company_metrics` (headcount, IT users, turnover)

Without supporting indexes, PostgreSQL was forced into sequential scans, especially for year-based filters and version lookups.

### Solution Impact

| Operation | Expected Improvement |
|-----------|----------------------|
| **OPEX grid** | Version lookups and amount aggregation use index scans instead of full-table scans |
| **Chargeback reports** | Faster year discovery, less I/O when summing amounts, and quick metric joins |
| **Allocation recomputation** | Direct `version_id` index avoids scanning the entire allocations table |

Real-world timings vary, but QA/prod smoke-tests confirm lower latency and steadier resource usage with these five indexes alone.

---

## Operational Guidance

### When to Run the Migration

- Apply in QA first and re-run the OPEX list and chargeback reports
- Capture `EXPLAIN ANALYZE` traces if possible
- Promote to production during a quiet window
- Large tenants may benefit from off-peak deployments

### Monitoring Index Usage

Use `pg_stat_user_indexes` to confirm the new indexes receive scans after rollout:

```sql
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
);
```

### Verify Performance

Before migration (example):
```sql
EXPLAIN ANALYZE
SELECT * FROM spend_amounts WHERE version_id = '...';
-- Shows: Seq Scan on spend_amounts
```

After migration, PostgreSQL should switch to:
```
Index Scan using idx_spend_amounts_version_period
```

### Next Steps After Migration

1. **Smoke-test the OPEX list** – ensure summaries load correctly
2. **Run a chargeback report** – confirm totals match expectations
3. **Monitor `pg_stat_user_indexes`** – verify the new indexes register scans over the next day

---

## Rollback

### Removal / Rollback

- Migration `1756700500000-drop-performance-indexes.ts` removes the legacy "50+ index" set that was previously introduced
- To remove the new core indexes, run the `down` section of migration `1756700600000`

⚠️ Always double-check workload impact before dropping indexes in production.

### Rollback Procedure

```bash
cd backend
npm run typeorm migration:revert
```

Make sure `DropPerformanceIndexes1756700500000` has already been applied (it removes the earlier large index set). Reverting `AddCorePerformanceIndexes1756700600000` drops the five new indexes only.

---

## Maintenance

### Monitoring Index Usage

```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Identifying Unused Indexes

```sql
-- Find indexes with zero scans
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Vacuum and Analyze

After running the migration, update statistics:

```sql
VACUUM ANALYZE spend_items;
VACUUM ANALYZE spend_versions;
VACUUM ANALYZE spend_amounts;
VACUUM ANALYZE spend_allocations;
VACUUM ANALYZE companies;
VACUUM ANALYZE departments;
VACUUM ANALYZE company_metrics;
VACUUM ANALYZE department_metrics;
```

---

## Partial Index Strategy

Many indexes use `WHERE` clauses to reduce size:

```sql
-- Only index enabled items (status = 'disabled' is rare)
WHERE status = 'enabled'

-- Only index rows with data (NULLs are common)
WHERE supplier_id IS NOT NULL

-- Only index active tasks (completed tasks rarely queried)
WHERE status IN ('open', 'in_progress')
```

**Benefits**:
- 50-80% smaller indexes
- Faster index updates (fewer entries)
- Better cache hit rates
- PostgreSQL can still use these indexes for matching queries

---

## Future Optimization Opportunities

### 1. Covering Indexes

For frequently accessed columns, consider including them in the index:

```sql
CREATE INDEX idx_spend_items_tenant_status_covering
ON spend_items(tenant_id, status)
INCLUDE (product_name, account_id, supplier_id);
```

This allows index-only scans without touching the table heap.

### 2. Expression Indexes

For case-insensitive searches:

```sql
CREATE INDEX idx_spend_items_product_name_lower
ON spend_items(tenant_id, LOWER(product_name));
```

### 3. GIN Indexes

For full-text search on product_name or description:

```sql
CREATE INDEX idx_spend_items_fulltext
ON spend_items USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(description, '')));
```

### 4. Partitioning

For very large tenants (>100k items), consider partitioning by budget_year:

```sql
CREATE TABLE spend_amounts_2024 PARTITION OF spend_amounts
FOR VALUES IN (2024);

CREATE TABLE spend_amounts_2025 PARTITION OF spend_amounts
FOR VALUES IN (2025);
```

This improves query performance and enables efficient data archival.

---

## Troubleshooting

### Index Build Failures

If an index build fails:

```sql
-- Find invalid indexes
SELECT * FROM pg_indexes WHERE indexdef LIKE '%INVALID%';

-- Drop and recreate
DROP INDEX CONCURRENTLY idx_name;
CREATE INDEX CONCURRENTLY idx_name ON table_name(...);
```

### Bloated Indexes

After large updates/deletes:

```sql
-- Rebuild index without locking
REINDEX INDEX CONCURRENTLY idx_name;
```

### Lock Conflicts

If `CONCURRENTLY` operations hang:

```sql
-- Check for blocking locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill blocking query (use with caution)
SELECT pg_terminate_backend(pid);
```

### Migration Troubleshooting

**Migration Fails**:
Check logs:
```bash
docker logs cio-assistant-api-1
```

Common issues:
- **Duplicate index**: Index already exists (safe to ignore)
- **Lock timeout**: Retry once existing connections finish

### Monitoring Progress

During migration:

```bash
# Watch container logs
docker logs -f cio-assistant-api-1

# Or query database directly
docker exec -it cio-assistant-db-1 psql -U app -d appdb -c "
SELECT
  pid,
  now() - query_start as duration,
  state,
  LEFT(query, 100) as query
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%';
"
```

---

## Lessons Learned

- Keep index strategy driven by actual workload patterns; a focused set of well-chosen indexes can deliver most of the gain
- Use new migrations for new index sets so each rollout/rollback stays isolated
- Avoid partial indexes with non-immutable predicates in multi-tenant setups—stick to plain composite keys unless there's a proven need

---

## Grid Performance Indexes (Phase 1)

**Migration**: `backend/src/migrations/1763071695000-add-spend-items-grid-indexes.ts`

These indexes target the OPEX grid page and dashboard performance by optimizing common sorting and filtering operations on `spend_items`.

### Index Set

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| `spend_items` | `idx_spend_items_tenant_updated` | `(tenant_id, updated_at DESC)` | Dashboard recent updates widget, grid sorting by update date |
| `spend_items` | `idx_spend_items_tenant_created` | `(tenant_id, created_at DESC)` | Grid default sort order, filtering by creation date |
| `spend_items` | `idx_spend_items_tenant_owner_it` | `(tenant_id, owner_it_id)` | Filtering/sorting by IT owner |
| `spend_items` | `idx_spend_items_tenant_owner_business` | `(tenant_id, owner_business_id)` | Filtering/sorting by business owner |
| `spend_items` | `idx_spend_items_tenant_supplier` | `(tenant_id, supplier_id)` | Supplier-based filtering and analysis |
| `spend_items` | `idx_spend_items_tenant_account` | `(tenant_id, account_id)` | Chart of accounts filtering |
| `spend_items` | `idx_spend_items_tenant_category` | `(tenant_id, analytics_category_id)` | Category grouping and filtering |

### Rationale

**Problem:** After the initial tenant-based lookup, queries must perform sequential scans to:
- Sort by `updated_at` or `created_at`
- Filter by foreign keys (owner, supplier, account, category)
- Apply lifecycle filters (`disabled_at IS NULL OR disabled_at > NOW()`)

**Solution:** Composite indexes on `(tenant_id, column)` enable efficient sorting and filtering after tenant isolation.

**Why Full Indexes (Not Partial):**
- Application uses OR conditions: `disabled_at IS NULL OR disabled_at > NOW()`
- PostgreSQL won't use partial indexes with `WHERE disabled_at IS NULL` for these queries
- 98% of items have `disabled_at IS NULL`, so partial indexes save minimal space
- Full indexes ensure compatibility with all lifecycle queries

### Expected Impact

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Dashboard recent updates | Sequential scan | Index scan | 95%+ faster |
| OPEX grid sorted by date | Sequential scan | Index scan | 90%+ faster |
| Filter by owner/supplier | Sequential scan | Index scan | 85%+ faster |

### Index Sizes (Estimated)

- Each index: ~50-100 KB (current data volume)
- Total overhead: ~500 KB for all 7 indexes
- Write overhead: <1% (negligible at current scale)

### Verification

After deployment, verify indexes exist:

```sql
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelname)
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_spend_items_tenant_%'
ORDER BY indexname;
```

Monitor usage after rollout:

```sql
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_spend_items_tenant_%'
ORDER BY idx_scan DESC;
```

---

## Deployment & Verification

### Files Updated
```
backend/src/migrations/1756700600000-add-core-performance-indexes.ts
backend/src/migrations/1763071695000-add-spend-items-grid-indexes.ts
doc/database-indexes.md
```

### How It Rolls Out

1. **Trigger a deployment** (or restart the API container):
   ```bash
   cd infra
   docker compose up -d --build api
   ```
2. TypeORM executes pending migrations, creating the five indexes
3. Containers become healthy and serve traffic immediately after

### Verification

Check migration logs:

```bash
docker logs cio-api-1 | grep "AddCorePerformanceIndexes\|AddSpendItemsGridIndexes"
```

Output should include:
```
Running migration AddCorePerformanceIndexes1756700600000
Migration AddCorePerformanceIndexes1756700600000 has been executed successfully
Running migration AddSpendItemsGridIndexes1763071695000
Migration AddSpendItemsGridIndexes1763071695000 has been executed successfully
```

Confirm all indexes exist:

```bash
docker exec cio-db-1 psql -U app -d appdb -c "
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelname)
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_spend_versions_tenant_%'
    OR indexname LIKE 'idx_spend_amounts_version_%'
    OR indexname LIKE 'idx_spend_allocations_version%'
    OR indexname LIKE 'idx_company_metrics_tenant_%'
    OR indexname LIKE 'idx_spend_items_tenant_%')
ORDER BY indexname;
"
```

Expected: 12 indexes total (5 core + 7 grid)

Monitor usage after rollout:

```bash
docker exec cio-db-1 psql -U app -d appdb -c "
SELECT indexrelname, idx_scan, idx_tup_read,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_spend_%'
   OR indexrelname LIKE 'idx_company_metrics_%'
ORDER BY idx_scan DESC;
"
```

---

## References

- PostgreSQL Documentation: [Indexes](https://www.postgresql.org/docs/15/indexes.html)
- PostgreSQL Documentation: [Concurrent Indexes](https://www.postgresql.org/docs/15/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)
- Use The Index, Luke: [SQL Performance Explained](https://use-the-index-luke.com/)

---

## Change Log

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-10-10 | 1756700600000 | Core performance indexes (5 indexes on versions, amounts, allocations, metrics) |
| 2025-11-13 | 1763071695000 | Grid performance indexes (7 indexes on spend_items for sorting/filtering) |

---

**Status**: ✅ Complete
**Last Updated**: 2025-11-13
**Document Owner**: Infrastructure/Engineering Team
