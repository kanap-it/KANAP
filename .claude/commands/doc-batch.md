---
description: Generate documentation for multiple pages in batch (project)
allowed-tools: Read, Glob, Grep, Write, Edit, Task
argument-hint: <category|all>
---

# Batch Documentation Generation

Generate user manual documentation for multiple pages at once.

## Arguments

- `$ARGUMENTS`

Valid arguments:
- `all` - Generate docs for all undocumented pages (excluding Portfolio)
- `it` - Generate docs for IT Operations pages only
- `ops` - Generate docs for Budget Operations pages only
- `master-data` - Generate docs for Master Data pages only
- `admin` - Generate docs for Admin pages only
- `reports` - Generate docs for Reports pages only
- `high-priority` - Generate docs for high-priority pages first

## Process

### Step 1: Read the Inventory

```
doc/help/_process/_documentation-inventory.md
```

Filter to pages matching the requested category.

### Step 2: Generate Documentation

For each undocumented page in the category:

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

Generated (5):
  ✓ applications.md → https://doc.kanap.net/applications/
  ✓ interfaces.md → https://doc.kanap.net/interfaces/
  ✓ connections.md → https://doc.kanap.net/connections/
  ✓ locations.md → https://doc.kanap.net/locations/
  ✓ servers.md → https://doc.kanap.net/servers/

Skipped (2):
  - Portfolio pages (excluded per policy)
  - Platform admin pages (not tenant-facing)

Remaining undocumented: 12
  Run `/doc-batch ops` to continue with Budget Operations pages.

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
- `/ops/servers` + workspace

### `ops` - Budget Operations
- `/ops/contracts` + workspace
- `/ops/tasks` + workspace
- `/ops/projects`
- `/ops/operations` (landing)
- `/ops/operations/freeze`
- `/ops/operations/copy-budget-columns`
- `/ops/operations/copy-allocations`
- `/ops/operations/column-reset`

### `master-data` - Master Data
- `/master-data/departments` + workspace
- `/master-data/contacts` + workspace
- `/admin/suppliers` + workspace

### `admin` - Admin Pages
- `/admin` (landing)
- `/admin/users`
- `/admin/roles`
- `/admin/billing`
- `/admin/auth`

### `reports` - Reports
- `/ops/reports` (landing)
- `/ops/reports/top-opex`
- `/ops/reports/opex-delta`
- `/ops/reports/budget-trend`
- `/ops/reports/chargeback/global`
- `/ops/reports/chargeback/company`

### `high-priority` - High Priority First
Order from `_documentation-inventory.md`:
1. `/it/applications`
2. `/ops/contracts`
3. `/ops/tasks`
4. `/it/interfaces`
5. `/master-data/departments`

## Notes

- Each page is generated sequentially to ensure quality
- The agent will read each component thoroughly before writing
- Complex pages (like Applications with 6+ tabs) may take longer
- After each page, the inventory is updated immediately
- If interrupted, run again - already-documented pages will be skipped
