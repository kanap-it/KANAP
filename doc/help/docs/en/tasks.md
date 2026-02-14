# Tasks

Tasks help you track action items, deliverables, and work packages across your KANAP entities. They are used for renewal reminders, follow-ups, compliance checks, project deliverables, and any other work that needs tracking.

## Getting started

Navigate to **My Workspace → Tasks** to see all tasks across your organization. Click **New** to create a task.

### Creating a new task

When you click **New**, the full task workspace opens. To create a task:

1. **Enter the title** (required):
   - Type the task title in the text field at the top

2. **Choose task type** (optional):
   - **Standalone task**: Leave "Related To" empty to create an independent task not linked to any entity
   - **Linked task**: Select a type (Project, OPEX, Contract, or CAPEX) and then the specific item

3. **Fill in optional details**:
   - **Task Type**: Select a category for the work (e.g., Task, Bug, Problem, Incident). Defaults to "Task" if available
   - **Description**: Add detailed information using the rich text editor (supports formatting, lists, links, images)
   - **Phase**: For project tasks, select a phase or leave as "Project-level"
   - **Classification** (standalone tasks only): Set Source, Category, Stream, and Company
   - **Status**: Defaults to "Open"
   - **Priority**: Defaults to "Normal"
   - **Dates**: Set start and due dates
   - **Assignee**: Defaults to you; change if needed

4. Click **Create** when ready (enabled once title is set)

**Tip**: You can paste images directly into the description. They're automatically uploaded to storage when you create the task.

**Note**: Tasks can also be created from within other workspaces (OPEX items, Contracts, CAPEX items, Portfolio Projects) where the relation is pre-selected.

**Required fields**:
  - **Title**: A short description of what needs to be done

**Strongly recommended**:
  - **Description**: Detailed description of the task
  - **Assignee**: Who is responsible
  - **Due Date**: When it needs to be completed

---

## Where to find it

- Path: **My Workspace → Tasks**
- Permissions:
  - You need at least `tasks:reader` to view tasks
  - You need `tasks:member` to create and edit tasks
  - You need `tasks:admin` for bulk deletion

If you don't see Tasks in the menu, ask your administrator to grant you the appropriate permissions.

---

## Working with the list

The Tasks grid shows all tasks across your organization.

**Top scope filter**:
  - **My tasks** (default): shows tasks assigned to you
  - **My team's tasks**: shows tasks assigned to any member of your Portfolio team (including yours)
  - **All tasks**: shows the full tasks grid
  - If you are not assigned to a Portfolio team, **My team's tasks** is disabled
  - Your selection is remembered across sessions — returning to the page restores your last choice

**Default columns**:
  - **Task Title**: The task name (click to open workspace)
  - **Context**: The entity type (Project, OPEX, Contract, CAPEX, or "Standalone")
  - **Related Entry**: The linked entity (empty for standalone tasks)
  - **Phase**: Project phase (for project tasks)
  - **Status**: Current state as a colored chip
  - **Score**: Calculated priority score (all tasks have scores)
  - **Assignee**: Assigned person
  - **Due Date**: When the task is due

**Status colors**:
  - **Open**: Blue
  - **In Progress**: Yellow
  - **Done**: Green
  - **Cancelled**: Gray

**Priority colors**:
  - **Blocker**: Red
  - **High**: Orange
  - **Normal**: Gray
  - **Low**: Blue
  - **Optional**: Green

**Default filter**: Completed tasks are hidden by default. Clear the Status filter to see all tasks.

**Actions**:
  - **New**: Create a standalone task (requires `tasks:member`)
  - **Delete Selected**: Remove selected tasks (requires `tasks:admin`)

---

## The Task workspace

Click any row to open the task workspace. The workspace uses a Jira-inspired sidebar layout with the following sections:

### Main Content Area

**Priority Score Badge** (project tasks only): A circular badge displaying the calculated priority score appears to the left of the title. This score combines the parent project's priority with the task's priority level adjustment.

**Title**: Click the title to edit it inline. Changes are tracked in the activity history.

**Description**: Click "Click to add description" to enter edit mode. The description supports rich text formatting.

**Activity Section**: Toggle between three views:
  - **Comments**: Add comments and view the comment thread
  - **History**: View all changes to the task with timestamps
  - **Work Log**: View and manage time entries

### Sidebar Sections

The collapsible sidebar contains:

**Status**:
  - Current status displayed as a colored chip
  - Change status dropdown (if not read-only)
  - Note: Cannot change to "Done" without logging time first

**Context**:
  - Task Type dropdown (e.g., Task, Bug, Problem, Incident)
  - Related object (Project, OPEX item, Contract, CAPEX item, or "Standalone Task")
    - During creation: optional dropdowns to select type and item (leave empty for standalone)
    - After creation: read-only link (relation cannot be changed)
  - Phase (for project tasks only; appears after selecting a project)
  - Priority level
  - **Classification** (for standalone and project tasks only):
    - **Standalone tasks**: Editable dropdowns for Source, Category, Stream, and Company
    - **Project tasks**: Read-only display with "(from project)" labels showing inherited values
    - **OPEX/Contract/CAPEX tasks**: Classification section is hidden

**Dates**:
  - Start date
  - Due date

**People**:
  - Assignee
  - Creator (for project tasks)

**Time**:
  - Total time spent (displayed as hours and man-days)
  - "Log Time" button to add time entries

---

## Task statuses

| Status | Meaning | When to use |
|--------|---------|-------------|
| **Open** | Not yet started | Default for new tasks |
| **In Progress** | Work has begun | When someone starts working on it |
| **Done** | Completed successfully | When the work is finished (requires time logged) |
| **Cancelled** | No longer needed | When the task becomes irrelevant |

**Important**: For project tasks, you cannot mark a task as "Done" until you have logged at least some time. This ensures accurate effort tracking.

---

## Priority levels

| Priority | Use case |
|----------|----------|
| **Blocker** | Blocking other work; immediate attention required |
| **High** | Important and time-sensitive |
| **Normal** | Standard priority (default) |
| **Low** | Can be deferred if needed |
| **Optional** | Nice-to-have, address when capacity allows |

---

## Time tracking

Tasks support detailed time tracking through the Work Log feature.

### Logging time

1. Click the **Log Time** button in the sidebar Time section
2. Select the **Category**: IT or Business (determines how time contributes to project effort)
3. Enter the date the work was performed
4. Enter time as days and/or hours
5. Add optional notes describing the work
6. Click **Log Time**

**Category**: For project tasks, the category determines whether the time counts toward the project's IT effort or Business effort. This matches the project's own time logging system.

### Viewing time entries

The Work Log tab shows all time entries for the task:
  - Date the work was performed
  - Category (IT or Business)
  - Person who logged the time
  - Hours logged
  - Notes

### Editing or deleting entries

You can edit or delete your own time entries from the Work Log table.

---

## Attachments

Tasks support file attachments for documents, screenshots, and other supporting files.

### Adding attachments

1. Click the **Attach files** button in the task header
2. The upload area appears below the description
3. Either:
   - Drag and drop files onto the upload area, or
   - Click **Browse files** to select files from your computer
4. Files appear as chips below the description once uploaded

**File size limit**: Maximum 20 MB per file.

### Managing attachments

- **Download**: Click on an attachment chip to download the file
- **Delete**: Click the × button on the chip to remove the attachment (requires edit permission)

Attachments are visible to anyone who can view the task.

---

## Comments and history

### Adding comments

1. Select the **Comments** tab in the activity section
2. Optionally add a context (e.g., "Weekly standup")
3. Type your comment
4. Click **Add Comment**

### Viewing history

The **History** tab shows all changes to the task:
  - Status changes
  - Field modifications
  - Who made each change and when

---

## Creating tasks from other workspaces

Tasks are most commonly created from within other workspaces:

### From Portfolio Projects
In the Project workspace, use the **Tasks** tab to manage project deliverables:
- Create tasks for specific work packages
- Assign tasks to project phases
- Track time against each task

**Tip**: In the Timeline tab, click the **[+]** button next to a phase to create a task pre-linked to that phase.

### From OPEX items
In the OPEX workspace, use the **Tasks** tab to create tasks like:
- "Review vendor pricing for 2026"
- "Negotiate volume discount"

### From Contracts
In the Contract workspace, use the **Tasks** tab for:
- "Review contract before renewal deadline"
- "Request updated terms from vendor"

### From CAPEX items
In the CAPEX workspace, tasks track project milestones:
- "Complete requirements gathering"
- "Obtain budget approval"

These tasks automatically link to the parent entity and appear in both the task list and the parent workspace.

---

## Standalone tasks

Standalone tasks are independent work items not linked to any specific project, contract, or budget item. They're useful for:
- General IT operations work
- Ad-hoc requests
- Cross-cutting initiatives
- Personal task tracking

### Creating standalone tasks

1. Click **New** in the Tasks page
2. Leave the "Related To" dropdowns empty
3. The sidebar shows "Standalone Task" instead of a linked entity
4. Fill in the title, description, and other details
5. Click **Create**

### Classification for standalone tasks

Standalone tasks have editable classification fields that help organize work by portfolio dimensions:

- **Source**: Where the work originated (e.g., Business Request, IT Initiative)
- **Category**: The portfolio category for the work
- **Stream**: The specific stream within the category (filtered by selected category)
- **Company**: The company this work relates to

These fields appear in the Context section of the sidebar and can be edited at any time.

### Priority scoring

Standalone tasks (and all non-project tasks) use a fixed priority score based on their priority level:

| Priority Level | Score |
|---------------|-------|
| Blocker | 110 |
| High | 90 |
| Normal | 70 |
| Low | 50 |
| Optional | 30 |

Blocker tasks score 110 to ensure they always rank above even the highest-priority project tasks (max 100).

---

## Project tasks

Project tasks have additional features compared to regular tasks:

**Priority score**: Project tasks display a calculated priority score that combines:
- The parent project's priority score
- An adjustment based on the task's priority level (+10 for Blocker, +5 for High, 0 for Normal, -5 for Low, -10 for Optional)

The score is displayed as a circular badge to the left of the task title in the workspace, matching the project's score display style. In the task list, the Score column shows this calculated value.

**Phase assignment**: Tasks can be assigned to specific project phases or marked as "Project-level" for cross-cutting work.

**Time contribution**: Time logged to project tasks contributes to the project's actual effort calculations:
- IT category time adds to `Actual Effort (IT)`
- Business category time adds to `Actual Effort (Business)`
- The project Progress tab shows a breakdown of Project Overhead vs Task Time
- The unified Time Log displays all time entries from both project overhead and task work

**Status validation**: Project tasks cannot be marked as "Done" without logging time first. This ensures accurate project effort tracking.

**Filtering**: The project Tasks tab includes filters for:
- Status (All, Active, specific status)
- Phase (All Phases, Project-level, specific phase)

---

## CSV import/export

Manage tasks at scale using CSV import and export. This feature supports bulk operations for initial data loading, task migrations, and data extraction for reporting.

### Accessing CSV features

From the Tasks list:
  - **Export CSV**: Download tasks to a CSV file
  - **Import CSV**: Upload a CSV file to create or update tasks
  - **Download Template**: Get a blank CSV with correct headers

**Permissions required**: `tasks:admin` for import/export operations.

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
     - `Upsert` (default): Create new tasks or update existing ones
     - `Update only`: Only modify existing tasks, skip new ones
     - `Insert only`: Only create new tasks, skip existing ones

3. **Validate first**: Click **Preflight** to validate your file without making changes. Review errors and warnings.

4. **Apply changes**: If validation passes, click **Import** to commit changes.

### Field reference

**Basic fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `id` | Task UUID | No | For updates; leave blank for new tasks |
| `title` | Task title | Yes | Part of unique identifier |
| `description` | Task details | No | Supports plain text |

**Context fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `related_object_type` | Entity type | No | Empty for standalone tasks; accepts code or label |
| `related_object_id` | Entity UUID | Conditional | Required if linked task and `related_object_name` not provided |
| `related_object_name` | Entity name | Conditional | Required if linked task and `related_object_id` not provided |
| `phase_name` | Project phase | No | Must match existing phase name (project tasks only) |
| `priority_level` | Task priority | No | Accepts code or label |
| `source_name` | Source | No | Portfolio source (standalone tasks only) |
| `category_name` | Category | No | Portfolio category (standalone tasks only) |
| `stream_name` | Stream | No | Portfolio stream (standalone tasks only) |
| `company_name` | Company | No | Company (standalone tasks only) |

**Standalone tasks**: Leave `related_object_type`, `related_object_id`, and `related_object_name` empty. You can set classification fields (`source_name`, `category_name`, `stream_name`, `company_name`) for standalone tasks.

**Tip**: For new linked task imports, use `related_object_name` instead of `related_object_id`—it's much easier to work with. The system resolves the name to the correct ID based on `related_object_type`. For round-trip imports (export → edit → re-import), both fields are included so matching works correctly.

**Status and dates**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `status` | Task status | Accepts code or label |
| `start_date` | Start date | Date format: YYYY-MM-DD |
| `due_date` | Due date | Date format: YYYY-MM-DD |

**People fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `assignee_email` | Responsible person | Must match existing user email |
| `creator_email` | Task creator | Export only |
| `viewer_email_1` through `_4` | Viewers | Must match existing user emails |
| `owner_email_1` through `_4` | Owners | Must match existing user emails |

**Other fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `labels` | Task labels | Comma-separated list |

### Label and code acceptance

For **status**, **priority_level**, and **related_object_type** fields, you can use either the internal code or a common label:

**Status values**:

| Code | Accepted labels |
|------|-----------------|
| `open` | `Open` |
| `in_progress` | `In Progress`, `Active`, `Working` |
| `done` | `Done`, `Completed`, `Complete`, `Finished`, `Closed` |
| `cancelled` | `Cancelled`, `Canceled` |

**Priority level values**:

| Code | Accepted labels |
|------|-----------------|
| `blocker` | `Blocker`, `Critical`, `Urgent` |
| `high` | `High` |
| `normal` | `Normal`, `Medium`, `Default` |
| `low` | `Low` |
| `optional` | `Optional`, `Nice to have` |

**Related object type values**:

| Code | Accepted labels |
|------|-----------------|
| `project` | `Project` |
| `spend_item` | `Spend Item`, `Spend` |
| `contract` | `Contract` |
| `capex_item` | `CAPEX Item`, `CAPEX` |

The system automatically normalizes values during import.

### Matching and updates

Tasks are matched by **title + related_object_id** (case-insensitive). When a match is found:
  - With `Enrich` mode: Only non-empty CSV values update the task
  - With `Replace` mode: All fields are updated, empty values clear existing data

If you include the `id` column with a valid UUID, matching uses ID first, then falls back to title + related object.

**Note**: If you provide `related_object_name` instead of `related_object_id`, the system resolves the name to the ID before matching. This means you can use human-readable names throughout your import file.

### Export-only fields

Some fields appear in exports but cannot be imported. These are system-managed fields that maintain data integrity:

| Field | Why it's export-only |
|-------|---------------------|
| `creator_email` | Automatically set to the user who creates the task. Allowing import would compromise audit trail integrity—you shouldn't be able to falsify who created a task. For new tasks, the system sets this to the importing user; for existing tasks, the original creator is preserved. |

These fields are included in **Full Export** for reporting purposes but excluded from **Template** and **Data Enrichment** exports since they cannot be modified during import.

### Limitations

  - **Maximum 4 viewers/owners**: Tasks support up to 4 viewer emails and 4 owner emails via CSV
  - **Classification for standalone only**: Source, Category, Stream, and Company can only be set on standalone tasks
  - **Phase requires project**: Phase assignment only works for project tasks
  - **Comments not included**: Task comments and history must be managed in the workspace
  - **Time log not included**: Time entries must be logged in the workspace
  - **Attachments not included**: File attachments require workspace management

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

  - **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
  - **In Excel**: Save As → CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
  - **General tip**: If you see garbled characters (`?¿`, `ï»¿`) at the start of your file, the encoding is incorrect.

### Example CSV

Using human-readable names (recommended for new imports):

```csv
title;related_object_type;related_object_name;status;priority_level;due_date;assignee_email;source_name;category_name
Review contract terms;Contract;Acme Software License;Open;High;2026-02-28;john.doe@example.com;;
Update documentation;project;Website Redesign;In Progress;Normal;2026-03-15;jane.smith@example.com;;
Schedule kickoff;spend_item;Cloud Hosting 2026;open;low;2026-04-01;bob.wilson@example.com;;
Audit IT security;;;open;high;2026-03-01;security@example.com;IT Initiative;Security
```

The last row is a **standalone task** (no related object) with classification fields set.

Using UUIDs (typically from round-trip exports):

```csv
title;related_object_type;related_object_id;status;priority_level;due_date;assignee_email
Review contract terms;Contract;550e8400-e29b-41d4-a716-446655440000;Open;High;2026-02-28;john.doe@example.com
Update documentation;project;660e8400-e29b-41d4-a716-446655440001;In Progress;Normal;2026-03-15;jane.smith@example.com
Schedule kickoff;spend_item;770e8400-e29b-41d4-a716-446655440002;open;low;2026-04-01;bob.wilson@example.com
```

---

## Sending a link

You can quickly email a link to any task to colleagues or external contacts.

1. Open the task workspace
2. Click **Send link** in the header toolbar (to the left of the navigation arrows)
3. In the dialog:
   - **Select recipients**: Search for existing platform users by name or email, and/or type any email address and press Enter
   - **Add a message** (optional): Include a personal note
   - **Copy link**: Click the copy icon to grab the direct URL
4. Click **Send**

Recipients receive an email with your name, the task title, a direct link, and your message (if provided). This does not change any permissions — it simply notifies the recipients.

**Tip**: You can mix platform users and external email addresses in the same send.

---

## Tips

  - **Use due dates**: Set realistic due dates to track deadlines effectively.
  - **Assign owners**: Every task should have an assignee for accountability.
  - **Log time regularly**: Time tracking helps with future project estimation.
  - **Filter by status**: The default filter hides completed tasks—clear it to see historical tasks.
  - **Create from context**: Creating tasks from within workspaces automatically links them.
  - **Use priority wisely**: Reserve "Blocker" for genuinely blocking issues.
  - **Add context to comments**: The context field helps track where discussions happened (e.g., "Sprint Review").
