# Business Processes (Master Data)

Business Processes let you manage a catalog of your organization’s core end-to-end processes (e.g. “Order-to-Cash (O2C)”, “Procure-to-Pay (P2P)”, “Hire-to-Retire (H2R)”) in one place. These processes can then be referenced elsewhere in the app (for ownership, reporting, audits, etc.).

You’ll find them under:

- **Master Data → Business Processes**

---

## Who can do what?

- **View list + details**: users with `Business Processes` **Reader** access.
- **Create and edit processes + categories**: users with `Business Processes` **Manager** access.
- **Delete processes + categories, import/export CSV**: users with `Business Processes` **Admin** access.

If you can’t see the page, or fields are read-only, ask your tenant admin to adjust your role permissions.

---

## The Business Processes list

The list page shows all processes for your tenant.

Columns:

- **Name**  
  - Process name including its short code, e.g. `Order-to-Cash (O2C)`.
  - Click to open the process workspace.

- **Categories**  
  - One or more categories that the process belongs to, e.g.:
    - Customer & Sales
    - Supply Chain, Purchasing & Operations
    - Finance & Controlling
  - By default the grid is sorted by the first category name, which naturally groups processes by category.

- **Process Owner**  
  - Displays the user responsible for the process (name or email), based on the **Process Owner** field in the workspace.

- **Status**  
  - `enabled` or `disabled`.
  - Disabled processes are typically historical or no longer used; they can be kept for reference but should not be assigned in new workflows.

- **Updated**  
  - When the process was last updated (hidden by default; you can show it via the column chooser).

Default filters and sorting:

- Filter: shows only **enabled** processes by default.
- Sort: grouped by **Categories** (primary category), then by **Name**.

### Actions on the list

Top-right toolbar (availability depends on your permissions):

- **New** (Manager+)  
  Create a new Business Process. This opens the workspace in “New Business Process” mode.

- **Manage Categories** (Manager+)  
  Opens a dialog where you can rename, activate/deactivate, create, or delete categories.  
  Changes are only saved when you click **Save** in the dialog.

- **Import CSV** (Admin+)  
  Import processes in bulk from a CSV file. See CSV section below.

- **Export CSV** (Admin+)  
  Export all processes to CSV for review or offline editing.

- **Delete Selected** (Admin+)  
  Delete multiple selected processes at once. You’ll see which items were successfully deleted and which failed (with a reason).

---

## Process workspace (details)

Click any row in the list (or the **New** button) to open the process workspace.

The workspace follows a standard layout:

- Left side: a single **Overview** tab (vertical tab bar).
- Top-right: navigation and save controls:
  - **Prev / Next**: move to previous/next process in the current list.
  - **Reset**: discard unsaved changes in the current tab.
  - **Save**: save the current process.
  - **Close**: return to the Business Processes list, keeping filters/sort.

If you don’t have Manager access, fields will be read-only and you’ll see a notice.

### Overview tab fields

1. **Basic info**

   - **Name** (required)  
     - The main process name.  
     - Recommended format: `Plain name (CODE)`, e.g. `Order-to-Cash (O2C)`, `Hire-to-Retire (H2R)`.

   - **Description**  
     - Short description of the process, typically describing the start and end of the process (e.g. “From customer order → delivery/service → invoicing → payment received.”).

   - **Status**  
     - Simple Enabled/Disabled toggle:
       - Enabled: process is active and appears in selectors.
       - Disabled: process is inactive and should not be used for new assignments (but stays visible for history).
     - Use this to retire processes without deleting them so historical references still make sense.

2. **Classification**

   - **Categories** (multi‑select)
     - Assign one or more categories to this process:
       - Customer & Sales
       - Supply Chain, Purchasing & Operations
       - Product & Service Lifecycle
       - HR / People Processes
       - Finance & Controlling
       - IT & Support Functions
       - Governance, Strategy & Compliance
     - You can:
       - Pick existing categories.
       - Click **New category** to create a simple new category inline.
       - Click **Edit categories** to open the full category management dialog (see below).

   - **Process Owner**
     - A user in your tenant who is ultimately responsible for this process.
     - Used for:
       - Visibility in the grid (Process Owner column).
       - Future assignments, notifications, and approvals.

   - **IT Owner**
     - A user in your tenant responsible for the IT side of the process (tools, systems, integrations).
     - Intended for IT operations, incident routing, and change management.

3. **Details**

   - **Notes**
     - Free-form field for internal information:
       - Links to process maps or SOPs.
       - Notes about scope, exceptions, or ownership.
       - References to audits or improvement plans.

---

## Managing categories

Categories are shared across all Business Processes and can be edited in one place.

You can access category management in two ways:

1. From the list page:
   - Click **Manage Categories**.

2. From the workspace:
   - Under the **Categories** field, click **Edit categories**.

This opens the **Manage Business Process Categories** dialog.

### What you can do in the dialog

For each category you can:

- **Rename** – edit the name field (e.g. shorten “Supply Chain, Purchasing & Operations” to “Supply Chain & Ops”).
- **Activate/Deactivate** – toggle whether the category is active:
  - Active categories appear in selectors by default.
  - Inactive categories are hidden for new assignments but preserved for existing processes.
- **Delete** – remove the category:
  - Only possible if it is not used by any process.
  - If it’s in use, the delete will fail with a message.

You can also:

- **New category** – create a new category row at the bottom of the list.

### Save and cancel behavior

- **No changes are saved until you click `Save`.**
- While the dialog is open:
  - Edits, toggles, and deletions are tracked locally.
  - You can undo changes by closing the dialog with **Cancel**.
- When you click **Save**:
  - The app:
    - Creates any new categories you added.
    - Updates renamed or reactivated/deactivated categories.
    - Deletes categories you removed (if they are not in use).
  - If something goes wrong (e.g. duplicate name, category in use), an error is shown and the dialog stays open so you can fix the issue.
- **Cancel** closes the dialog and discards any unsaved changes.

---

## CSV import/export

CSV import/export is intended for bulk editing or onboarding your list of business processes.

### Exporting

On the Business Processes list page, click **Export CSV** (Admin access required).

- You can export:
  - A **template** (header only).
  - **Data** (all processes for the current tenant).
- Format:
  - Separator: semicolon (`;`).
  - Encoded as UTF‑8 (with BOM) for Excel compatibility.
  - Columns:
    - `name` – full process name, including the short code.
    - `categories` – one or more category names, separated by semicolons inside the cell (e.g. `Customer & Sales; Finance & Controlling`).
    - `description`
    - `notes`
    - `status` – `enabled` or `disabled`.

### Importing

On the Business Processes list page, click **Import CSV** (Admin access required).

Workflow:

1. Open the import dialog.
2. Upload your CSV file (must follow the template header and use `;` as separator).
3. Run a **Preflight check**:
   - Validates headers and basic data.
   - Shows how many rows will be inserted vs updated.
4. If preflight is OK, click **Load** to apply the changes.

Behavior:

- Existing processes are matched by **Name** (case-insensitive) per tenant:
  - If a row’s `name` matches an existing process:
    - That process is **updated**.
  - If there’s no match:
    - A new process is **created**.
- Categories:
  - For each row, the `categories` cell is split on `;`.
  - Each category name is trimmed and:
    - If it already exists, it’s reused.
    - If it doesn’t exist, a new active category is created.
  - Category links for the process are then synchronized with the list from the CSV.
- Status and lifecycle:
  - `status` is used to set the enabled/disabled state.
  - `disabled_at` is not imported; you can refine lifecycle dates in the workspace later if needed.

Tips:

- Use the Export CSV (data) option to get a current snapshot, modify it, and then re-import.
- Keep the name + code convention (`Order-to-Cash (O2C)`) consistent to avoid accidental duplicates.

---

## How Business Processes will be used in the app

The Business Processes page is the **single source of truth** for your ISO 9001-style core processes. It’s designed to be reused by other parts of the app:

- **Ownership**:
  - Process Owner and IT Owner will be used to:
    - Default task assignees.
    - Route notifications for incidents, changes, audits, and risks tied to specific processes.

- **Linking**:
  - Other modules (Applications, Interfaces, Tasks, Audits, Risk register) can reference Business Processes by ID so you always know which end-to-end process is impacted.

- **Reporting**:
  - Future reports can group OPEX/CAPEX, incidents, or tasks **by business process**, giving you a process-centric view rather than a purely organizational or account-based view.

For now, the focus is on getting the master data right—names, categories, and owners—so that when these cross-cutting features appear, they all point to the same clean, centralized process catalog.
