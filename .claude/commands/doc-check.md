---
description: Check user manual documentation for staleness, regenerate inventory (project)
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task
---

# Documentation Staleness & Inventory Check

This command:
1. **Scans the codebase** to discover all pages and workspaces
2. **Regenerates the inventory** (`_documentation-inventory.md`)
3. **Checks staleness** for existing docs (code changed but docs not updated)
4. **Reports gaps** and suggests next actions

## Source of Truth Hierarchy

```
Code (*.tsx)                    ← GROUND TRUTH
    ↓
Technical docs (page-and-feature-overview.md, features/*.md)
    ↓
User docs (doc/help/docs/en/*.md)
```

**Rule**: When sources conflict, Code wins. Update docs to match code.

## Process

### Step 1: Discover All Pages (Codebase Scan)

Scan `frontend/src/pages/` for all page components:

```bash
# Find all page components
find frontend/src/pages -name "*.tsx" -type f | grep -E "(Page|Workspace)\.tsx$"
```

Categorize discovered pages into groups:
- **Dashboard & Operations**: `/`, `/ops/*`
- **IT Operations**: `/it/*`
- **Master Data**: `/master-data/*`
- **Admin & Settings**: `/admin/*`
- **Reports**: `/ops/reports/*`

Exclude from inventory:
- `/portfolio/*` (work in progress)
- `/admin/tenants`, `/admin/coa-templates`, `/admin/standard-accounts` (platform admin only)

### Step 2: Match Pages to Documentation

For each discovered page:
1. Check if a corresponding `.md` file exists in `doc/help/docs/en/`
2. Map component path → doc file using naming convention:
   - `ApplicationsPage.tsx` → `applications.md`
   - `ContractWorkspacePage.tsx` → `contracts.md`
3. Mark as DOCUMENTED or MISSING

### Step 3: Regenerate Inventory File

Update `doc/help/_process/_documentation-inventory.md` with:
- Current date
- Summary table with counts per category
- Detailed tables showing each route, component, status, and doc file
- Remaining gaps section

### Step 4: Check Git History (Staleness Detection)

For each documented page, compare:
- **Doc last modified**: `git log -1 --format="%ci" -- doc/help/docs/en/{doc-file}.md`
- **Component last modified**: `git log -1 --format="%ci" -- frontend/src/pages/{component-path}`

Flag documentation as **potentially stale** if:
- The component was modified after the documentation
- Any editor/workspace sub-components were modified after the documentation

### Step 5: Analyze Changes

For each potentially stale doc, run:
```bash
git diff --stat {doc-commit}..HEAD -- frontend/src/pages/{component-path}
```

Categorize changes:
- **Column changes**: New columns added, columns removed, column names changed
- **Tab changes**: New tabs added, tabs removed
- **Field changes**: New form fields, removed fields
- **Action changes**: New actions in toolbar, removed actions

### Step 6: Cross-Reference Consistency Check

For each page, extract and compare:

| Check | Code | Technical Doc | User Doc |
|-------|------|---------------|----------|
| Tab count | Count from `tabs` array | Count in overview table | Count in workspace section |
| Column names | From `columns` definition | Listed in route description | Listed in "Working with the list" |
| Actions | From toolbar JSX | Mentioned in description | Listed in actions section |

**Flag inconsistencies:**
```
⚠️ INCONSISTENCY: /it/applications
   Tabs in code: 6 (Overview, Instances, Servers, Interfaces, Ownership, Compliance)
   Tabs in technical doc: 5 (missing: Compliance)
   Tabs in user doc: 5 (missing: Compliance)

   → Technical doc is outdated. User doc inherited the error.
   → Fix: Update page-and-feature-overview.md, then regenerate user doc.
```

### Step 7: Generate Report

Output a summary with THREE sections:

**Section 1: Consistency Issues**
| Page | Issue | Code Says | Docs Say | Fix |
|------|-------|-----------|----------|-----|
| /it/applications | Tab mismatch | 6 tabs | 5 tabs | Update both docs |

**Section 2: Staleness (Code newer than docs)**
| Doc File | Status | Component Changes Since Doc | Priority |
|----------|--------|----------------------------|----------|
| applications.md | STALE | +2 columns, +1 tab | HIGH |
| companies.md | OK | No changes | - |
| opex.md | STALE | Field label change | LOW |

**Section 3: Missing Documentation**
| Route | Technical Doc | User Doc |
|-------|---------------|----------|
| /it/interfaces | ✓ Present | ✗ Missing |

### Step 8: Offer to Update

For each stale document, offer to:
1. Show a diff of what changed in the component
2. Auto-update the documentation using `/doc-page`
3. Skip and mark as reviewed

## Usage Examples

```
/doc-check
```
→ Scans codebase, regenerates inventory, checks all docs for staleness

```
/doc-check applications
```
→ Checks only the applications documentation (no inventory regeneration)

```
/doc-check --inventory-only
```
→ Only regenerates the inventory file, skips staleness checks

## Staleness Heuristics

| Change Type | Priority | Action |
|-------------|----------|--------|
| New column added | HIGH | Add to "Working with the list" section |
| Column removed | HIGH | Remove from documentation |
| New tab added | HIGH | Add new tab section |
| Tab removed | HIGH | Remove tab section |
| Field label changed | MEDIUM | Update field name in docs |
| New action button | MEDIUM | Add to actions list |
| Internal refactor | LOW | Usually no doc change needed |
| Bug fix | LOW | Usually no doc change needed |

## Output Format

```
📋 Documentation Check Report
================================

📁 Inventory regenerated: doc/help/_process/_documentation-inventory.md
   - Dashboard & Operations: 10/12 (83%)
   - IT Operations: 8/10 (80%)
   - Master Data: 7/7 (100%)
   - Admin & Settings: 7/8 (88%)
   - Reports: 6/6 (100%)
   - TOTAL: 38/43 (88%)

✅ Up to date (6):
   - companies.md
   - departments.md
   ...

⚠️ Potentially stale (3):
   1. applications.md
      Component changed: 2025-12-20
      Doc last updated: 2025-11-15
      Changes detected:
        + New column: "Compliance Status"
        + New tab: "Risk Assessment"

   2. opex.md
      ...

❌ Missing documentation (5):
   - /ops/projects → placeholder (not yet implemented)
   - /it/interface-map → needs visualization docs
   ...

Suggested action: Run `/doc-page {route}` to generate or update documentation.

📖 Published docs: https://doc.kanap.net/
```
