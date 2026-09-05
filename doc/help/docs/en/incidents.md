# Incident register

The incident register is the logbook of the notable events that affected your IT: the outage that stopped invoicing for three hours, the ransomware attempt caught by the mail filter, the storage failure that lost a day of backups. Each incident gets a permanent number, a timestamped journal that nobody can rewrite, and links to the assets, applications, tasks and documents involved.

It is not a helpdesk. Day-to-day tickets stay in your ticketing tool; the register keeps the events your management, your auditors and your insurer will ask about a year from now.

## What belongs in the register

Log an incident when the event is worth remembering:

- Service interruptions that affected users, customers or a business process
- Security events: intrusion attempts, malware, data leaks, lost devices
- Data loss or corruption, failed restores, backup gaps
- Serious supplier or hosting failures, breached service levels
- Anything you will have to explain later, or report to an authority

Do not log routine work: password resets, single-user problems, standard change requests, or a ticket that was solved in ten minutes with no impact. A good register holds a handful of entries per month, not thousands.

**Tip**: keep the ticket number in the **External reference** field so anyone can jump back to the operational trail in your ticketing tool.

---

## Getting started

Navigate to **IT Landscape > Incidents** to see the register. Click **New incident** to log one.

**Required fields**:

- **Title**: a short factual summary, e.g. "Mail service unavailable at the Lyon office"
- **Severity**: Critical, Major, Minor or Low
- **Detected**: when the incident was noticed (defaults to now)

**Recommended on the same screen**:

- **Description**: what happened, as observed
- **Category**: infrastructure, security, application, data, supplier, other (configurable, see [Categories](#categories))
- **Started**: when the incident actually began, if it differs from when you noticed it
- **Owner**: who is responsible for handling it

**Reporter** defaults to you. Both dates accept past values, so an incident discovered on Monday morning can be recorded as having started on Saturday night.

**Permissions**:

- View: `incidents:reader`
- Create, edit, journal, links, attachments: `incidents:contributor`
- Reopen, cancel, and lift a restriction: `incidents:admin`

A restricted incident is hidden from everyone except register administrators, the reporter and the owner. On a stock tenant that means Administrator and IT Landscape Administrator, plus whoever logged or owns that record. Readers and contributors who are not the reporter or owner do not see it in the list, in search, in chat or in a CSV export. Opening it by reference returns the same “not found” as a missing number. Linked tasks keep the `INC-N` reference but drop the title.

**Restrict to register administrators** is in the properties drawer, under Classification. A contributor can turn it on while they can still see the record; only an administrator can turn it off, including after the incident is closed. The change is written to the journal. The audit log, document relation chips and “recently viewed” still show the title to people who already have those screens.

---

## Working with the list

The list is the register itself: every incident, newest detection first.

**Default columns**:

| Column | What it shows |
|--------|---------------|
| **Ref** | Incident reference (e.g. `INC-14`), monospaced |
| **Title** | Short summary (click to open the incident) |
| **Category** | Classification from IT Landscape settings |
| **Severity** | Critical, Major, Minor, Low, with a coloured dot |
| **Status** | Open, In progress, Resolved, Closed, Cancelled, with a coloured dot |
| **Detected** | When the incident was noticed |
| **Resolved** | When service was restored |
| **Owner** | Person responsible |
| **Assets** | Number of linked assets |
| **Tasks** | Number of follow-up tasks |

**Default sort**: **Detected** descending (most recent first).

**Additional columns** (hidden by default, available via the column chooser): **Closed**, **Applications**, **Created**.

**Filtering**: Category, Severity, Status and Owner offer checkbox filters whose options are computed from the incidents currently in view, so you only see values that exist in the result set. Date columns offer date filters, including a range: filter **Detected** between two dates to produce a quarterly or yearly extract. The search box matches the title, the description, the reference (`INC-14`), and the names and references of linked assets and applications, so a search for a hostname such as `PAR-ESX-01` lists the incidents on that asset.

**Tip**: combine Severity = Critical, Major with a **Detected** range to build the shortlist most steering committees and audits ask for.

Whatever you filter carries over into the incident you open, so **Previous / Next** in the workspace walks that same shortlist.

---

## The incident workspace

Click any row to open the incident. The workspace has a **header** with the reference and quick metadata, a **properties drawer** on the right, and a **content area** in the centre that switches with each tab.

### Header and metadata

The header shows the title (editable in place), the reference `INC-N` (click to copy), the lifecycle actions, and **Previous / Next** to walk the filtered list.

The metadata line underneath shows **Status**, **Severity**, **Owner**, **Detected** and, once the incident is resolved, the **Duration** between detection and resolution. Severity, Owner and Detected can be changed straight from that line.

### Properties drawer

The drawer stays visible on every tab and saves as you edit.

**Classification**:

- **Category**: from the list configured in IT Landscape settings
- **Severity**: Critical, Major, Minor, Low. Pick the level that reflects the business impact at the time; every change is journaled, so raising or lowering it later is normal and traceable
- **Status**: Open, In progress, Resolved, Closed. The status only moves forward. Going back is done with **Reopen**, so the register cannot be quietly rewound
- **Restrict to register administrators**: hide the incident from other readers and contributors. The reporter and the owner still see it. Only an administrator can lift the restriction, including after close. When it is on, the metadata line shows **Restricted**

**Dates**:

- **Started**: when the incident actually began
- **Detected**: when it was noticed (required)
- **Resolved**: filled in automatically when you set the status to Resolved, and editable while the incident is open, so you can correct it to the real restoration time
- **Closed**: read-only, stamped when the incident is closed

**People**: **Reporter** (who logged it) and **Owner** (who handles it).

**Source**: **External reference** for the ticket number, alert id or mail reference where the incident was first reported.

**Compliance**: **Personal data affected**, **Authority notification required**, **Notified on** (appears once notification is required) and **Parties informed**.

**Record**: **Created** and **Updated** timestamps, read-only.

---

### Overview

Five sections tell the story of the incident, in the order an incident report is normally read. Each one saves automatically as you type.

- **Description**: what happened, as observed
- **Impact**: services, sites and users affected
- **Root cause**: why it happened
- **Corrective actions**: what was done to fix it and to prevent it. Track the actual follow-up work as linked tasks
- **Lessons learned**: what to keep from this incident

For a minor incident the description alone is enough. For a major one, the five sections are the post-mortem.

---

### Journal

The journal is what makes this a register rather than a form. It lists everything that happened to the incident, most recent first, and **nothing in it can be edited or deleted**, by anyone, at any time.

**Adding a note**: type it in the composer at the top and click **Add** (or press Ctrl+Enter). The date and time next to the button set the moment the note refers to. It defaults to now, and you can set it to the past: a note added on Tuesday can be recorded as having happened at 23:40 on Saturday, and it will sort into the timeline at that point. KANAP separately stores the moment the note was actually saved, and that timestamp is never editable, so backdating stays honest.

**Automatic entries** appear alongside your notes:

| Entry | When it is written |
|-------|--------------------|
| **System** | On creation: "Incident logged" |
| **Status change** | Every status change, shown as "Status: In progress → Resolved" |
| **Severity change** | Every severity change, same format |
| **Reopened** | On reopening, with the reason you gave |
| **Links updated** | When assets or applications are linked or unlinked, naming them |

Each row shows the author, the time it refers to (hover for "3 days ago"), and the kind of entry for anything that is not a plain note.

The composer disappears once the incident is closed or cancelled. Field edits made outside the journal, such as correcting the impact text, are recorded in the platform audit trail rather than in the journal.

---

### Relations

- **Assets**: the servers, VMs or devices involved. Search and select; linking and unlinking is journaled
- **Applications**: the applications and services affected, same behaviour
- **Tasks**: the follow-up work. Create a task directly from the incident, and it stays attached to it. The task shows "Incident · INC-14" in its own sidebar, and the incident's Tasks column counts it

Linking is done from the incident side only. A linked asset or application shows the incident in a read-only **Incidents** section on its own Relations tab, so anyone looking at a server sees its history of trouble.

---

### Documents

Knowledge documents linked to this incident: the post-mortem, the supplier's report, the procedure that was followed. With `knowledge:member` you can create a document straight from this tab.

---

### Attachments

Drag and drop files or click to select them: screenshots, log extracts, mail exports, the supplier's incident report. Click an attachment to download it. Uploads and deletions stop once the incident is closed.

---

## Closing, reopening and cancelling

**Resolved** means service is restored. **Closed** means the record is final.

Closing locks the incident. Fields, journal notes, links, attachments and task creation are all refused, in the interface and through the API. The Overview shows a one-line banner: "Closed on 12 Mar 2026. Reopen it to make changes."

**Reopen** (`incidents:admin`) takes a resolved, closed or cancelled incident back to In progress and clears the resolution and closing dates. A reason is required and is written into the journal, so the record shows why it was touched again.

**Cancel** (`incidents:admin`) is for a record that should never have existed: a duplicate, or an event logged in error. A reason is required, the status becomes Cancelled, and the incident is locked like a closed one. Nothing is deleted and the number stays in place, so `INC-13` never disappears between `INC-12` and `INC-14`. A gap in the numbering would be the first thing an auditor asks about.

There is no delete.

---

## Compliance and audit evidence

Two switches in the drawer carry the regulatory part of the record:

- **Personal data affected**: turn it on as soon as personal data was exposed, altered or lost. It is the flag your data protection officer filters on
- **Authority notification required**: turn it on when the event has to be reported, for instance to a data protection authority, a national cyber agency or a sector regulator. **Notified on** then records when you filed, and **Parties informed** lists who was told: regulator, insurer, affected customers, group security

Deadlines and thresholds depend on your jurisdiction and sector. KANAP records the facts and the dates; it does not decide whether you must notify.

**What the register gives an auditor**:

- A continuous, numbered sequence with no deletions and no gaps
- For each incident: when it started, when it was noticed, when it was resolved and closed, and who owned it
- A journal that cannot be rewritten, with every status and severity change dated and attributed
- The evidence itself, as attachments and linked documents
- The corrective actions, and the follow-up tasks that prove they were carried out
- Filtered views by period, severity, category or compliance flag, straight from the list
- A CSV export of the register (**Export CSV** on the list), for auditors and for your own archive. Restricted incidents are omitted unless you are allowed to see them; the file includes a **Restricted to register administrators** column that can be imported
- A PDF report of a single incident (**Export PDF** in the workspace), for the auditor who wants one record rather than the whole register

**Importing an existing register**: **Import CSV** on the list takes a CSV file. Leave the reference column empty to create incidents (KANAP allocates the next INC numbers), or keep the INC-N reference to update the matching records. Each imported incident gets a journal entry saying it came from a file. Export first if you want the exact column layout.

---

## Export a PDF report for an auditor

Open an incident and click **Export PDF** in the header actions. KANAP downloads a PDF of that record: `INC-12-incident-report.pdf`. The download uses your signed-in session; it is not a public link.

The report follows the language of the interface (English, French, German or Spanish). It includes the header and properties, the overview texts that were filled in, the journal in chronological order, linked assets, applications, tasks and documents, the compliance fields, and the attachments (file name, size and date). Empty sections are left out.

Export is a read. It works on a closed or cancelled incident; the record stays locked. The button is not shown on **New incident**.

---

## Categories

Incident categories are yours to define, in **IT Landscape > Settings**, under **Incidents > Incident categories**. KANAP ships with infrastructure, security, application, data, supplier and other.

Keep the list short. Categories are what you will group a year of incidents by, and a list of thirty is a list nobody uses consistently. Rather than deleting a category that is already in use, mark it deprecated: it disappears from the selector for new incidents while the existing ones keep their history.

---

## Ask the assistant

Plaid can query the register in chat, with the same permissions as the rest of the application. Ask it for a count ("How many critical incidents this quarter?"), a filtered list ("List of open incidents on PAR-ESX-01"), or a full record ("Summary of INC-2"). The last one includes the journal. Incident references such as `INC-12` in the answer are links to the workspace.

---

## Tips

- **Log early, complete later**: create the incident while it is happening, with a title and a severity. The journal is built for adding facts as they arrive
- **Write notes as facts, with times**: "13:05 failover to the secondary site, mail back for 40 users". Set the date and time so the timeline reflects the incident, not your typing speed
- **Backdate honestly**: Started and Detected are meant to hold the real times. The recorded time of each journal entry is kept separately and cannot be changed
- **One incident, not one per ticket**: a single outage that generated forty tickets is one incident, linked to the assets involved
- **Turn actions into tasks**: text in Corrective actions describes the intent; a task with an assignee and a due date is what actually gets done
- **Close deliberately**: closing is the point where the record becomes evidence. Fill in the root cause and the lessons learned before you close, because after that it takes an administrator to reopen it
- **Review the register quarterly**: filter by period and severity, look at the recurring categories and the assets that appear more than once. That is where the next budget request comes from
