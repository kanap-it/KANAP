# Business Processes Master Data (ISO 9001-style Core Processes)

Status: current  
Last Updated: 2025-11-16

This document describes the Business Processes master data used across the app to model ISO 9001-style core business processes (Order-to-Cash, Procure-to-Pay, Hire-to-Retire, etc.).

It covers:
- The data model and default taxonomy
- Permissions and RLS behavior
- Frontend grid + workspace UX
- CSV import/export
- How other modules should integrate with this master data

---

## Concepts

- **Business Process**: A named end-to-end process such as “Order-to-Cash (O2C)” or “Hire-to-Retire (H2R)”. Each process:
  - Has a human-readable name that includes the short code in parentheses (e.g. `Order-to-Cash (O2C)`).
  - Has a description and internal notes.
  - Can be linked to one or more categories (Customer & Sales, Finance & Controlling, etc.).
  - Has lifecycle fields (`status`, `disabled_at`) to support enable/disable semantics.
  - Has **Process Owner** and **IT Owner** user references.

- **Business Process Category**: A lightweight classification bucket (e.g. “Customer & Sales”, “IT & Support Functions”) used to group processes in the grid and for filtering.

- **Business Process Category Link**: Join table enabling many-to-many mapping between processes and categories.

The Business Processes master data is tenant-scoped and RLS-protected; each tenant can tailor the taxonomy to fit their organization while benefiting from the seeded defaults.

---

## Data Model

### Tables

**business_processes**
- `id uuid PK`
- `tenant_id uuid NOT NULL DEFAULT app_current_tenant()`
- `name text NOT NULL`  
  - Includes the code, e.g. `Order-to-Cash (O2C)`.
- `description text NULL`
- `notes text NULL`
- `status status_state NOT NULL DEFAULT 'enabled'`
- `disabled_at timestamptz NULL`
- `owner_user_id uuid NULL` → FK to `users(id) ON DELETE SET NULL`
- `it_owner_user_id uuid NULL` → FK to `users(id) ON DELETE SET NULL`
- `is_default boolean NOT NULL DEFAULT false` (seeded items only; internal flag)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Indexes:
- `idx_business_processes_tenant_status(tenant_id, status)`
- `idx_business_processes_owner_user(owner_user_id)`
- `idx_business_processes_it_owner_user(it_owner_user_id)`
- `idx_business_processes_unique_name(tenant_id, lower(name))` (enforces unique name per tenant)

RLS:
- Enabled and forced.
- Tenant isolation policy: `tenant_id = app_current_tenant()` for both `USING` and `WITH CHECK`.

**business_process_categories**
- `id uuid PK`
- `tenant_id uuid NOT NULL DEFAULT app_current_tenant()`
- `name text NOT NULL`
- `is_default boolean NOT NULL DEFAULT false`
- `is_active boolean NOT NULL DEFAULT true`
- `sort_order integer NOT NULL DEFAULT 100`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Indexes:
- `idx_business_process_categories_tenant(tenant_id)`
- `idx_business_process_categories_unique_name(tenant_id, lower(name))`

RLS:
- Enabled and forced with tenant isolation policy as above.

**business_process_category_links**
- `id uuid PK`
- `tenant_id uuid NOT NULL DEFAULT app_current_tenant()`
- `process_id uuid NOT NULL` → FK to `business_processes(id) ON DELETE CASCADE`
- `category_id uuid NOT NULL` → FK to `business_process_categories(id) ON DELETE CASCADE`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Indexes:
- `idx_business_process_category_links_tenant_process(tenant_id, process_id)`
- `idx_business_process_category_links_unique(tenant_id, process_id, category_id)` (enforces no duplicate links)

RLS:
- Enabled and forced with tenant isolation policy as above.

### Ownership fields

- **Process Owner** (`owner_user_id`):
  - Intended to represent the business/functional owner (e.g. “Head of Sales Operations”).
  - Used in the grid as the “Process Owner” column (displaying the user’s name or email).

- **IT Owner** (`it_owner_user_id`):
  - Intended to represent the IT contact responsible for tools/systems supporting the process.
  - At the moment, this is surfaced in the workspace, not in the grid; downstream modules can use it for routing or escalation.

---

## Permissions and RLS

### Resource key

Business Processes use a dedicated permission resource:

- `resource = 'business_processes'`

This is wired in `PermissionsService.RESOURCES` and is available in the RBAC UI similarly to Companies, Departments, Suppliers, etc.

### Levels

- **Reader (`business_processes:reader`)**
  - Can list and view:
    - `GET /business-processes`
    - `GET /business-processes/ids`
    - `GET /business-processes/:id`
    - `GET /business-process-categories`
  - No create, update, delete, or CSV actions.

- **Manager (`business_processes:manager`)**
  - All reader capabilities, plus:
    - `POST /business-processes`
    - `PATCH /business-processes/:id`
    - `POST /business-process-categories`
    - `PATCH /business-process-categories/:id`
  - Can:
    - Create and edit processes (name, category links, description, notes, owners, lifecycle).
    - Create new categories and rename/activate-deactivate existing ones.

- **Admin (`business_processes:admin`)**
  - All manager capabilities, plus:
    - `DELETE /business-processes/bulk`
    - `DELETE /business-processes/:id`
    - `DELETE /business-process-categories/:id` (enforced only when category not used)
    - `GET /business-processes/export`
    - `POST /business-processes/import`
  - Can run bulk delete and CSV import/export.

### Default assignment

The Business Processes migration:

- Grants `business_processes:admin` to any role named **Administrator** per tenant (if not already set).
- Keeps RLS fully enforced; all queries run under `app_current_tenant()` and only see the calling tenant’s data.

---

## Frontend UX

### Navigation

- **Master Data Sidebar**:
  - `Master Data → Business Processes` (`/master-data/business-processes`)
  - Requires `business_processes:reader` to access.

- **Master Data Home**:
  - Card: “Business Processes – Manage ISO 9001-style core business processes”.

### Grid (Business Processes list)

Route: `/master-data/business-processes`  
Component: `frontend/src/pages/BusinessProcessesPage.tsx`

Key behaviors:

- Columns:
  - `Name` (clickable cell → opens workspace).
  - `Categories` (first category label; value formatted as a comma-separated list of assigned categories).
  - `Process Owner` (display-only, computed from `owner_user_id` → user’s full name or email).
  - `Status` (Enabled / Disabled; AG Grid set filter).
  - `Updated` (hidden by default; sortable).

- Default sort and filter:
  - Sort: primary category name, then process name (`primary_category_name:ASC`).
  - Filter: Status = `enabled` (i.e. active processes).

- Actions (top-right):
  - `New` (manager+): opens workspace create mode.
  - `Manage Categories` (manager+): opens category management dialog.
  - `Import CSV` (admin+): opens CSV Import dialog.
  - `Export CSV` (admin+): opens CSV Export dialog.
  - `Delete Selected` (admin+): multi-select delete via `/business-processes/bulk`.

- Navigation context:
  - Uses the standardized workspace pattern with `sort`, `q`, and `filters` persisted in the URL when opening the workspace so that closing the workspace returns to the same grid view.

### Workspace (Business Process)

Route:
- `/master-data/business-processes/:id/overview`  
Component: `frontend/src/pages/business-processes/BusinessProcessWorkspacePage.tsx`  
Editors:
- `BusinessProcessOverviewEditor` (existing)  
- `BusinessProcessCreateEditor` (new)

Structure:

- Vertical tabs (left):
  - Single tab: **Overview** (future tabs could add metrics or mappings).

- Header:
  - Title: `New Business Process` or the process name.
  - Subtitle: `Process X of Y` (prev/next navigation across the current list).
  - Controls: `Prev`, `Reset`, `Save`, `Next`, `Close`.

Overview fields:

1. **Basic info**
   - `Name` – required; includes the short code, e.g. `Order-to-Cash (O2C)`.
   - `Description` – short narrative; shown just under Name.
   - `Status` – simple Enabled/Disabled toggle; the UI does not show a date picker for business processes (the backend still tracks `disabled_at` internally for consistency).

2. **Classification**
   - `Categories` – multi-select:
     - Chips-based selector listing active categories.
     - Supports selecting multiple categories for cross-cutting processes (e.g. P2P under both Supply Chain and Finance).
     - Includes two action buttons:
       - `New category` – inline creation of simple categories.
       - `Edit categories` – opens Manage Categories dialog (see below).
   - `Process Owner` – `UserSelect` bound to `owner_user_id`.
   - `IT Owner` – `UserSelect` bound to `it_owner_user_id`.

3. **Details**
   - `Notes` – free-text field to capture internal notes, SOP links, process map URLs, etc.

Permissions:

- When user lacks `business_processes:manager`, the editor is read-only and displays an info banner explaining that manager access is required to edit.

### Category Management

Dialog: `BusinessProcessCategoryManagerDialog`  
Access:
- From the grid via `Manage Categories` button.
- From the workspace via `Edit categories` helper under the Categories field.

Behavior:

- Lists all categories for the tenant (active + inactive), sorted by `sort_order` then name.
- Per category:
  - Editable `Name` text field.
  - `Active` toggle.
  - `Delete` button (only succeeds if category is not linked to any process).
- `New category` button:
  - Adds a new row locally (not persisted until Save).

Save model:

- All edits are **local** until the user clicks `Save`.
  - Renames, active/inactive toggles, and deletions are stored in memory.
  - The dialog text explicitly states: “Changes are only saved when you click Save.”
- On `Save`:
  - Computes differences between original and edited lists:
    - Deletes: `DELETE /business-process-categories/:id`.
    - Creates: `POST /business-process-categories` with `{ name, is_active }`.
    - Updates: `PATCH /business-process-categories/:id` with changed `name` and/or `is_active`.
  - If any operation fails, the dialog stays open and shows the error.
  - On success, the dialog closes and notifies the caller via `onUpdated`; category selectors pick up changes via React Query.
- `Cancel` closes the dialog and discards unsaved changes.

---

## CSV Import/Export

Endpoint: `/business-processes/export` and `/business-processes/import`  
Frontend: `CsvExportDialog` / `CsvImportDialog` wired to `/business-processes`.

### Export

- Scope:
  - `scope=template` → header-only file.
  - `scope=data` → current tenant’s processes with all fields.
- Format:
  - Semicolon-separated (`;`).
  - UTF-8 with BOM for Excel compatibility.
- Columns:
  - `name` – business process name, including code (e.g. `Order-to-Cash (O2C)`).
  - `categories` – semicolon-separated category names, e.g. `Customer & Sales; Finance & Controlling`.
  - `description` – description text.
  - `notes` – notes text.
  - `status` – `enabled` or `disabled`.

### Import

- Workflow:
  - Uses the standard CSV Import dialog with:
    - `Preflight check` (dry run).
    - `Load` (actual import) after a successful dry run.
- Validation:
  - Header row must exactly match the expected headers; otherwise import fails with a clear header mismatch message.
  - `name` is required.
  - `status` must be `enabled` or `disabled` if present.
- Behavior:
  - Processes rows into a normalized form:
    - `name`, `description`, `notes`, `status`.
    - Parsed `categories` as a list of category names.
  - Deduplicates identical bodies to avoid redundant operations.
  - For each unique row:
    - If a process with the same `name` already exists (case-insensitive per tenant):
      - Interpreted as **update**.
    - Otherwise:
      - Interpreted as **insert**.
  - Categories:
    - For each category name:
      - If a category with that name exists (case-insensitive), it is reused.
      - Otherwise, a new `business_process_categories` row is created with `is_active=true`.
    - Category links are then synced via `business_process_category_links`.
- Dry run vs actual load:
  - Dry run:
    - Validates data and reports `inserted` vs `updated` counts with no DB changes.
  - Load:
    - Applies inserts/updates and returns `processed` count plus any row-level errors.

---

## Integration Guidelines

The goal is for Business Processes master data to be reused across the app wherever end-to-end processes matter (e.g., IT applications, tasks, audits, risk management). The current implementation focuses on master-data management and ownership fields; downstream integration points can be added incrementally.

### Recommended usage patterns

1. **Reference by ID from domain entities**
   - When modeling features such as:
     - Controls / risks.
     - Audit programs.
     - IT interfaces, applications, or tasks that are tied to a specific process.
   - Prefer storing a foreign key `business_process_id` on the domain table rather than duplicating the process name.
   - Use the Business Processes API to:
     - Populate a drop-down (with search/filter by category).
     - Show the process name and categories in detail views.

2. **Process-centric reporting**
   - Future reports should group by business process (e.g. spend or incidents by process).
   - Use the canonical ID and code-in-name convention to avoid drift (e.g. always use `Order-to-Cash (O2C)` rather than free-text variants).

3. **Ownership-driven workflows**
   - Use `owner_user_id` and `it_owner_user_id` to:
     - Assign default responsible users for tasks or approvals on that process.
     - Route notifications for incidents, changes, or audit findings linked to the process.
   - Ownership should be editable only via the Business Process workspace, not ad-hoc in every downstream feature.

4. **Lifecycle alignment**
   - The `status`/`disabled_at` of a process should be honored by consumers:
     - Disabled processes should not be offered in selectors for new items (unless explicitly allowing historical-only selection).
     - Existing items linked to disabled processes continue to show the link, but can display a warning/badge indicating the process is inactive.

### When NOT to use Business Processes

- Do not use Business Processes for:
  - Very granular workflow steps or tasks.
  - Purely IT-centric technical flows (those belong to Interfaces / Integrations and are already modeled separately).
  - Temporary projects or initiatives (those live under Projects / Tasks).

Instead, Business Processes are intended for stable, medium-long term core processes that appear in ISO 9001, operating models, and high-level SOPs.

---

## Tenant Purge Behavior

During tenant deletion (admin purge), Business Processes data is removed in a safe order:

1. `business_process_category_links`
2. `business_processes`
3. `business_process_categories`

This is wired into `AdminTenantsService.purgeTenantData` and ensures no orphaned rows remain. The purge is fully tenant-scoped via `tenant_id = app_current_tenant()` and honors RLS.
