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

Use this report to track items created during a selected period, or whose status changed in it.

### What it shows
- **One row per item** (standalone task, request, or project).
- **Latest in-period event only** for each item, whether that event is the creation or a status change.
- **Status reached by that event**. For a creation, this is the status the item was created with.
- **Created** date, filled when the item was created inside the period, and empty otherwise.
- **Last changed** date for the retained event.

### Filters
- **Start Date** and **End Date** (required period)
- **Status** (multi-select)
- **Item Type** (multi-select: Tasks, Requests, Projects)
- **Source** (multi-select)
- **Category** (multi-select)
- **Stream** (multi-select; available when at least one category is selected)

### Inclusion rules
- The item is included if it was created during the selected period, or if its status changed during it.
- An item created and then moved to another status in the same period appears once, with the status of its latest event.
- For tasks, only **standalone tasks** are included (project-linked tasks are excluded).
- Status filtering applies to the status carried by the retained event.
- The period, the **Created** date and the **Last changed** date follow your browser's time zone.

### Table columns
- **Name** (clickable; opens the item)
- **Item Type**
- **Priority**
- **Status**
- **Source**
- **Category**
- **Stream**
- **Company**
- **Created**
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
- **People without a contributor profile** who are staffed on a project. They appear at the end of the list with their remaining days and no capacity, so their load stays visible. Create their contributor profile to give them a capacity.

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

Use this report to produce a weekly stakeholder summary covering project updates, task activity, and request changes over a selected period.

### What it shows

The report is split into three tables:

- **Project Updates** — projects created during the period, or whose status changed in it.
- **Task Activity** — tasks created during the period, or closed (done or cancelled) in it.
- **Request Updates** — requests created during the period, or whose status changed in it.

Every table has a **Created** column. It carries the creation day when the item was created inside the period, and stays empty for items that only changed status.

A summary line above the tables shows the counts: project updates, tasks created, tasks closed, and request updates.

### Filters

- **Start Date** and **End Date** (defaults to the last 7 days)
- **Source** (multi-select)
- **Category** (multi-select)
- **Stream** (multi-select; scoped to selected categories)
- **Task Types** (multi-select; applies to the Task Activity table)

### Table columns

**Project Updates**: Project Name (clickable), Priority, Source, Category, Stream, Progress, Status, Created

**Task Activity**: Task Name (clickable), Task Type, Priority, Source, Category, Stream, Status, Created

**Request Updates**: Request Name (clickable), Source, Category, Stream, Status, Created

The CSV and XLSX exports carry the same columns, plus a **Last Changed** column after **Created**.

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
