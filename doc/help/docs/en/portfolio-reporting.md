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

## Steering

The first strip above the report cards is the daily steering view. It answers two questions: what moved lately, and what is waiting for someone.

### The period

The header shows the period in use and lets you switch between the last 7, 30 and 90 days. The period always ends today and is read in your own time zone. Your choice is remembered on this browser.

### Flow

One line per entity reads like this: **14 created · 9 closed · 52 open (+5)**.

- **Created**: items created during the period and still present today.
- **Closed**: items that moved from an open status to a closed one during the period. Closed means Done or Cancelled for tasks and projects, Rejected or Converted for requests.
- **Open**: items open right now, whatever happened during the period. This figure is a link to the matching list.
- **(+5)**: the net change, shown only when it is not zero. It is created, plus reopened, minus closed. Reopened items are items that went from a closed status back to an open one. Hover the figure to see the formula.

Created and closed come from the change history, so they include every way an item can be written: the app, a CSV import and the agents. No list filter reproduces that history, so those two figures are not links.

### Which tasks count

Every task figure counts standalone tasks and project tasks only. Tasks attached to a contract, a spend item, a capex item or an incident belong to those workflows and are left out everywhere in this strip.

### Needs attention

The last line appears only when something needs a decision:
- **Overdue tasks**: open tasks whose due date is before today. The figure opens the task list filtered on the same items.
- **Tasks without assignee**: open tasks nobody owns. The task list has no filter for an empty assignee, so this figure is not a link.
- **Projects without activity for 30 days**: projects in progress or in testing where nothing has happened for a month. Clicking it opens a short list of those projects with their last activity date, and each name opens the project.

Activity is read widely. A project counts as active when anything changed on it or on one of its tasks, when someone wrote in its journal, or when time was logged on the project or on one of its tasks. A project only appears here when all of those are older than 30 days.

---

## To classify

Above the report cards, a compact strip shows how much of your open work is still missing a classification value. Use it as a daily steering aid: see the gap, click it, fix it.

### What it counts

One line per entity, for open items only:
- **Tasks**: status other than Done and Cancelled.
- **Requests**: status other than Rejected and Converted.
- **Projects**: status other than Done and Cancelled.

Each line reports how many of those items have no Source, no Category and no Stream. Tasks also report how many have no Task Type.

### Which tasks are excluded

Only standalone tasks and project tasks are counted. Tasks attached to a contract, a spend item, a capex item or an incident never carry a classification, so counting them would report a gap nobody can close.

A project task with no classification of its own inherits the one of its project, and the task list shows that inherited value. The counts follow the same rule, so a figure never sends you to a list where the column is already filled.

### Streams

A missing Stream is only counted when the item already has a Category and that Category offers at least one active Stream. Many categories have no stream to choose from. An item with no category at all is already counted under Category.

### Opening the list

Every figure above zero is a link. Clicking it opens the matching list, already filtered on exactly the items behind the figure, across the whole tenant. The list total matches the figure you clicked. Zeros are shown for context but are not clickable.

When nothing is missing, the strip shows a single line confirming that everything open is classified.

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

Use this report to see what happened to requests, projects and tasks over a period. The report follows the portfolio funnel: requests first, then projects, then tasks.

### What it shows

Each of the three sections holds the same three lists.

- **Created** — items created during the period.
- **Modified** — items changed during the period without being created or closed in it.
- **Closed** — items that moved into a closed status during the period.

An item created and closed inside the same period appears in both lists. It never appears under Modified: Modified is what is left once creations and closures are accounted for.

Closed means different statuses per type:

- **Requests**: converted or rejected. A request has no cancelled status.
- **Projects**: done or cancelled.
- **Tasks**: done or cancelled.

Each list shows the count in its heading. A list with nothing in it stays on a single line, so a report with little activity stays short.

### Which tasks count

The Tasks section covers portfolio tasks only: standalone tasks and tasks attached to a project. Tasks attached to a contract, a spend item, a CAPEX line or an incident are left out. This is narrower than earlier versions of the report, which counted every task.

### Where a project came from

The Projects created list carries an **Origin** column.

- A project converted from a request shows that request, for example `REQ-12 Cave climate digital twin`. Click it to open the request.
- A project created straight in the projects list shows **Created directly**.

### What changed

The Modified lists carry a **Changes** column. It reads the audit trail of the period and shows:

- the status move, when the status changed, as `In progress -> In testing`;
- then the fields that changed, in plain language, separated by commas.

The wording matches the history feed on the item itself. Fields rewritten on every save, such as the technical update timestamp, are left out.

### Filters

- **Start date** and **End date** (defaults to the last 7 days)
- **Source** (multi-select)
- **Category** (multi-select)
- **Stream** (multi-select; scoped to the selected categories)
- **Task types** (multi-select; applies to the Tasks section)

Filters apply to all nine lists.

### Table columns

Every list starts with the business reference (`REQ-12`, `PRJ-3`, `T-4`) and the name. Clicking the name opens the item.

**Requests**: Reference, Request name, Source, Category, Stream, Status, date of the event.

**Projects**: Reference, Project name, Origin (created list), Priority, Source, Category, Stream, Effort, Status, date of the event.

**Tasks**: Reference, Task name, Task type, Priority, Source, Category, Stream, Status, date of the event.

The date column carries the creation day on the created lists, the last change day on the modified lists, and the closing day on the closed lists. Days are read in your own time zone.

Modified lists add the **Changes** column at the end.

### Exports

- **CSV** — nine blocks in the order of the page, each with its own heading and header row.
- **XLSX** — three sheets, Requests, Projects and Tasks. Rows run created, then modified, then closed, with a leading **Event** column that says which list a row comes from. The name cell links back to the item.

Both exports carry the reference, the origin of a project, the changes of a modified row and the event date.

## Tips
- **Keep contributor profiles updated**: Capacity is based on contributor availability and historical time stats.
- **Use team filters**: Scope the report to a department or function.
- **Check unassigned work**: Helps surface projects with missing allocations or missing leads.
- **Weekly Report for stand-ups**: Export the Weekly Report as XLSX and share it with stakeholders for status meetings.
