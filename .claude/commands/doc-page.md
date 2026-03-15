---
description: Generate user manual documentation for a KANAP page (project)
allowed-tools: Read, Glob, Grep, Write, Edit, Task
argument-hint: <route-or-component>
---

# Generate User Manual Documentation

You are generating user documentation for the KANAP application. Your goal is to create **practical, user-friendly documentation** that helps end users understand and use features effectively.

## Input

The user will provide either:
- A route path (e.g., `/it/applications`, `/ops/contracts`)
- A component name (e.g., `ApplicationsPage`, `ContractsPage`)

**Argument provided**: `$ARGUMENTS`

## Process

### Step 1: Gather Context

**IMPORTANT: Code is the source of truth.** Technical docs are supplementary context only.

1. **Read the documentation template**:
   ```
   doc/help/_process/_documentation-template.md
   ```

2. **Find and read the component files** (PRIMARY SOURCE):
   - The main grid/list page (e.g., `ApplicationsPage.tsx`)
   - The workspace page if it exists (e.g., `ApplicationWorkspacePage.tsx`)
   - Editor components in the `editors/` subfolder

3. **Extract from the code** (these are authoritative):
   - Grid columns (from `columns` array or `EnhancedColDef` definitions)
   - Workspace tabs (from `tabs` array)
   - Form fields and their labels
   - Actions available (New, Import, Export, Delete)
   - Permission requirements (from `hasLevel` checks)

4. **Read technical docs for context** (SECONDARY - may be outdated):
   ```
   doc/page-and-feature-overview.md
   doc/features/*.md (if relevant feature doc exists)
   ```
   Use for: business context, permission descriptions, workflow explanations
   Do NOT use for: tab counts, column lists, field names (get these from code)

5. **Flag inconsistencies**:
   If technical docs contradict the code, note this in your output:
   ```
   Note: Technical doc (page-and-feature-overview.md) mentions 5 tabs,
   but code has 6. Generated documentation reflects actual code.
   Consider updating technical docs.
   ```

### Step 2: Structure the Documentation

Follow the template structure:

1. **Title**: Use the exact UI label (e.g., "Apps & Services", not "Applications")
2. **Introduction**: 2-3 sentences on business purpose
3. **Getting Started** or **Where to Find It**: Navigation and permissions
4. **Working with the List**: Grid columns, filtering, actions
5. **The Workspace**: Each tab explained with fields
6. **CSV Import/Export**: If available
7. **Tips**: 2-3 practical tips

### Step 3: Write User-Friendly Content

**DO**:
- Write for end users, not developers
- Explain the "why" not just the "what"
- Use **bold** for UI elements
- Use `code` for permission codes
- Include practical tips based on the feature's purpose
- Describe real workflows users would follow

**DON'T**:
- Include technical implementation details
- Use developer jargon (entity, component, service)
- Copy code comments verbatim
- Document internal fields not visible to users

### Step 4: Save the Documentation

Save to: `doc/help/docs/en/{feature-slug}.md`

Use a slug based on the feature name (lowercase, hyphens):
- `/it/applications` → `applications.md`
- `/ops/contracts` → `contracts.md`
- `/it/interface-map` → `interface-map.md`

**Published URL**: `https://doc.kanap.net/{feature-slug}/`

### Step 5: Update Integration Points (New Pages Only)

If this is a **new** page (not a refresh of an existing one):

1. Add the page to `doc/help/mkdocs.yml` nav in the appropriate section
2. Add a route → slug mapping in `frontend/src/utils/docUrls.ts`
3. Update `doc/help/_process/doc-update-map.tsv` with component → doc file mappings

### Step 6: Update Inventory

After generating, update `doc/help/_process/_documentation-inventory.md` to mark the page as DOCUMENTED.

## Example Output Structure

```markdown
# Apps & Services

Apps & Services is where you document your IT application landscape...

## Getting started

Navigate to **IT Operations → Apps & Services**...

## Working with the list

**Default columns**: Name, Type, Environments, Suite, Owners...

## The Apps & Services workspace

### Overview
...

### Instances
...

## CSV import/export
...

## Tips

  - **Start with production**: Document your production environment first...
```

## Important Notes

- If a workspace has many tabs, document each one as a separate subsection
- For complex features (like Interfaces with environments and bindings), break down the workflows
- Reference related pages where relevant (e.g., "See IT Operations Settings for...")
- Integration points and inventory updates are handled in Steps 5-6 above
