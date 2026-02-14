# Departments

Departments represent organizational units within your companies. Use them to track headcount metrics, allocate costs, and define audiences for applications. Departments are linked to companies and can have year-by-year headcount data.

## Getting started

Navigate to **Master Data → Departments** to see your department list. Click **New** to create your first entry.

**Required fields**:
  - **Name**: The department name
  - **Company**: Which company this department belongs to

**Optional but useful**:
  - **Headcount**: Number of employees (tracked by year)
  - **IT Users**: Number of IT system users (may differ from headcount)

**Tip**: Import departments from your HR system to ensure alignment with organizational structure.

---

## Working with the list

The Departments grid shows all departments with their headcount metrics.

**Default columns**:
  - **Name**: Department name (click to open workspace)
  - **Company**: Parent company
  - **Headcount (Year)**: Employee count for the selected year (click to edit)
  - **Status**: Enabled or Disabled

**Additional columns** (via column chooser):
  - **Created**: When the department was created

**Year selector**: Use the Year field in the toolbar to change which year's headcount is displayed.

**Status scope**: Use the Enabled/Disabled/All toggle to filter by status.

**Actions**:
  - **Year selector**: Switch the displayed headcount year
  - **New**: Create a new department (requires `departments:manager`)
  - **Import CSV**: Bulk import departments (requires `departments:admin`)
  - **Export CSV**: Export to CSV (requires `departments:admin`)
  - **Delete Selected**: Remove selected departments (requires `departments:admin`)

---

## The Departments workspace

Click any row to open the workspace. It has two tabs:

### Overview

The Overview tab captures the department's identity.

**What you can edit**:
  - **Name**: Department name
  - **Company**: Parent company (links to Companies master data)
  - **Status**: Enabled or Disabled
  - **Notes**: Free-form notes

---

### Details

The Details tab manages year-by-year metrics.

**Year selector**: Choose which year to view/edit at the top of the tab.

**Metrics per year**:
  - **Headcount**: Total number of employees in this department
  - **IT Users**: Number of users with IT system access (for user-based allocations)

**How it's used**:
- Headcount feeds into audience calculations for applications
- IT Users count is used when allocating costs by "IT Users" method
- Both values appear in chargeback calculations

**Tip**: Update metrics annually during your budget planning cycle.

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

**Optional fields**: Headcount, IT Users, Status

**Notes**:
  - Use **UTF-8 encoding** and **semicolons** as separators
  - Headcount values are year-specific—imported values apply to the current year

---

## Tips

  - **Match your org structure**: Mirror your HR system's department hierarchy for consistency.
  - **Update headcount annually**: Set a reminder to update department metrics during budget planning.
  - **Use for allocations**: Department headcount drives cost allocation calculations.
  - **Disable don't delete**: When departments are reorganized, disable old ones rather than deleting to preserve historical data.
