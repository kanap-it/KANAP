# Portfolio Projects

Portfolio Projects track approved initiatives from planning through completion. They extend the information captured in requests with timeline management, effort tracking, and execution monitoring. Projects can originate from converted requests, be fast-tracked directly, or imported as legacy items.

## Getting started

Navigate to **Portfolio Management > Projects** to see your list. Click **New Project** to create a fast-track or legacy project.

For portfolio-wide scheduling and roadmap simulation, use **Portfolio Management > Planning** (see [Portfolio Planning](portfolio-planning.md)).

**Required fields**:
  - **Project Name**: A clear, descriptive title

**Strongly recommended**:
  - **Purpose**: What this project aims to achieve
  - **Origin**: How the project was created (Fast-track or Legacy)
  - **Source/Category**: Classification for reporting and filtering
  - **Company**: Sponsoring organization

**Tip**: Most projects come from converted requests, which carry over their information automatically.

## Where to find it

- Workspace: **Portfolio Management**
- Path: **Portfolio Management > Projects**
- Permissions:
  - You need at least `portfolio_projects:reader` to view projects
  - You need `portfolio_projects:contributor` to edit existing projects, add comments, attachments, and manage tasks
  - You need `portfolio_projects:member` to create new projects
  - You need `portfolio_projects:admin` for full management including CSV import/export

If you don't see Projects in the menu, ask your administrator to grant you the appropriate permissions.

## Working with the list

The projects list shows all portfolio projects with execution status at a glance.

**Top scope filter**:
  - **My projects** (default): shows projects where you are involved in any explicit project role:
    - **Business Sponsor** / **IT Sponsor**
    - **Business Lead** / **IT Lead**
    - **Contributors** (Business Contributors or IT Contributors)
  - **My team's projects**: shows projects where any member of your Portfolio team appears in those same explicit project roles. Your own involvement is also included in this scope.
  - **All projects**: shows the full projects grid (with the standard default status behavior).
  - If you are not assigned to a Portfolio team, **My team's projects** is disabled
  - Your selection is remembered across sessions — returning to the page restores your last choice

**Default columns**:
  - **Project Name**: The initiative title (click to open workspace)
  - **Priority**: Score carried from request or scored separately
  - **Status**: Current execution state
  - **Origin**: How the project was created (Request, Fast-track, Legacy)
  - **Progress**: Visual progress bar with percentage
  - **Source/Category/Stream**: Classification hierarchy
  - **Company**: Sponsoring organization
  - **Start/End**: Planned dates
  - **Created**: When the project record was created

**Filtering**:
  - Quick search covers all text fields
  - Status, Origin, Source, Category, Stream, and Company columns use checkbox set filters with `All`, `None`, or `N selected` plus an **x** to clear
  - By default, completed projects are hidden (use the Status filter to include Done or clear the Status filter to show all)

**Actions**:
  - **New Project**: Create a fast-track or legacy project

## The Project workspace

Click any row to open the workspace. It has 8 tabs:

### Overview

Core information about the project.

**What you can edit**:
  - **Project Name**: The title
  - **Purpose**: Description of what this project delivers
  - **Origin**: How it was created (read-only after creation)
  - **Source/Category/Stream**: Classification hierarchy
  - **Company/Department**: Organizational context
  - **Status**: Current execution state

**Status workflow**:

| Status | Meaning | Can transition to |
|--------|---------|-------------------|
| Waiting List | Approved but not yet scheduled | Planned, On Hold, Cancelled |
| Planned | Scheduled with dates, not started | In Progress, On Hold, Cancelled |
| In Progress | Active execution | In Testing, Done, On Hold, Cancelled |
| In Testing | Validation and QA phase | In Progress, Done, On Hold, Cancelled |
| On Hold | Temporarily paused | Waiting List, Planned, In Progress, Cancelled |
| Done | Successfully completed | (terminal state) |
| Cancelled | Terminated before completion | (terminal state) |

**Origin types**:
  - **Request**: Converted from an approved portfolio request
  - **Fast-track**: Created directly without going through request workflow
  - **Legacy**: Imported from existing/historical projects

**Tip**: Click the origin chip on "Request" projects to navigate to the source request.

---

### Activity

Complete audit trail of all changes, comments, and decisions.

**What's tracked**:
  - Status changes with before/after values
  - Field modifications
  - Phase and milestone changes
  - Comments and decisions
  - Who made the change and when

**Regular comments**:
  - Add context (optional, e.g., "Steering Committee")
  - Write your comment
  - Click **Add Comment**

**Formal decisions**:
  - Check **Formal decision**
  - Select **Decision Outcome**: Go, No-Go, Defer, Need Info, Analysis Complete
  - Optionally change status as part of the decision
  - Provide **Context** (required)
  - Add **Rationale** explaining the decision

---

### Team

Assign people responsible for this project.

**Sponsors & Leads**:
  - **Business Sponsor**: Executive accountable from the business side
  - **Business Lead**: Day-to-day business representative
  - **IT Sponsor**: Executive accountable from IT
  - **IT Lead**: Technical representative

**Contributors**:
  - **Business Contributors**: Business stakeholders and contributors
  - **IT Contributors**: Technical team members

---

### Timeline

Manage project dates, phases, and milestones. Toggle between a **Table** view and a **Gantt** chart using the view buttons at the top of the tab.

**Project Dates**:
  - **Planned Start/End**: Target dates for the project
  - **Actual Start/End**: Captured automatically based on status changes

**Phase Management** (Table view):

When no phases exist:
  - Select a phase template from the dropdown
  - Click **Apply Template** to create phases

When phases exist:
  - **Reorder phases**: Drag phases up or down using the grip handle in the first column
  - Edit phase names inline
  - Set start/end dates for each phase
  - Change phase status: Pending, In Progress, Completed
  - Toggle the milestone checkbox to create a completion milestone
  - Click **[+]** next to a phase to create a task pre-linked to that phase
  - Click **Replace with Template** to start over (deletes existing phases)
  - Click **Add Phase** to add a custom phase

**Gantt View**:
  - Visual timeline showing phases as horizontal bars on a calendar
  - Color-coded by phase status: orange (Pending), blue (In Progress), green (Completed)
  - **Drag-and-drop**: Drag phase bars to change start/end dates (requires edit permission)
  - Time scale shows months and weeks
  - Only phases with both a start and end date appear on the Gantt

**Milestones**:
  - **Phase milestones**: Created from phases, target date syncs with phase end date
  - **Custom milestones**: Add standalone milestones with any target date
  - Track status: Pending, Achieved, Missed

**Baseline tracking**:
  - When a project moves to "In Progress", dates are captured as baseline
  - Variance shows difference between current planned dates and baseline

---

### Progress

Track effort consumption and execution progress.

**Progress & Effort Consumption**:
  - **Execution Progress**: Slider (0-100%) showing overall completion
  - **IT Effort Consumed**: Actual vs estimated for IT work
  - **Business Effort Consumed**: Actual vs estimated for business work
  - Alerts appear when effort exceeds progress or estimates

**Estimated Effort**:
  - **IT Effort (MD)**: Planned person-days for IT
  - **Business Effort (MD)**: Planned person-days for business

**Actual Effort**:
  - Calculated from time log entries
  - Read-only fields showing totals

**Time Breakdown** (when time has been logged):
  - **Project Overhead**: Time logged directly to the project via the Progress tab
  - **Task Time**: Time logged to individual project tasks
  - **Total Logged**: Combined total with percentages
  - Visual progress bar showing the distribution

**Time Log**:
The Time Log displays all time entries for the project in a unified view:
  - **Source column**: Shows "Project Overhead" for direct project time, or the task title for task time
  - **Category column**: IT or Business indicator
  - **Person, Hours, Notes**: Details of each entry

**Logging project overhead time**:
  - Click **Log Time** to add an entry
  - Select category (IT or Business), person, hours, and notes
  - Edit or delete your own project overhead entries

**Task time entries**:
  - Task time entries appear automatically when time is logged to project tasks
  - These entries are view-only in the Time Log (edit them from the task workspace)
  - Task time contributes to actual effort calculations the same as project overhead

**Contributor time statistics**:
  - Logged time feeds the Contributor workspace time statistics
  - Project overhead + project task time count as **Project** effort for the assigned person
  - Time logged to non-project tasks counts as **Other** effort

**Baseline tracking**:
  - When moving to "In Progress", effort estimates are captured as baseline
  - Variance shows difference between current estimates and baseline

---

### Tasks

Manage project tasks and deliverables.

**Task List**:
  - Shows all tasks for this project
  - Columns: Title, Status, Priority, Phase, Due Date
  - Click any row to open the full task workspace

**Filtering**:
  - **Status filter**: All, Active (hides done/cancelled), or specific status
  - **Phase filter**: All Phases, Project-level, or specific phase
  - Click the filter icon to show/hide filter controls
  - Click the clear button to reset filters

**Creating Tasks**:
  - Click **Add Task** to create a new task
  - Fill in title, description, priority, phase (optional), assignee, and due date
  - The task is automatically linked to this project

**Quick Task Creation**:
  - In the **Timeline** tab, click the **[+]** button next to any phase
  - This opens the task creation dialog with the phase pre-selected

**Task Time Tracking**:
  - Time logged to tasks contributes to the project's actual effort
  - When logging time on a task, select IT or Business category
  - IT time adds to `Actual Effort (IT)`, Business time adds to `Actual Effort (Business)`
  - The **Progress** tab shows:
    - Time Breakdown: Project overhead vs task time summary
    - Time Log: Unified view of all time entries (project overhead + task time)

---

### Scoring

Score or view the priority for this project.

**For projects from requests**:
  - Shows the original request scoring (read-only)
  - Links to the source request for reference

**For fast-track/legacy projects**:
  - Score using the same criteria as requests
  - Supports priority override with justification

---

### Relations

Track dependencies and connections.

**Dependencies**:
  - Link to other requests or projects this depends on
  - Add dependencies by selecting from existing items
  - Dependencies are shown bi-directionally

**Source Requests**:
  - Shows the request(s) this project originated from
  - Click to navigate to the source request

**Business Relations**:
  - Link to applications, business processes, or other entities affected

## CSV import/export

Maintain your project portfolio at scale using CSV import and export. This feature supports bulk operations for initial data loading, periodic updates, and data extraction for reporting.

### Accessing CSV features

From the Projects list:
  - **Export CSV**: Download projects to a CSV file
  - **Import CSV**: Upload a CSV file to create or update projects
  - **Download Template**: Get a blank CSV with correct headers

**Permissions required**: `portfolio_projects:admin` for import/export operations.

### Export options

Three export modes are available:

| Option | Description |
|--------|-------------|
| **Full Export** | All exportable fields—use for reporting and complete data extraction |
| **Data Enrichment** | All importable fields—matches the import template format, ideal for round-trip editing (export → modify → re-import) |
| **Custom Selection** | Choose specific fields to include in your export |

**Template download** (from Import dialog): Downloads a blank CSV with all importable field headers—use this to prepare import files with the correct structure.

### Import workflow

1. **Prepare your file**: Use UTF-8 encoding with semicolon (`;`) separators. Download a template to ensure correct headers.

2. **Choose import settings**:
   - **Mode**:
     - `Enrich` (default): Empty cells preserve existing values—only update what you specify
     - `Replace`: Empty cells clear existing values—full replacement of all fields
   - **Operation**:
     - `Upsert` (default): Create new projects or update existing ones
     - `Update only`: Only modify existing projects, skip new ones
     - `Insert only`: Only create new projects, skip existing ones

3. **Validate first**: Click **Preflight** to validate your file without making changes. Review errors and warnings.

4. **Apply changes**: If validation passes, click **Import** to commit changes.

### Field reference

**Overview fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `id` | Project UUID | No | For updates; leave blank for new projects |
| `name` | Project name | Yes | Used as unique identifier for matching |
| `status` | Execution status | No | Accepts code or label |
| `purpose` | What the project delivers | No | |
| `origin` | How project was created | No | Accepts code or label |
| `source_name` | Project source | No | Must match existing source name |
| `category_name` | Category | No | Must match existing category name |
| `stream_name` | Stream | No | Must match existing stream name |
| `company_name` | Company | No | Must match existing company name |
| `department_name` | Department | No | Must match existing department name |

**Timeline fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `planned_start` | Planned start date | Date format: YYYY-MM-DD |
| `planned_end` | Planned end date | Date format: YYYY-MM-DD |
| `actual_start` | Actual start date | Date format: YYYY-MM-DD |
| `actual_end` | Actual end date | Date format: YYYY-MM-DD |
| `baseline_start_date` | Baseline start | Date format: YYYY-MM-DD |
| `baseline_end_date` | Baseline end | Date format: YYYY-MM-DD |

**Effort fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `execution_progress` | Progress percentage | Number 0-100 |
| `estimated_effort_it` | IT effort estimate (MD) | Number |
| `estimated_effort_business` | Business effort estimate (MD) | Number |
| `actual_effort_it` | Actual IT effort | Export only (calculated) |
| `actual_effort_business` | Actual business effort | Export only (calculated) |
| `baseline_effort_it` | Baseline IT effort | Number |
| `baseline_effort_business` | Baseline business effort | Number |

**Team fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `business_sponsor_email` | Business sponsor | Must match existing user email |
| `business_lead_email` | Business lead | Must match existing user email |
| `it_sponsor_email` | IT sponsor | Must match existing user email |
| `it_lead_email` | IT lead | Must match existing user email |

**Scoring fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `criteria_values` | Scoring criteria | JSON format |
| `priority_score` | Calculated score | Export only |
| `priority_override` | Override enabled | `true` or `false` |
| `override_value` | Manual score | Number |
| `override_justification` | Override reason | Free text |

### Label and code acceptance

For **status** and **origin** fields, you can use either the internal code or a common label:

**Status values**:

| Code | Accepted labels |
|------|-----------------|
| `waiting_list` | `Waiting List`, `Waiting` |
| `planned` | `Planned` |
| `in_progress` | `In Progress`, `Active` |
| `in_testing` | `In Testing`, `Testing` |
| `on_hold` | `On Hold`, `Paused` |
| `done` | `Done`, `Completed`, `Complete`, `Finished` |
| `cancelled` | `Cancelled`, `Canceled` |

**Origin values**:

| Code | Accepted labels |
|------|-----------------|
| `standard` | `Standard` |
| `fast_track` | `Fast Track`, `Fast-track`, `Fasttrack` |
| `legacy` | `Legacy` |

The system automatically normalizes values during import.

### Matching and updates

Projects are matched by **name** (case-insensitive). When a match is found:
  - With `Enrich` mode: Only non-empty CSV values update the project
  - With `Replace` mode: All fields are updated, empty values clear existing data

If you include the `id` column with a valid UUID, matching uses ID first, then falls back to name.

### Computed and read-only fields

Some fields are export-only and cannot be imported:
  - **Priority score**: Calculated from scoring criteria
  - **Actual effort (IT/Business)**: Calculated from time log entries

### Limitations

  - **Phases not included**: Project phases must be configured in the workspace
  - **Tasks not included**: Project tasks require workspace management
  - **Dependencies not included**: Project dependencies must be set up manually
  - **Contributors not included**: Business and IT contributors require workspace configuration
  - **Time log not included**: Time entries must be logged in the workspace
  - **Milestones not included**: Milestone management requires workspace configuration

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

  - **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
  - **In Excel**: Save As → CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
  - **General tip**: If you see garbled characters (`?¿`, `ï»¿`) at the start of your file, the encoding is incorrect.

### Example CSV

```csv
name;status;origin;source_name;category_name;planned_start;planned_end;execution_progress
CRM Upgrade;In Progress;standard;IT;Digital;2026-01-15;2026-06-30;35
Data Warehouse;Planned;Fast Track;Business;Analytics;2026-03-01;2026-12-31;0
Legacy Migration;waiting_list;legacy;Compliance;Infrastructure;2026-07-01;2027-06-30;0
```

---

## Sending a link

You can quickly email a link to any project to colleagues or external contacts.

1. Open the project workspace
2. Click **Send link** in the header toolbar (to the left of the navigation arrows)
3. In the dialog:
   - **Select recipients**: Search for existing platform users by name or email, and/or type any email address and press Enter
   - **Add a message** (optional): Include a personal note
   - **Copy link**: Click the copy icon to grab the direct URL
4. Click **Send**

Recipients receive an email with your name, the project title, a direct link, and your message (if provided). This does not change any permissions — it simply notifies the recipients.

**Tip**: You can mix platform users and external email addresses in the same send.

---

## Tips

  - **Apply templates early**: Set up phases when moving to "Planned" status
  - **Track progress regularly**: Update the execution progress slider to keep dashboards accurate
  - **Log time consistently**: Time entries build your actual effort picture for future estimating
  - **Use baselines**: The variance tracking helps identify scope or schedule creep
