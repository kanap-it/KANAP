# Applications Portfolio (IT Landscape)

Metadata
- Purpose: Describe the Applications, App Instances, Interfaces, and Servers capabilities across DB, backend, and frontend.
- Audience: Engineers, QA, product
- Status: updated
- Last Updated: 2026-01-25

## Overview
The Applications Portfolio normalizes the way we track enterprise applications by separating logical metadata (owners, audience, compliance) from environment-specific deployments. App Instances capture hosting, SSO/MFA, URLs, and allow servers and interfaces to attach at the environment layer. Interfaces define logical relationships between applications, while Interface Bindings model the concrete per-environment integrations. Servers and App Server Assignments capture infrastructure assets and which instances run on them.

## Data Model (DB)
All tables are tenant-scoped with standard tenant-isolation policies (`tenant_id = app_current_tenant()`).

### Logical Application Tables
- `applications`: `{ id, tenant_id, name, supplier_id?, description?, editor?, retired_date?, version?, end_of_support_date?, go_live_date?, predecessor_id?, lifecycle, criticality, data_class, external_facing, is_suite, last_dr_test?, etl_enabled, access_methods(text[]), contains_pii, licensing?, notes?, support_notes?, users_mode('manual'|'it_users'|'headcount'), users_year, users_override?, status, disabled_at, created_at, updated_at }`.
  - `access_methods`: Array of strings indicating how the application is accessed. Codes are configurable via IT Ops Settings. Default values: `web`, `local` (locally installed application), `mobile` (mobile application), `hmi` (proprietary HMI/industrial interface), `terminal` (Terminal/CLI), `vdi` (VDI/Remote Desktop), `kiosk`. Tenants can add custom access methods or deprecate defaults.
  - **Version fields**: `version` (text, free-form version identifier), `end_of_support_date` (date), `go_live_date` (date), `predecessor_id` (uuid FK to `applications.id`, self-referential for version lineage).
  - Deprecated compatibility fields (`environment`, `hosting_model`, `sso_enabled`, `mfa_supported`) remain for CSV/backwards compatibility but new UIs read/write App Instances instead.
- Supporting tables: `application_owners`, `application_companies`, `application_departments`, `application_links`, `application_attachments`, `application_data_residency`, `application_suites`, `application_support_contacts`, `application_spend_items` (links OPEX spend items to applications), `application_projects` (links applications to portfolio projects).
- **Version lineage**: Applications can form version chains via `predecessor_id`. Successors are derived by querying apps where `predecessor_id = :this_app_id`. Index: `idx_applications_predecessor (tenant_id, predecessor_id)`.

### App Instances
- `app_instances`: `{ id, tenant_id, application_id, environment('prod'|'pre_prod'|'qa'|'test'|'dev'|'sandbox'), hosting_model('on_premise'|'saas'|'public_cloud'|'private_cloud'), lifecycle(text), sso_enabled, mfa_supported, base_url?, region?, zone?, notes?, status(text), disabled_at?, created_at, updated_at }`.
  - `lifecycle` values are validated against the tenant’s IT Ops lifecycle settings (defaults: Proposed, Active, Deprecated, Retired). `status` mirrors lifecycle (`retired` instances persist as disabled).
- Uniques/Indexes:
  - `UNIQUE (tenant_id, application_id, environment)`
  - `INDEX (tenant_id, environment)`, `INDEX (tenant_id, application_id)`
- Backfill: each legacy application row spawned a default instance using the previous env/auth settings.

### Interfaces & Bindings
- `interfaces` (revamped): logical end‑to‑end integrations with one source application and one main target application.
  - Shape (simplified): `{ id, tenant_id, interface_id, name, business_process_id?, business_purpose, source_application_id, target_application_id, data_category, integration_route_type('direct'|'via_middleware'), lifecycle(text), overview_notes?, criticality('business_critical'|'high'|'medium'|'low'), impact_of_failure?, business_objects?, main_use_cases?, functional_rules?, core_transformations_summary?, error_handling_summary?, data_class, contains_pii, pii_description?, typical_data?, audit_logging?, security_controls_summary?, created_at, updated_at }` (lifecycle options come from IT Ops settings; defaults match Applications).
  - Relations: owners (`interface_owners`), impacted companies (`interface_companies`), dependencies (`interface_dependencies`), key identifiers (`interface_key_identifiers`), data residency (`interface_data_residency`), and documentation links/attachments (`interface_links`, `interface_attachments`).
- `interface_legs`: per‑interface technical legs (`EXTRACT` / `TRANSFORM` / `LOAD` / `DIRECT`):
  - `{ id, tenant_id, interface_id, leg_type, from_role, to_role, trigger_type, integration_pattern, data_format, job_name?, order_index, created_at, updated_at }`.
  - Legs are reused across environments as templates.
- `interface_bindings` (env‑specific leg bindings):
  - `{ id, tenant_id, interface_id, interface_leg_id, environment('prod'|'pre_prod'|'qa'|'test'|'dev'|'sandbox'), source_instance_id, target_instance_id, source_endpoint?, target_endpoint?, trigger_details?, env_job_name?, authentication_mode?, monitoring_url?, env_notes?, status(text), integration_tool_application_id?, created_at, updated_at }`.
  - Binding `status` uses the same lifecycle codes as Interfaces/Applications (validated via IT Ops settings).
  - Constraints:
    - One row per `(tenant_id, interface_leg_id, environment)`.
    - Source/target instances must belong to the correct applications for the leg roles and share the same `environment`.

### Servers & App Server Assignments
- `servers`: `{ id, tenant_id, name, kind('vm'|'db'|'queue'|'topic'|'function'|'container'|'service'), provider('on_prem'|'aws'|'azure'|'gcp'|'other'), environment, region?, zone?, hostname?, ip?, is_cluster:boolean, status(text), operating_system?, network_segment?, location_id?, created_at, updated_at }`.
- Cluster membership is stored in `server_cluster_members` (cluster → member servers). App–server assignments must target non-cluster servers.
  - `status` stores the lifecycle code sourced from IT Ops lifecycle settings (defaulting to Active); legacy `enabled/disabled` values were migrated.
- `app_server_assignments`: `{ id, tenant_id, app_instance_id, server_id, role('web'|'worker'|'db'|'cache'|'queue'|'etl'|'other'), since_date?, notes?, created_at, updated_at }` with unique `(tenant_id, app_instance_id, server_id, role)`.

## Backend (NestJS)
- **Applications Module** (`backend/src/applications/*`)
  - Enhancements: `GET /applications?include=instances` and `GET /applications/:id?include=instances` now include `instances: AppInstance[]` when requested.
  - Support data:
    - `GET /applications/:id?include=support` hydrates `support_contacts` and `support_notes`.
    - `GET /applications/:id/support-contacts` (reader) returns contact rows with denormalized name/email/phone/mobile + role.
    - `POST /applications/:id/support-contacts/bulk-replace` (manager) replaces `application_support_contacts` (tenant_id set from the application).
  - Sub-resources unchanged (owners, audience, links, attachments, suites, data residency, total-users helper).
  - **Project Relations**:
    - `GET /applications/:id/projects` (reader) returns projects linked to this application via `application_projects` junction table.
    - `POST /applications/:id/projects/bulk-replace` (member) replaces all project links with provided `project_ids[]`. Validates project existence and tenant ownership.
  - **Version Management**:
    - `POST /applications/:id/create-version` (manager) creates a new application version with lineage:
      - Body: `{ name, version?, go_live_date?, end_of_support_date?, copyOwners?, copyCompanies?, copyDepartments?, copyDataResidency?, copyLinks?, copySupportContacts?, copySpendItems?, copyCapexItems?, copyContracts?, copyInstances?, copyBindings?, interfaceIds?[] }`
      - Sets `predecessor_id` on new app pointing to source
      - Copies selected relations; optionally copies instances and OPEX/CAPEX/contract links
      - Migrates selected interfaces with full relation copying:
        - Duplicates interface with updated source/target references (or middleware references for via_middleware interfaces)
        - Copies legs, middleware applications, owners, companies, key identifiers, links, and data residency
        - Resets interface lifecycle to 'proposed'
        - Optionally copies bindings when `copyBindings=true` and `copyInstances=true`:
          - Maps old instance IDs to new instance IDs for correct environment linking
          - For via_middleware interfaces, properly maps ETL instance references in leg bindings
          - Clears environment-specific fields (endpoints, auth, job names) for fresh configuration
      - New app starts with `lifecycle: 'proposed'`
    - `GET /applications/:id/version-lineage` (reader) returns `{ predecessors[], current, successors[] }` walking the predecessor chain
    - `GET /applications/:id/interfaces-for-migration` (reader) returns interfaces where app is source, target, or middleware (if `etl_enabled`), with `app_role` indicator ('source' | 'target' | 'both' | 'via_middleware')
  - **Copy Item** (frontend-implemented in `ApplicationsPage.tsx`):
    - Creates independent duplicate without lineage
    - Copies: core fields (name with "(copy)" suffix, description, etl_enabled, support_notes, etc.), owners, companies, departments, suites, OPEX/CAPEX items, contracts, links, data residency, support contacts
    - Does NOT copy: last_dr_test, version fields, instances, interfaces, server assignments, attachments
    - Lifecycle preserved from source
  - **Comparison: Copy Item vs Create Version**:
    | Relation | Copy Item | Create Version |
    |----------|-----------|----------------|
    | Owners | Always | Optional (default: yes) |
    | Companies | Always | Optional (default: yes) |
    | Departments | Always | Optional (default: yes) |
    | Data Residency | Always | Optional (default: yes) |
    | Links | Always | Optional (default: yes) |
    | Support Contacts | Always | Optional (default: yes) |
    | Suites | Always | No |
    | OPEX Items | Always | Optional (default: yes) |
    | CAPEX Items | Always | Optional (default: yes) |
    | Contracts | Always | Optional (default: yes) |
    | Instances | No | Optional (default: no) |
    | Bindings | No | Optional (requires instances) |
    | Interfaces | No | User-selected |
- **App Instances Module** (`backend/src/app-instances/*`)
  - Endpoints: `GET /applications/:id/instances`, `POST /applications/:id/instances`, `PATCH /app-instances/:instanceId`, `DELETE /app-instances/:instanceId`.
  - Validations: unique environment constraint, prevents deletion when bindings or assignments reference the instance, derives status/disabled timestamps consistently.
- **Interfaces Module** (`backend/src/interfaces/*`)
  - `GET /interfaces` supports pagination, filters (type, lifecycle, criticality, contains_pii, owner, optional `environment` via binding EXISTS), quick search, and returns binding/coverage counts and the set of environments with bindings per interface.
  - `POST/PATCH/DELETE /interfaces` manage the logical metadata.
  - `GET /interfaces/:id?include=bindings` hydrates binding rows with source/target environment data.
  - `PATCH /interfaces/:id/legs` updates leg template fields (`trigger_type`, `integration_pattern`, `data_format`, `job_name`) using tenant-configured enums.
- **Interface Bindings Module** (`backend/src/interface-bindings/*`)
  - CRUD endpoints for bindings; enforces environment alignment and deduplicates `(tenant_id, interface_leg_id, environment)`.
- **Servers Module** (`backend/src/servers/*`)
  - CRUD plus `GET /servers` with filters for environment/kind/provider/status. Response rows include an `assignments_count` derived via subquery.
- **App Server Assignments Module** (`backend/src/app-server-assignments/*`)
  - Endpoints: `GET/POST /app-instances/:id/servers`, `DELETE /app-instances/:id/servers/:assignmentId`, `GET /servers/:serverId/assignments`.
- **Permissions**: All controllers use `PermissionGuard` with `RequireLevel('applications', …)`. Readers can list; managers mutate.
- **Tenant purge**: `AdminTenantsService` now deletes `interface_bindings`, `app_server_assignments`, `interfaces`, `app_instances`, and `servers` (in that order) and continues to delete attachments from object storage.

## Frontend (React + Vite)
- **Navigation**
  - AppBar workspace toggle highlights IT Landscape; drawer shows Applications and Interfaces inside the IT workspace. Servers appear under IT Landscape as well (even though their routes live in `/ops/servers*` for historical reasons).
- **Applications Grid** (`frontend/src/pages/it/ApplicationsPage.tsx`)
  - Environment column replaced by an “Environments” chip row derived from `instances`. Tooltips show hosting/base URL; clicking chips deep links to the Instances tab.
  - Column chooser toggles the necessary `include` flags (`supplier`, `owners`, `counts`, `structure`, `instances`) automatically.
  - Existing actions (New, Import, Export, Copy, Delete Selected) unchanged.
- **Application Workspace** (`frontend/src/pages/it/ApplicationWorkspacePage.tsx`)
  - Tabs: Overview, Instances, Servers, Ownership & Audience, Technical & Support, Relations, Compliance (routes/keys unchanged; labels reordered in UI).
  - **Overview tab enhancements**:
    - Version fields: Version (text), Go Live Date (date), End of Support (date) displayed in a "Version Information" section.
    - Version Timeline (`VersionTimeline.tsx`): When app has predecessors or successors, displays clickable chip row at top of Overview. Current version highlighted; retired versions show strikethrough.
    - Create New Version button in header (disabled when unsaved changes exist).
  - **Create Version Dialog** (`CreateVersionDialog.tsx`): Three-step wizard:
    - Step 1: Name, version, go-live date, end of support date
    - Step 2: Copy options (owners, companies, departments, data residency, links, support contacts, OPEX/CAPEX items, contracts, instances, bindings)
      - Bindings option is nested under Instances and only enabled when Instances is checked
      - Helper text explains that bindings connect interface legs to app instances
    - Step 3: Interface selection (shows interfaces involving this app with source/target/via_middleware role indicator)
    - On completion: creates new app via `POST /applications/:id/create-version`, navigates to new app.
  - Technical & Support tab:
    - **Technical information** (bold): Suites picker (parent suites), Access Methods (multi-select using options from IT Ops Settings; deprecated options appear only when already selected), External Facing, Data Integration/ETL.
    - **Support Information** (bold): mini-table for support contacts (Contact selector shows name-only, Email, Phone, Mobile, Role, remove), Add contact button above the table, 16px spacer before Support notes, multiline Support notes field.
    - Save persists suites, access methods, support contacts, and support notes together with other fields; Reset restores suites/support from server.
  - Instances tab uses `InstancesEditor`: inline table + modal for add/edit, bulk apply for hosting/SSO/MFA, Copy from Prod button, deletion guard messaging.
  - Servers tab uses `ServerAssignmentsEditor`: grouped by instance, add assignment dialog (server autocomplete + role), remove assignment action, deep link to Servers workspace.
  - Save button persists logical fields + relations; Instances/Servers edits persist immediately and refresh using `/applications/:id?include=instances`.
- **Interfaces**
  - Grid: `frontend/src/pages/it/InterfacesPage.tsx` shows Interface ID, Name, Business Process, Source/Target Apps, Lifecycle, Criticality, Data Category, Contains PII, Environments (chips for envs with bindings), Env Coverage, Bindings count, Created. Column filters mirror backend capabilities except the optional `environment` filter, which is backend-only.
  - Workspace: `frontend/src/pages/it/InterfaceWorkspacePage.tsx` includes:
    - Overview, Ownership & Criticality, Functional Definition, Technical Definition, Environments, Compliance.
    - Technical tab: leg template editor backed by `interface_legs` plus technical docs/attachments.
    - Environments tab with `InterfaceBindingsMatrix`:
      - User-managed environment list (Add/Delete environment constrained to envs where AppInstances exist for the route).
      - Per-environment, per-leg bindings between App Instances, showing readable instance labels derived from AppInstances.
- **Servers**
  - Grid: `frontend/src/pages/ops/ServersPage.tsx` lists assets with environment/kind/provider filters, assignments count, and actions.
  - Workspace: `frontend/src/pages/ops/ServerWorkspacePage.tsx` has Overview + Technical + Assignments tabs.
    - Overview: name, server type, location (with hosting/provider auto-switch), lifecycle.
    - Technical: environment, hostname, IP, Operating System (list from IT Settings with support dates).
    - Assignments: add/edit/remove. Add flow lets you pick an Application, then its instance (environment), then role; edit/remove remain available; deep links to the Application workspace are kept.
- **Shared Components**
  - `ApplicationSelect`, `ServerSelect`: Autocomplete components that fetch options (and load missing selections) for dialogs.
  - `InstancesEditor`, `ServerAssignmentsEditor`, `InterfaceBindingsMatrix` live under `frontend/src/pages/it/components` and encapsulate the complex per-environment editors.

## Notes / QA
- RLS: verify all new tables honor tenant context by querying as different tenants and ensuring cross-tenant access fails.
- App Instances: attempt to add duplicate environments to confirm validation errors bubble to the UI.
- Delete guards: deleting an instance with active bindings or assignments should return 400 with a friendly message surfaced in the editor.
- Interfaces: ensure bindings enforce same-environment rule by trying to mix Prod/Dev instances.
- Servers: assigning the same server + role twice to an instance must be rejected.
- Tenant purge: purge a sample tenant and confirm `interface_bindings`, `app_instances`, `interfaces`, `servers`, and `app_server_assignments` rows drop to zero.
