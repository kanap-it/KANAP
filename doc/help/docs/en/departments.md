# Departments

Departments represent organizational units within your companies. Use them to track headcount by year, allocate costs, and define audiences for applications. Each department belongs to a company and carries year-by-year headcount data that feeds into chargeback and allocation calculations.

## Getting started

Navigate to **Master Data > Departments** to see your department list. Click **New** to create your first entry.

**Required fields**:
- **Name**: The department name
- **Company**: Which company this department belongs to

**Optional but useful**:
- **Description**: Free-text description of the department's purpose or scope
- **Headcount**: Number of employees, tracked by year (set on the Details tab after creation)

**Tip**: Import departments from your HR system to keep your org structure aligned.

---

## Working with the list

The Departments grid gives you an overview of all departments with their headcount for a given year.

**Default columns**:
- **Name**: Department name -- click to open the workspace Overview tab
- **Company**: Parent company -- click to open the workspace Overview tab
- **Headcount (Year)**: Employee count for the selected year -- click to jump straight to the Details tab for editing

**Additional columns** (via column chooser):
- **Status**: Enabled or Disabled
- **Created**: When the department was created

**Year selector**: Use the **Year** field in the toolbar to change which year's headcount is displayed. The grid refreshes automatically when you change the year.

**Status scope**: Use the **Enabled / Disabled / All** toggle to filter by department status. The list defaults to showing only enabled departments.

**Quick search**: The search bar filters across department names.

**Deep-linking**: Every cell in the grid is a clickable link. Name and Company open the Overview tab; Headcount opens the Details tab. When you navigate to a workspace and then return, your sort order, search query, and filters are preserved.

**Actions**:
- **New**: Create a new department (requires `departments:manager`)
- **Import CSV**: Bulk import departments (requires `departments:admin`)
- **Export CSV**: Export to CSV (requires `departments:admin`)
- **Delete Selected**: Remove selected departments (requires `departments:admin`)

---

## The Departments workspace

Click any row to open the workspace. It has two tabs arranged vertically on the left: **Overview** and **Details**.

The workspace toolbar includes **Prev** / **Next** buttons to move between departments without returning to the list, plus **Reset** and **Save** buttons. If you have unsaved changes when navigating away, you will be prompted to save or discard them.

### Overview

The Overview tab captures the department's identity and status.

**What you can edit**:
- **Name**: Department name (required)
- **Company**: Parent company -- links to Companies master data (required). Companies that already have a department with the same name are automatically excluded from the dropdown to prevent duplicates.
- **Description**: Free-text description
- **Status**: Enabled or Disabled, with an optional scheduled disable date

**Tip**: When creating a new department, the Details tab becomes available only after you save the initial record.

---

### Details

The Details tab manages year-by-year headcount metrics.

**Year selector**: Choose which year to view or edit using the year tabs at the top of the panel. Five years are available: two years before the current year through two years after.

**Metrics per year**:
- **Headcount**: Total number of employees in this department for the selected year

**How it works**:
- Headcount feeds into audience calculations for applications
- Values are saved per year -- switching years loads that year's data independently
- If metrics for the selected year have been **frozen** (by an administrator), the field is locked and a notice explains how to unfreeze

**Tip**: Update headcount annually during your budget planning cycle. Use the year tabs to review or pre-fill future years.

---

## CSV import/export

Keep departments in sync with your HR system using CSV.

**Export**:
- Downloads all departments with current year metrics

**Import**:
- Use **Preflight** to validate before applying
- Matched by department name + company name
- Can create new departments or update existing ones

**Required fields**: Name, Company

**Optional fields**: Headcount, Status

**Notes**:
- Use **UTF-8 encoding** and **semicolons** as separators
- Headcount values are year-specific -- imported values apply to the current year

---

## Tips

- **Match your org structure**: Mirror your HR system's department hierarchy for consistency.
- **Update headcount annually**: Set a reminder to refresh department metrics during budget planning.
- **Use for allocations**: Department headcount drives cost allocation calculations -- keep it accurate.
- **Disable, don't delete**: When departments are reorganized, disable old ones rather than deleting to preserve historical data.
- **Leverage deep-links**: Click the headcount number directly from the list to jump to the Details tab and edit metrics without an extra click.
