# Portfolio Requests

Portfolio Requests are the intake mechanism for new initiatives. Business and IT teams submit requests that get reviewed, scored, and prioritized before converting into projects. Use requests to capture ideas early, evaluate strategic alignment, and maintain a transparent pipeline.

## Getting started

Navigate to **Portfolio Management > Requests** to see your list. Click **New Request** to create your first item.

**Required fields**:
  - **Request Name**: A clear, descriptive title for the initiative

**Strongly recommended**:
  - **Purpose**: Explain what this initiative aims to achieve
  - **Source**: Classification for the origin of work (e.g., IT, Business, Compliance)
  - **Category**: High-level grouping
  - **Requestor**: The person who submitted this request
  - **Target Delivery Date**: When you'd like this delivered

**Tip**: Complete as much information as possible during creation to streamline the review process.

## Where to find it

- Workspace: **Portfolio Management**
- Path: **Portfolio Management > Requests**
- Permissions:
  - You need at least `portfolio_requests:reader` to view requests
  - You need `portfolio_requests:member` to create and edit requests
  - You need `portfolio_requests:admin` for full management

If you don't see Requests in the menu, ask your administrator to grant you the appropriate permissions.

## Working with the list

The requests list shows all portfolio requests with key information at a glance.

**Top scope filter**:
  - **My requests** (default): shows requests where you are involved in any explicit request role:
    - **Requestor**
    - **Business Sponsor** / **IT Sponsor**
    - **Business Lead** / **IT Lead**
    - **Contributors** (Business Contributors or IT Contributors)
  - **My team's requests**: shows requests where any member of your Portfolio team appears in those same explicit request roles. Your own involvement is also included in this scope.
  - **All requests**: shows the full requests grid (with the standard default status behavior).
  - If you are not assigned to a Portfolio team, **My team's requests** is disabled.

**Default columns**:
  - **Request Name**: The initiative title (click to open workspace)
  - **Priority**: Calculated score based on scoring criteria
  - **Status**: Current workflow state
  - **Source**: Request classification
  - **Category**: High-level grouping
  - **Stream**: Sub-category within the category
  - **Company**: Requesting organization
  - **Requestor**: Person who submitted
  - **Target Date**: Desired delivery date
  - **Created**: When the request was submitted

**Filtering**:
  - Quick search covers all text fields
  - Status, Source, Category, Stream, Company, and Requestor columns use checkbox set filters with `All`, `None`, or `N selected` plus an **x** to clear
  - By default, converted requests are hidden (use the Status filter to include Converted or clear the Status filter to show all)

**Actions**:
  - **New Request**: Create a new portfolio request

## The Request workspace

Click any row to open the workspace. It has 6 tabs:

### Overview

Core information about the request.

**What you can edit**:
  - **Request Name**: The title
  - **Purpose**: Description of what this initiative aims to achieve
  - **Source/Category/Stream**: Classification hierarchy
  - **Requestor**: Who submitted this request
  - **Company/Department**: Organizational context
  - **Target Delivery Date**: Desired completion
  - **Status**: Current workflow state

**Status workflow**:

| Status | Meaning | Can transition to |
|--------|---------|-------------------|
| Pending Review | Newly submitted, awaiting initial assessment | Candidate, Approved, Rejected, On Hold |
| Candidate | Under active consideration | Approved, Rejected, On Hold |
| Approved | Cleared for project conversion | Converted |
| On Hold | Temporarily paused | Pending Review, Candidate, Rejected |
| Rejected | Not proceeding | Pending Review |
| Converted | Transformed into a project | (terminal state) |

**Tip**: Status changes prompt you to log a decision with context and rationale for audit purposes.

---

### Analysis

Document feasibility and delivery readiness for this request.

**What you can edit**:
  - **Impacted Business Processes**: Link the business processes affected by the request
  - **Feasibility Review**: Structured 7-dimension matrix with a status and notes per dimension:
    - Technical Feasibility
    - Integration & Compatibility
    - Infrastructure Needs
    - Security & Compliance
    - Resource & Skills
    - Delivery Constraints
    - Change Management
  - **Risks & Mitigations**: Capture residual risks, mitigation actions, and owners

**Feasibility statuses**:
  - `Not assessed`
  - `No concerns`
  - `Minor concerns`
  - `Major concerns`
  - `Blocker`

**Notes entry**:
  - Each dimension has an inline multiline comment field
  - Use **Detailed notes** to expand additional writing space when needed

**Analysis Recommendation**:
  - Click **Submit Recommendation** to publish a formal decision
  - Context is fixed to **Analysis Recommendation**
  - Choose outcome: Go, No-Go, Defer, Need Info, Analysis Complete
  - Optionally change request status in the same submission
  - After submission, the latest recommendation appears directly in Analysis with a link to Activity

---

### Scoring

Evaluate the request against your organization's criteria.

**How it works**:
  - Each criterion defined in Portfolio Settings appears here
  - Select the appropriate value for each criterion
  - The priority score is calculated automatically based on weights
  - If "Mandatory Bypass" is enabled in settings and triggered, score becomes 100

**Override capability**:
  - Enable **Priority Override** to manually set the score
  - Provide justification when overriding
  - Override scores display with a different visual indicator

**Note**: Scoring is frozen once a request is converted to a project.

---

### Team

Assign people responsible for this request.

**Sponsors & Leads**:
  - **Business Sponsor**: Executive accountable from the business side
  - **Business Lead**: Day-to-day business representative
  - **IT Sponsor**: Executive accountable from IT
  - **IT Lead**: Technical representative

**Contributors**:
  - **Business Contributors**: Business stakeholders and contributors
  - **IT Contributors**: Technical team members

---

### Relations

Track dependencies and connections.

**Dependencies**:
  - Link to other requests or projects this depends on
  - Add dependencies by selecting from existing items
  - Dependencies are shown bi-directionally

**Resulting Projects**:
  - Shows projects created from this request after conversion
  - Click to navigate to the project

---

### Activity

Unified collaboration and audit trail (Comments + History).

**What's tracked**:
  - Regular comments
  - Formal decisions (including Analysis Recommendation decisions)
  - Status changes with before/after values
  - Field modifications
  - Who made the change and when

**Formal decisions in Activity**:
  - Enable **Formal decision**
  - Select **Decision Outcome**: Go, No-Go, Defer, Need Info, Analysis Complete
  - Optionally change status
  - Provide context and rationale

## Converting to Project

When a request is approved, you can convert it to a project:

1. Open the approved request
2. Click **Convert to Project**
3. Review the project name and details
4. Select a phase template (optional)
5. Click **Create Project**

The request status changes to "Converted" and links to the new project.

## CSV import/export

Maintain your request pipeline at scale using CSV import and export. This feature supports bulk operations for initial data loading, periodic updates, and data extraction for reporting.

### Accessing CSV features

From the Requests list:
  - **Export CSV**: Download requests to a CSV file
  - **Import CSV**: Upload a CSV file to create or update requests
  - **Download Template**: Get a blank CSV with correct headers

**Permissions required**: `portfolio_requests:admin` for import/export operations.

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
     - `Upsert` (default): Create new requests or update existing ones
     - `Update only`: Only modify existing requests, skip new ones
     - `Insert only`: Only create new requests, skip existing ones

3. **Validate first**: Click **Preflight** to validate your file without making changes. Review errors and warnings.

4. **Apply changes**: If validation passes, click **Import** to commit changes.

### Field reference

**Overview fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `id` | Request UUID | No | For updates; leave blank for new requests |
| `name` | Request name | Yes | Used as unique identifier for matching |
| `status` | Workflow status | No | Accepts code or label |
| `purpose` | What the request aims to achieve | No | |
| `source_name` | Request source | No | Must match existing source name |
| `category_name` | Category | No | Must match existing category name |
| `stream_name` | Stream | No | Must match existing stream name |
| `requestor_email` | Requestor | No | Must match existing user email |
| `company_name` | Company | No | Must match existing company name |
| `department_name` | Department | No | Must match existing department name |
| `target_delivery_date` | Target date | No | Date format: YYYY-MM-DD |

**Analysis fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `risks` | Risks and mitigations | Free text |
| `current_situation` | Legacy analysis field | Backward compatibility only; displayed in "Previous Analysis" for older records |
| `expected_benefits` | Legacy analysis field | Backward compatibility only; displayed in "Previous Analysis" for older records |

`feasibility_review` (structured feasibility matrix) is edited in the workspace and is currently not part of CSV import/export.

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

For the **status** field, you can use either the internal code or a common label:

| Code | Accepted labels |
|------|-----------------|
| `pending_review` | `Pending Review`, `Pending` |
| `candidate` | `Candidate` |
| `approved` | `Approved` |
| `on_hold` | `On Hold` |
| `rejected` | `Rejected` |
| `converted` | `Converted` |

The system automatically normalizes values during import, so `Pending Review`, `pending review`, and `pending_review` all resolve to the same status.

### Matching and updates

Requests are matched by **name** (case-insensitive). When a match is found:
  - With `Enrich` mode: Only non-empty CSV values update the request
  - With `Replace` mode: All fields are updated, empty values clear existing data

If you include the `id` column with a valid UUID, matching uses ID first, then falls back to name.

### Computed and read-only fields

Some fields are export-only and cannot be imported:
  - **Priority score**: Calculated from scoring criteria

### Limitations

  - **Dependencies not included**: Request dependencies must be managed in the workspace
  - **Contributors not included**: Business and IT contributors require workspace configuration
  - **Comments/decisions excluded**: Activity history is not part of CSV import/export
  - **Criteria values require JSON**: The `criteria_values` field expects valid JSON matching your scoring criteria

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

  - **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
  - **In Excel**: Save As → CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
  - **General tip**: If you see garbled characters (`?¿`, `ï»¿`) at the start of your file, the encoding is incorrect.

### Example CSV

```csv
name;status;purpose;source_name;category_name;target_delivery_date;requestor_email
CRM Enhancement;Pending Review;Improve customer tracking;IT;Digital;2026-06-30;john.doe@example.com
New Reporting Tool;Candidate;Better analytics;Business;Analytics;2026-09-15;jane.smith@example.com
```

---

## Sending a link

You can quickly email a link to any request to colleagues or external contacts.

1. Open the request workspace
2. Click **Send link** in the header toolbar (to the left of the navigation arrows)
3. In the dialog:
   - **Select recipients**: Search for existing platform users by name or email, and/or type any email address and press Enter
   - **Add a message** (optional): Include a personal note
   - **Copy link**: Click the copy icon to grab the direct URL
4. Click **Send**

Recipients receive an email with your name, the request title, a direct link, and your message (if provided). This does not change any permissions — it simply notifies the recipients.

**Tip**: You can mix platform users and external email addresses in the same send.

---

## Tips

  - **Score early**: Fill in scoring values during the candidate phase to build your priority queue
  - **Use decisions**: Log formal decisions with context so you have a clear audit trail
  - **Keep feasibility actionable**: For each dimension, capture the concern, impact, and next action
  - **Keep risks current**: Update mitigations and owners as the request evolves
