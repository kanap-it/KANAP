# Portfolio Requests

Portfolio Requests are the intake layer for proposed work. A request lets you capture the business need, assess feasibility, score priority, collect supporting knowledge, and decide whether the initiative should move forward as a project. In practice, this is where ideas become governed work instead of hallway folklore.

## Where to find it

- Workspace: **Portfolio**
- Path: **Portfolio > Requests**

### Permissions

| Permission | What it allows |
| --- | --- |
| `portfolio_requests:reader` | Open the requests list and view request workspaces |
| `portfolio_requests:member` | Edit the managed request documents embedded in the workspace, even without broader request-management rights |
| `portfolio_requests:manager` | Create requests, update request data, maintain team and relations, add comments and decisions, change status, submit analysis recommendations, and edit scoring |
| `portfolio_requests:admin` | Delete requests and use CSV import/export |

The **Knowledge** tab follows Knowledge permissions for creation and linking actions. A user can be allowed to work on request content without being allowed to create or relink standalone knowledge documents.

## Working with the list

The list is designed for triage rather than archival browsing. By default, it sorts requests by priority so the most urgent or most strategically important work rises first.

### Scope filters

Use the scope selector above the grid to control whose pipeline you are looking at:

- **My requests** shows requests where you are explicitly involved, such as requestor, sponsor, lead, or contributor.
- **My team's requests** expands that view to requests involving members of your Portfolio team. This option is unavailable if you are not assigned to a team.
- **All requests** removes the involvement filter and shows the full request pipeline.

Your scope choice is remembered. If you open a request from the list and come back later, KANAP keeps the list context so you do not have to rebuild your filter stack every time.

### Default columns

The standard grid highlights the fields that matter during intake and review:

- **#**
- **Request Name**
- **Priority**
- **Status**
- **Source**
- **Category**
- **Stream**
- **Company**
- **Requestor**
- **Target Date**
- **Created**

Additional columns, such as **Last changed**, can be surfaced through grid preferences when needed.

### Filtering behavior

- Global search works across request content and visible business metadata.
- Column filters are available for the main classification and ownership fields.
- Requests with status **Converted** are hidden by default so the list stays focused on active intake. If you need to review historical intake decisions, include **Converted** in the Status filter.

### List actions

- **New Request** is available to request managers.
- **Import CSV** and **Export CSV** are available to request administrators.

## The Request workspace

The current workspace uses a split model:

- The main area is for narrative, analysis, scoring, activity, and knowledge.
- The right-hand property sidebar is for stable request metadata, team assignment, and relations.

This matters because not everything is saved the same way:

- Changes in the **property sidebar** are applied directly to the request.
- Changes in **Summary**, **Analysis**, and **Scoring** are workspace edits and use **Save** / **Reset**.
- The managed documents **Purpose** and **Risks & Mitigations** also use the workspace save flow.

If you create a new request, KANAP starts on **Summary**. The other tabs become useful after the request exists as a real record rather than a very sincere idea.

The workspace header gives you operational context without leaving the page:

- a copyable request reference such as `REQ-42`
- the current status
- the origin task when the request was created from task work
- **Send link** for sharing
- previous/next navigation based on the exact list context you came from

### Property sidebar mental model

Treat the sidebar as the request's structural backbone.

#### Core Properties

This section holds the identity and classification of the request:

- Request Name
- Status
- Source, Category, and Stream
- Requestor
- Company and Department
- Target Delivery Date

These fields shape how the request is routed, filtered, and reviewed elsewhere in the workspace. For example:

- changing **Status** affects what decisions can follow and whether conversion is available
- changing **Category** or **Stream** changes the analytical context for feasibility and scoring
- changing **Company** or **Requestor** changes reporting and ownership visibility across the portfolio

#### Team

The Team section assigns responsibility rather than just keeping a contact list:

- Business Sponsor
- Business Lead
- IT Sponsor
- IT Lead
- Business Contributors
- IT Contributors

These assignments drive shared visibility and make it clear who is expected to sponsor, shape, and deliver the request. Summary uses this data to show whether the request has enough named ownership to move forward sensibly.

#### Relations

Relations explain how the request fits into the wider portfolio:

- **Dependencies** identify work that must exist, finish, or remain aligned before this request can succeed.
- **Resulting Projects** show what was created from the request after conversion.

This section is important for impact analysis. A request with weak relation data may look harmless until it collides with existing work.

Older bookmarks may still point to `overview`, `team`, or `relations`. In the current workspace, that content lives in **Summary** and the property sidebar.

## Summary

**Summary** is the request cockpit. It is not a simple overview tab; it is where KANAP compresses the state of the request into an operational snapshot.

Summary includes:

- **Status Snapshot**, including current status, current priority, linked business processes, and latest activity
- **Analysis Snapshot**, including the strongest feasibility signal and the latest analysis recommendation
- **Team and Knowledge**, including role coverage, contributor count, origin task, and linked knowledge counts
- the managed **Purpose** document
- a **Recent Activity** feed

Use Summary when you need to understand whether the request is merely recorded or actually ready to be discussed, scored, and converted.

### Purpose as a managed document

The **Purpose** section is a managed markdown document embedded directly in the request. It is more than a long description field:

- it gives reviewers a stable statement of intent
- it is available during request-to-project conversion
- it can be edited by users with `portfolio_requests:member`, even if they do not manage the rest of the request

That split is deliberate. It allows subject-matter contributors to improve the request narrative without opening full control over status, scoring, and portfolio structure.

## Activity

**Activity** separates discussion from audit trail:

- **Comments** is the collaboration stream
- **History** is the change log

### Comments

Comments support normal discussion, but they also support **formal decisions**. A formal decision can capture:

- the meeting or decision context
- the decision outcome
- the rationale
- an optional status change in the same action

That combination is important. It keeps governance traceable: the record of *why* something changed stays attached to the change instead of being reconstructed later from memory and optimism.

Comments support markdown and inline images, which is useful for design notes, evidence, screenshots, and review material.

### History

History is the audit view. Use it when you need to answer questions such as:

- who changed the status
- when team assignments changed
- whether a scoring or analysis change happened before or after a decision

If you need narrative, use Comments. If you need proof, use History.

## Analysis

**Analysis** is where the request moves from "sounds reasonable" to "understood well enough to decide."

It brings together four distinct elements:

- impacted business processes
- structured feasibility review
- managed **Risks & Mitigations**
- the formal **Analysis Recommendation**

### Impacted Business Processes

Link the business processes touched by the request. This changes the meaning of the request in portfolio terms: a request affecting core operational processes should not be evaluated the same way as a local convenience improvement.

### Feasibility Review

The feasibility review is a structured assessment across seven dimensions. Each dimension can be assessed with a concern level and supporting notes.

Use this section to expose delivery friction early:

- not every request fails because the idea is poor
- many fail because integration, infrastructure, security, timing, or change-management constraints were ignored until too late

The Summary tab surfaces the strongest concern level from this review so major issues remain visible even when nobody opens Analysis.

### Risks & Mitigations

**Risks & Mitigations** is another managed markdown document. Use it to document residual risk, mitigation actions, and ownership. Like Purpose, it can be edited by users with `portfolio_requests:member`.

This is useful when the people best placed to describe the risks are not the same people who should be changing request status or portfolio structure.

### Analysis Recommendation

The recommendation flow publishes a formal decision into Activity with the fixed context **Analysis Recommendation**. It can also change the request status at the same time.

That means Analysis is not an isolated note-taking area. It is part of the governance trail:

- reviewers can see the latest recommendation directly in Analysis
- the same recommendation appears in Activity as a decision record
- optional status changes stay tied to the recommendation that justified them

Older requests may also show a **Previous Analysis (Legacy)** section. That content is retained for continuity, but the current request model relies on feasibility review, managed risks, and formal recommendations.

## Scoring

**Scoring** evaluates the request against the portfolio scoring model configured for your tenant.

In practice:

- each active criterion contributes to the calculated priority
- the resulting score feeds portfolio comparison and list ordering
- an override can be used when the calculated score is correct mathematically but wrong operationally

If priority override is used, it should be treated as an exception, not a lifestyle.

Where enabled by portfolio settings, mandatory bypass rules can force top priority for qualifying requests. This is typically used for work that cannot sensibly compete with discretionary demand.

Once a request is **Converted**, scoring becomes read-only. At that point the request has already done its job as an intake and prioritization record.

## Knowledge

The **Knowledge** tab connects the request to standalone knowledge documents. It is not just an attachments shelf with better posture.

The tab distinguishes between two kinds of knowledge:

- **Linked documents** are directly attached to the request.
- **Related documents** are discovered through the request's wider context, such as dependencies, related requests, resulting projects, and other linked objects.

This distinction matters:

- direct documents are part of the request's explicit documentation set
- related documents add context without claiming that the request owns them

### What you can do

With sufficient Knowledge permissions, you can:

- create a new blank knowledge document already linked to the request
- create a linked document from a template
- link an existing knowledge document
- unlink a directly linked document
- open any linked or related document in the Knowledge workspace

Without those permissions, the tab still works as a reference view as long as you are allowed to see the underlying knowledge.

### Managed documents versus Knowledge documents

The managed documents **Purpose** and **Risks & Mitigations** are part of the request itself. They are not the same thing as Knowledge documents.

Use managed documents for core request narrative that should always travel with the request. Use Knowledge for standalone documents that may need their own lifecycle, relations, exports, templates, and reuse beyond a single request.

## Converting a request to a project

Once a request reaches **Approved**, the workspace offers **Convert to Project**.

The conversion flow lets you:

- confirm or adjust the project name
- set planned start and end dates
- review the current Purpose text
- carry forward estimated IT and Business effort derived from request scoring inputs

After conversion:

- the request becomes a durable intake and decision record
- the resulting project appears in the request's Relations section
- scoring is frozen on the request
- the request can still be opened for audit, context, and knowledge tracing

In other words, conversion does not erase the request. It promotes it.

## CSV import and export

CSV import and export are available to `portfolio_requests:admin`.

Use export when you need portfolio reporting or offline enrichment. Use import when you need to create or update requests in bulk. Because import can alter intake records at scale, it is intentionally reserved for administrators.
