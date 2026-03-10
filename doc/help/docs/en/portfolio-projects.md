# Portfolio Projects

Portfolio Projects are the execution workspaces for approved initiatives. They are where delivery is planned, progress is tracked, workload is measured, tasks are coordinated, and project-specific knowledge is connected back to the rest of KANAP.

Projects usually come from approved requests, but they can also be created directly as **Fast-track** or **Legacy** projects when the request stage is not part of the process.

For portfolio-wide sequencing and roadmap work, use [Portfolio Planning](portfolio-planning.md). The Projects area is for running the work once a project exists.

## Where to find it

- Workspace: **Portfolio**
- Path: **Portfolio > Projects**

## Permissions

- `portfolio_projects:reader`: open the list and view project workspaces
- `portfolio_projects:contributor`: update the managed **Purpose** document and maintain project-overhead time entries
- `portfolio_projects:manager`: create projects and manage project data, status, team, relations, timeline, progress, tasks, scoring, comments, and decisions
- `portfolio_projects:admin`: includes manager capabilities and can also import/export CSV and maintain other users' project-overhead time entries
- Knowledge viewing also requires Knowledge access
- Creating or linking standalone knowledge also requires a Knowledge creation role

If Projects does not appear in the navigation, ask an administrator for access.

## Working with the list

The project list is designed to answer two questions quickly: "what should I care about?" and "what is moving?"

**Scope selector**

- **My projects** shows projects where you are explicitly involved as sponsor, lead, or contributor
- **My team's projects** expands that view to projects involving members of your portfolio team
- **All projects** removes that involvement filter
- If you are not assigned to a portfolio team, the team scope is unavailable
- Your scope preference is remembered, so the list comes back the way you left it

**Default behavior**

- Projects are sorted by priority score unless you change the sort
- Projects in **Done** status are hidden by default
- Search works across text content
- Status, origin, source, category, stream, and company filters are available directly in the grid

**What the grid emphasizes**

- Reference number (`PRJ-...`) and name for quick identification
- Priority and status for execution posture
- Origin so you can distinguish request-based work from fast-track or legacy work
- Progress for delivery visibility
- Classification fields for reporting and slicing the portfolio
- Planned dates and creation date for scheduling context

Opening a project from the list preserves the current list context. That matters because the project workspace uses the same context for **Previous** and **Next** navigation, so you can review a filtered set without losing your place.

**Bulk administration**

- **New Project** is available to managers
- **Import CSV** and **Export CSV** are available to administrators

## Creating a project

Direct project creation is for work that should enter execution without a separate request record.

- New projects open on **Summary** only
- Until the project is saved the first time, the other tabs are unavailable
- Directly created projects use an origin of **Fast-track** or **Legacy**
- Request-origin projects keep their request origin and source linkage

Use **Fast-track** for work that is genuinely being introduced directly into delivery. Use **Legacy** for work that already exists outside the normal intake history. That distinction affects reporting and makes later portfolio analysis much less confusing.

## Workspace mental model

The project workspace has two layers:

- The **main content area** for operational tabs: **Summary**, **Activity**, **Timeline**, **Progress**, **Tasks**, **Scoring**, and **Knowledge**
- A persistent **Project Properties** sidebar for core properties, team assignment, and relations

This is the most important behavior change from the older documentation: **Team** and **Relations** are no longer standalone tabs. They now live in the sidebar and stay available while you work anywhere else.

For existing projects, the sidebar behaves like a live property panel: changes there are saved immediately. The main tab content follows the usual **Save** and **Reset** workflow when that tab contains draft changes. If you switch tabs or move to the previous or next project with unsaved workspace changes, KANAP asks whether to save first.

## Header and navigation

The workspace header is not just decoration; it is the project's control strip.

- The `PRJ-...` chip is the stable human-readable reference and can be copied directly
- The status chip shows the current execution state
- The origin chip shows how the project entered the portfolio
- Request-origin projects expose a direct path back to the source request
- The progress bar in the header shows current execution progress without leaving the page
- **Previous** and **Next** move through the current list result set, not through all projects in the system
- **Send link** emails the current project URL with an optional message

Sending a link does not grant access. It only shares the location. Permissions remain exactly as they were before the email was sent, which is how it should be.

## Project Properties sidebar

Treat the sidebar as the project's persistent identity card.

### Core Properties

The core section holds the project fields that define how the project appears elsewhere in KANAP:

- project name
- status
- origin during initial creation only
- source, category, and stream
- company and department
- planned start and planned end

These fields drive reporting, planning, filtering, and default portfolio context. Classification choices are especially important because they affect where the project appears in cross-portfolio analysis.

Changing status from the sidebar is more than a label update. KANAP opens a status-change dialog so the transition can be recorded properly. That is where you can log the change as a formal decision, capture context, and store the rationale with the transition instead of letting it disappear into hallway memory.

The workflow is intentionally controlled:

- **Waiting List** can move to **Planned**, **On Hold**, or **Cancelled**
- **Planned** can move to **In Progress**, **On Hold**, or **Cancelled**
- **In Progress** can move to **In Testing**, **Done**, **On Hold**, or **Cancelled**
- **In Testing** can move back to **In Progress**, or forward to **Done**, **On Hold**, or **Cancelled**
- **On Hold** can return to **Waiting List**, **Planned**, or **In Progress**, or be **Cancelled**
- **Done** and **Cancelled** are terminal states

### Team

Team assignment is part of the sidebar so it stays available while you work on schedule, effort, or tasks.

- Business Sponsor / IT Sponsor capture executive accountability
- Business Lead / IT Lead identify day-to-day leadership
- Business Contributors / IT Contributors define the wider working team

These assignments do more than fill boxes:

- they determine what appears in **My projects** and **My team's projects**
- they feed project context in summary and reporting
- they define who is available for effort allocation in the **Progress** tab

If leads and contributors are wrong, your effort planning will also be wrong.

### Relations

The relations section brings together the links that explain how the project fits into the rest of the portfolio.

- **Dependencies** track delivery dependencies on other requests or projects
- **Source Requests** show the request record that produced the project
- additional relations capture connected business and technical context

Dependencies are operational, not cosmetic. They shape how delays and sequencing should be interpreted. Source request links preserve the chain from intake to execution, which is essential when someone later asks, "why are we doing this project at all?"

## Summary

The **Summary** tab is the project cockpit. It is meant to answer the current state of the project in a single pass, not to duplicate every field in the sidebar.

The summary cards cover:

- current status and priority
- delivery window and schedule variance
- effort consumption and task posture
- team and relation coverage
- knowledge footprint
- latest activity

This tab is where a manager can understand whether the project is merely alive in the database or actually under control.

### Purpose

The **Purpose** section on Summary is a managed project document, not a disposable note field.

- use it for the narrative brief of the project: intent, expected outcome, scope boundaries, and any framing that should travel with the project
- purpose changes follow the workspace **Save** and **Reset** flow
- contributors can update the Purpose even when they cannot manage the rest of the project

This split is deliberate. It allows narrative ownership to be broader than structural project administration.

The managed Purpose document is different from the **Knowledge** tab:

- **Purpose** is the embedded, project-owned brief
- **Knowledge** is for standalone documents that may need their own lifecycle, reuse, or relationships

## Activity

The **Activity** tab separates conversation from audit evidence:

- **Comments** for discussion, contextual notes, and formal decisions
- **History** for the audit trail of field and status changes

Managers can add and edit project comments. Comments can also be recorded as formal decisions, with an outcome and an optional status change. Use that when the discussion itself changes the project's course.

Images can be included in activity comments when visual evidence is useful. That is handy for architecture sketches, screenshots, or review evidence.

Use **History** when you need to know what changed. Use **Comments** when you need to know why.

## Timeline

The **Timeline** tab is where the delivery structure becomes explicit.

### Project dates

Timeline shows both planned and actual dates.

- planned dates describe the intended delivery window
- actual dates are captured by execution events and are read-only in the workspace

Once the project enters execution, KANAP also captures baseline dates so later schedule drift can be measured instead of guessed.

### Phases

Projects can start with a phase template or a fully custom phase plan.

- if no phases exist yet, apply a template to create the initial structure
- once phases exist, they can be reordered, renamed, dated, and status-managed
- phases can be marked as milestones
- each phase includes a shortcut to create a task already linked to that phase and project
- **Replace with Template** rebuilds the phase structure, so use it only when you really mean "start the phase model over"

The phase model affects more than the timeline:

- the active phase appears back in **Summary**
- phase-linked tasks inherit delivery context immediately
- phase milestones provide completion markers without creating a separate tracking scheme

### Milestones

Milestones can be created in two ways:

- by enabling milestone tracking on a phase
- by adding standalone milestones manually

Phase-linked milestones follow the phase they are attached to. Standalone milestones are for checkpoints that should exist outside the phase structure.

### Table and Gantt views

The timeline can be managed as a table or as a Gantt view.

- use the table when you are shaping the structure
- use the Gantt when you need to see overlap, sequencing, and date spread

Only phases with usable start and end dates appear meaningfully on the Gantt. If the dates are vague, the chart will be equally vague.

## Progress

The **Progress** tab combines execution progress, workload planning, and actual time consumption. That combination matters because a project that reports 80% progress with 20% of the effort consumed is not necessarily efficient; it may simply be badly estimated.

### Progress and workload

- **Execution Progress** is the overall completion signal for the project
- **Workload consumption** compares actual effort with planned effort

Keep these two numbers aligned with reality. If progress advances without corresponding effort, or effort accumulates without delivery movement, the mismatch is usually telling you something important about scope, estimation, or reporting discipline.

### Estimated effort and allocations

Progress separates estimated effort into:

- **IT effort**
- **Business effort**

Each side can be allocated across the relevant lead and contributors. Those allocations depend on the team configured in the sidebar, so team changes have planning consequences here as well.

### Actual effort and time log

Actual effort is calculated from two sources:

- **Project Overhead** time logged directly on the project
- **Task Time** logged from the project's tasks

The time log merges both into one view and identifies the source for each entry. This is intentional: project effort should be understood as the whole delivery footprint, not as a fight between "project work" and "task work."

Important consequences:

- task time contributes to project actual effort automatically
- task time is visible here but must be corrected in the task workspace
- project-overhead entries are maintained from the Progress tab
- contributors can maintain their own project-overhead entries
- administrators can maintain project-overhead entries across users

### Baseline effort

When the project moves to **In Progress**, KANAP captures baseline effort values. Later changes are shown as variance against that baseline, which is useful for distinguishing normal delivery updates from quiet scope creep.

## Tasks

The **Tasks** tab is the project's execution queue.

- tasks created here are automatically linked to the project
- tasks can also be created directly from a timeline phase, which links them to both the project and the selected phase
- the tab supports status filtering and phase filtering
- the default task view focuses on active work by hiding done and cancelled items

This tab is for managing project-linked tasks in context, not for replacing the full task workspace. Opening a task takes you to its own workspace, where task-specific detail and time logging continue.

From a project perspective, the important consequence is this: task status and task time are not isolated. They feed back into **Summary** and **Progress**, so neglected tasks make the whole project picture less trustworthy.

## Scoring

The **Scoring** tab keeps delivery tied to prioritization.

- for request-origin projects, the source request remains visible as the scoring reference
- for fast-track and legacy projects, scoring is maintained directly on the project
- managers can review or update scoring, including priority overrides where portfolio rules allow it

The resulting priority score matters outside this tab:

- it appears in the project header
- it is visible in the list
- it affects how projects rank when the list is sorted by priority

If scoring drifts away from delivery reality, portfolio discussions become harder than they need to be.

## Knowledge

The **Knowledge** tab connects the project to standalone Knowledge documents.

It distinguishes between:

- **linked documents**: documents directly attached to the project
- **related documents**: documents discovered through other linked entities such as source requests, dependencies, or connected items

This distinction matters:

- direct links represent documentation that the project explicitly owns or uses
- related links provide context without pretending that everything belongs directly to the project

Depending on your Knowledge permissions, you can:

- create a new blank document already linked to the project
- create a linked document from a template
- link an existing document
- unlink directly linked documents
- open any linked or related document in Knowledge

If you can open the project but do not have Knowledge viewing rights, KANAP will tell you that knowledge exists without exposing the document content. That is expected behavior, not a broken tab.

Knowledge also surfaces back into **Summary**, where the project shows how much standalone documentation is linked and when that documentation was last updated.

## CSV import and export

Project CSV tools are available from the list page to administrators.

### Export

Exports support:

- **Full Export**
- **Data Enrichment**
- **Custom Selection**

Use **Data Enrichment** when you want to export, adjust selected fields externally, and import the result back into KANAP with minimal drama.

### Import

Imports are designed for controlled bulk changes:

- download a template first when you need the correct structure
- validate before importing
- use advanced options to choose enrichment vs replacement behavior and insert/update rules

Bulk import is useful for large portfolio maintenance, but it is not a shortcut around project governance. Phase planning, tasks, knowledge, and ongoing delivery control still belong in the workspace.

## Sending a link

Use **Send link** from the workspace header to email a direct project link to internal or external recipients.

- you can send it to platform users or to any email address
- you can include an optional message
- the copied or emailed link points directly to the project workspace

Again, sending a link does not grant access. It only saves people from hunting for the project themselves.

## Practical guidance

- Use the sidebar for structural data that should stay visible while you work.
- Use **Summary** for the project narrative and high-level operating picture.
- Use **Timeline** to define delivery structure before task volume grows.
- Use **Progress** regularly, otherwise effort variance arrives as a surprise even though the data was already warning you.
- Use **Knowledge** for reusable or governed documentation, not as a second copy of the Purpose brief.
