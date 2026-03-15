---
description: Generate documentation for multiple pages in batch (project)
allowed-tools: Read, Glob, Grep, Write, Edit, Task
argument-hint: <category|all|refresh category|stale>
---

# Batch Documentation Generation

Generate user manual documentation for multiple pages at once.

## Arguments

- `$ARGUMENTS`

Valid arguments:
- `all` / `it` / `ops` / `master-data` / `admin` / `reports` / `portfolio` / `knowledge` — generate docs for **undocumented** pages only (existing behavior)
- `refresh all` / `refresh it` / `refresh ops` / etc. — **regenerate** all pages in a category, overwriting silently
- `stale` — detect stale pages via git history (compare `git log -1 --format="%ci"` for component vs doc), then regenerate only those

## Process

### Step 1: Read the Inventory and Select Pages

```
doc/help/_process/_documentation-inventory.md
```

- **Default mode** (`all`, `it`, `ops`, etc.): filter to **undocumented** pages in the requested category.
- **Refresh mode** (`refresh all`, `refresh it`, etc.): select **all** pages in the category (not just undocumented).
- **Stale mode** (`stale`): run staleness detection — for each documented page, compare `git log -1 --format="%ci"` of the component file(s) vs the doc file. Collect pages where the component is newer than the doc.

### Step 2: Generate Documentation

For each selected page:

1. Read the component files
2. Extract columns, tabs, fields, actions
3. Generate documentation following the template
4. Save to `doc/help/docs/en/{slug}.md`
5. Update the inventory to mark as DOCUMENTED

### Step 3: Summary Report

After completion, output:

```
📚 Batch Documentation Complete
===============================

Generated (new) (2):
  ✓ knowledge.md → https://doc.kanap.net/knowledge/

Refreshed (updated) (3):
  ✓ applications.md → https://doc.kanap.net/applications/
  ✓ interfaces.md → https://doc.kanap.net/interfaces/
  ✓ connections.md → https://doc.kanap.net/connections/

Skipped (up to date) (4):
  - locations.md (doc newer than component)
  - assets.md (doc newer than component)
  ...

Platform admin pages (not tenant-facing): always excluded

📖 Published docs: https://doc.kanap.net/
```

## Category Mappings

### `it` - IT Operations
- `/it/applications` + workspace
- `/it/interfaces` + workspace
- `/it/interface-map`
- `/it/connections` + workspace
- `/it/connection-map`
- `/it/locations` + workspace
- `/it/assets` + workspace
- `/it/settings`

### `ops` - Budget Management
- `/ops` (overview)
- `/ops/opex` + workspace
- `/ops/capex` + workspace
- `/ops/contracts` + workspace
- `/ops/operations` (administration landing)
- `/ops/operations/freeze`
- `/ops/operations/copy-budget-columns`
- `/ops/operations/copy-allocations`
- `/ops/operations/column-reset`

### `master-data` - Master Data
- `/master-data/companies` + workspace
- `/master-data/departments` + workspace
- `/master-data/suppliers` + workspace
- `/master-data/contacts` + workspace
- `/master-data/business-processes` + workspace
- `/master-data/coa` + workspace
- `/master-data/analytics` + workspace
- `/master-data/currency`
- `/master-data/operations` (administration)
- `/master-data/operations/freeze`
- `/master-data/operations/copy`

### `admin` - Admin & Settings
- `/admin/users`
- `/admin/roles`
- `/admin/audit-logs`
- `/admin/billing`
- `/admin/auth`
- `/admin/branding`

### `reports` - Budget Reports
- `/ops/reports` (landing)
- `/ops/reports/top-opex`
- `/ops/reports/opex-delta`
- `/ops/reports/comparison`
- `/ops/reports/capex/trend`
- `/ops/reports/budget-columns-compare`
- `/ops/reports/consolidation`
- `/ops/reports/analytics`
- `/ops/reports/chargeback/global`
- `/ops/reports/chargeback/company`

### `portfolio` - Portfolio Management
- `/portfolio/tasks` + workspace
- `/portfolio/requests` + workspace
- `/portfolio/projects` + workspace
- `/portfolio/planning`
- `/portfolio/contributors` + workspace
- `/portfolio/reports` (reporting landing + sub-reports)
- `/portfolio/settings`

### `knowledge` - Knowledge
- `/knowledge` + workspace

## Notes

- Each page is generated sequentially to ensure quality
- The agent will read each component thoroughly before writing
- Complex pages (like Applications with 6+ tabs) may take longer
- After each page, the inventory is updated immediately
- If interrupted, run again - already-documented pages will be skipped
- Fast Track guides (`fast-track/*.md`) and On-Premise docs (`on-premise/*.md`) are not route-based and must be refreshed manually with `/doc-page`
