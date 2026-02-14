# User Manual Documentation Process

_This document describes the complete workflow for creating, updating, and maintaining user documentation._

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Documentation Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Feature  │───▶│ /doc-page│───▶│ Review & │───▶│ Writebook│  │
│  │ Complete │    │ Command  │    │  Tweak   │    │   Sync   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Feature  │───▶│/doc-check│───▶│ Update   │───▶ (repeat)      │
│  │ Changed  │    │ Command  │    │  Docs    │                   │
│  └──────────┘    └──────────┘    └──────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source of Truth Hierarchy

```
Code (*.tsx files)              ← GROUND TRUTH (what actually runs)
        │
        ├──▶ Technical docs     ← Developer reference (page-and-feature-overview.md)
        │    (should mirror code)
        │
        └──▶ User docs          ← End-user guide (user-manual/*.md)
             (derived from code)
```

**When sources conflict, Code wins.** Always verify against code.

| Source | Purpose | Authority |
|--------|---------|-----------|
| `frontend/src/pages/*.tsx` | What actually runs | **Authoritative** |
| `doc/page-and-feature-overview.md` | Developer quick reference | Secondary |
| `doc/features/*.md` | Feature specifications | Secondary |
| `doc/user-manual/*.md` | End-user documentation | Derived |

---

## Quick Reference

| Task | Command | When to Use |
|------|---------|-------------|
| Document a single page | `/doc-page /it/applications` | New feature ready |
| Document multiple pages | `/doc-batch it` | Catch-up documentation |
| Check for stale docs | `/doc-check` | Before release, weekly |
| Update stale doc | `/doc-page /it/applications` | After `/doc-check` flags it |

---

## Phase 1: Creating New Documentation

### When a New Feature Ships

1. **Run the documentation command**:
   ```
   /doc-page /it/applications
   ```

2. **Review the generated content**:
   - Check that all tabs/columns are documented
   - Verify the navigation path is correct
   - Ensure tips are practical
   - Add any business context Claude couldn't infer

3. **Commit the documentation**:
   ```bash
   git add doc/user-manual/user-manual-applications.md
   git commit -m "docs: add user manual for Apps & Services"
   ```

### For Batch Documentation (Catch-up)

1. **Check the inventory**:
   ```
   cat doc/user-manual/_documentation-inventory.md
   ```

2. **Generate by category**:
   ```
   /doc-batch it          # IT Operations pages
   /doc-batch ops         # Budget Operations pages
   /doc-batch high-priority  # Priority order
   ```

3. **Review each generated file** before committing

---

## Phase 2: Detecting Stale Documentation

### Trigger Points

Run `/doc-check` at these times:
- Before each release
- After a sprint ends
- Weekly (recommended)
- After major feature changes

### What Gets Flagged

| Change Type | Detection | Priority |
|-------------|-----------|----------|
| New grid column | Column definition added | HIGH |
| New workspace tab | Tab array modified | HIGH |
| Renamed field | Label change in JSX | MEDIUM |
| New action button | Button added to toolbar | MEDIUM |
| Internal refactor | File changed but no UI impact | LOW |

### Example Workflow

```bash
# Check all documentation
/doc-check

# Output shows:
# ⚠️ user-manual-applications.md - STALE
#    Component changed: 2025-12-20
#    Changes: +1 column (Compliance Status)

# Update the stale doc
/doc-page /it/applications

# Or manually edit if it's a small change
```

---

## Phase 3: Keeping Documentation Updated

### Option A: Manual Update (Small Changes)

For minor changes (renamed field, small addition):

1. Open the doc file in your editor
2. Make the specific change
3. Commit with message: `docs: update applications manual - add Compliance Status column`

### Option B: Regenerate (Significant Changes)

For larger changes (new tab, restructured page):

1. Run `/doc-page /route` to regenerate
2. Review the diff to ensure nothing important was lost
3. Merge any custom content you added manually
4. Commit

### Option C: Hybrid Approach (Recommended)

1. Keep the "Tips" section and any custom business context in a separate section
2. Regenerate the structural content (columns, tabs, fields)
3. Merge the custom content back

---

## Phase 4: Writebook Synchronization

Since Writebook accepts Markdown and has no API, sync manually:

### Initial Setup

1. Create a book in Writebook called "KANAP User Manual"
2. Create sections matching your doc structure:
   - Budget Management (OPEX, CAPEX, etc.)
   - IT Operations (Applications, Interfaces, etc.)
   - Master Data (Companies, Departments, etc.)
   - Admin (Users, Roles, etc.)

### Sync Process

1. **Export from git**:
   ```bash
   # Copy all user manual files
   ls doc/user-manual/user-manual-*.md
   ```

2. **For each file**:
   - Open the corresponding page in Writebook
   - Copy the markdown content from the `.md` file
   - Paste into Writebook (it accepts markdown)
   - Save/publish

3. **Track sync status** (optional):
   Add a `_writebook-sync.md` file:
   ```markdown
   # Writebook Sync Status

   | Doc File | Writebook Page | Last Synced |
   |----------|----------------|-------------|
   | user-manual-opex.md | Budget/OPEX | 2025-12-28 |
   | user-manual-capex.md | Budget/CAPEX | 2025-12-28 |
   ```

### Future: Automated Sync

If Writebook adds an API or file-based storage:
- Create a `/doc-sync` command
- Auto-push markdown files to Writebook
- Track sync state in git

---

## File Structure

```
doc/user-manual/
├── _documentation-inventory.md   # What's documented vs missing
├── _documentation-template.md    # Writing style guide
├── _documentation-process.md     # This file
├── user-manual-opex.md          # Generated docs...
├── user-manual-capex.md
├── user-manual-companies.md
└── ...
```

---

## Handling Inconsistencies

When `/doc-check` or `/doc-page` detects a conflict between sources:

### Scenario 1: Code has more than technical docs

```
⚠️ Code has 6 tabs, technical doc says 5
```

**What happened**: A tab was added to code but technical docs weren't updated.

**Resolution**:
1. `/doc-page` generates user docs from code (correct)
2. Manually update `page-and-feature-overview.md` to add the missing tab
3. Commit both changes together

### Scenario 2: Technical docs have more than code

```
⚠️ Technical doc mentions "Risk Assessment" tab, code has no such tab
```

**What happened**: Either:
- A planned feature was documented before implementation
- A feature was removed but docs weren't updated

**Resolution**:
1. Check git history to determine which scenario
2. If removed: update technical docs to remove the reference
3. If planned: leave technical docs as-is, but don't include in user docs

### Scenario 3: User docs contradict code

```
⚠️ User doc says 5 columns, code defines 8
```

**What happened**: User docs are stale.

**Resolution**:
1. Run `/doc-page` to regenerate from code
2. Review the diff to preserve any custom business context
3. Commit the updated user doc

### Quick Decision Tree

```
Inconsistency detected
        │
        ▼
   Is Code correct?
        │
    ┌───┴───┐
   Yes      No (bug)
    │         │
    ▼         ▼
Update docs  Fix code first,
to match     then update docs
```

---

## Best Practices

### 1. Document Early
Generate documentation when the feature is fresh in your mind. The component structure is clearest right after implementation.

### 2. Review, Don't Just Generate
Always read through generated docs. Add business context Claude can't infer from code.

### 3. Keep Custom Content Separate
If you add significant custom content (workflows, business rules), consider:
- Adding a "## Business Context" section at the end
- Using HTML comments to mark custom sections: `<!-- CUSTOM: keep this section -->`

### 4. Sync Regularly
Set a reminder to run `/doc-check` weekly. Stale documentation is worse than no documentation.

### 5. One Feature = One Doc
Don't combine multiple pages into one doc file. Keep the 1:1 mapping for easier updates.

---

## Troubleshooting

### "Component not found"
The `/doc-page` command couldn't locate the React component.
- Check the route exists in `page-and-feature-overview.md`
- Try using the full component name instead of route

### "Generated doc is missing sections"
The component may have non-standard structure.
- Read the component manually and add missing sections
- File an issue if a pattern should be supported

### "Doc marked stale but nothing changed"
False positive from internal refactoring.
- Run `/doc-check {page}` to see the specific changes
- If truly no user-facing change, update the doc's timestamp:
  ```bash
  touch doc/user-manual/user-manual-{page}.md
  git commit -m "docs: mark as reviewed (no changes needed)"
  ```
