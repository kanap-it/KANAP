# Portfolio Reporting

Portfolio Reporting provides analytics focused on workload, capacity, and delivery signals.

## Getting started

Navigate to **Portfolio > Reporting** to open the reporting hub.

**Permissions**:
- You need at least `portfolio_reports:reader` to access portfolio reports.

If you do not see Reporting in the menu, ask your administrator to grant you access.

---

## Reports landing page

The Portfolio Reporting landing page lists available portfolio reports as cards. Click a card to open the report.

Currently available:
- **Status Change Report**
- **Capacity Heatmap**
- **Weekly Report**

---

## Status Change report

Use this report to track items whose status changed during a selected period.

### What it shows
- **One row per item** (standalone task, request, or project).
- **Latest in-period status change only** for each item.
- **Final status reached in the selected period** (if multiple changes happened in-range).
- **Last changed** date for the retained status-change event.

### Filters
- **Start Date** and **End Date** (required period)
- **Status** (multi-select)
- **Item Type** (multi-select: Tasks, Requests, Projects)
- **Source** (multi-select)
- **Category** (multi-select)
- **Stream** (multi-select; available when at least one category is selected)

### Inclusion rules
- The item is included only if its status changed during the selected period.
- For tasks, only **standalone tasks** are included (project-linked tasks are excluded).
- Status filtering applies to the status reached after the change.

### Table columns
- **Name** (clickable; opens the item)
- **Item Type**
- **Priority**
- **Status**
- **Source**
- **Category**
- **Stream**
- **Company**
- **Last Changed**

Default sort is by **Priority** (highest first). You can sort by any column.

### Exports
- **CSV** export
- **XLSX** export with clickable item names

---

## Capacity Heatmap report

Use this report to understand current workload, capacity pressure, and unassigned work.

### What it shows
- **Remaining effort** (IT + Business), adjusted by execution progress.
- **Capacity** per contributor (historical or theoretical).
- **Months of work** (remaining days / capacity days per month).
- **Unassigned work** when effort is not fully allocated.

### Filters
- **Teams** (multi-select, includes **No team**)
- **Status** (default: Waiting List, Planned, In Progress, In Testing, On Hold)
- **Capacity mode**: Historical (default) or Theoretical
- **Group by**: Contributors (default) or Teams

### Color scale
Cells in the **Months of work** column are color-coded:

| Range | Color |
|-------|-------|
| <= 1 month | Green |
| 1-3 months | Yellow |
| 3-6 months | Orange |
| 6-12 months | Red |
| > 12 months | Violet |
| No data | Gray (N/A) |

### Summary cards
The summary row includes:
- **Total contributors**
- **Average months of work** (contributors with capacity only)
- **Unassigned work** (total unallocated days and project count)

Click **Unassigned work** to expand details.

### Drill-down
Click a contributor row to open a project breakdown:
- Each row shows remaining effort, allocation %, and your days.
- Project names are clickable and open the project's **Progress** tab.

### Exports
- **CSV**: Export the heatmap table
- **PNG**: Snapshot of the report
- **Print**: Print or save as PDF

---

## Weekly Report

Use this report to produce a weekly stakeholder summary covering project updates, closed tasks, and request changes over a selected period.

### What it shows

The report is split into three tables:

- **Project Updates** — projects whose status changed during the period.
- **Closed Tasks** — standalone tasks that were closed during the period.
- **Request Updates** — requests whose status changed during the period.

A summary line above the tables shows the count for each section.

### Filters

- **Start Date** and **End Date** (defaults to the last 7 days)
- **Source** (multi-select)
- **Category** (multi-select)
- **Stream** (multi-select; scoped to selected categories)
- **Task Types** (multi-select; applies to the Closed Tasks table)

### Table columns

**Project Updates**: Project Name (clickable), Priority, Source, Category, Stream, Progress, Status

**Closed Tasks**: Task Name (clickable), Task Type, Priority, Source, Category, Stream, Status

**Request Updates**: Request Name (clickable), Source, Category, Stream, Status

Default sort is by **Priority** (highest first). Clicking a name opens the item.

### Exports

- **CSV** export
- **XLSX** export

---

## Tips
- **Keep contributor profiles updated**: Capacity is based on contributor availability and historical time stats.
- **Use team filters**: Scope the report to a department or function.
- **Check unassigned work**: Helps surface projects with missing allocations or missing leads.
- **Weekly Report for stand-ups**: Export the Weekly Report as XLSX and share it with stakeholders for status meetings.
