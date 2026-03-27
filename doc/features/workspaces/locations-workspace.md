# Locations (IT Landscape)

Metadata
- Purpose: Document the new Locations grid + workspace, API surface, and supporting metadata.
- Audience: Engineers, QA, product
- Status: draft
- Last Updated: 2025-11-15

## Overview

Locations are now a first-class IT Landscape entity that anchor infrastructure hosting context. Each Location represents a physical site or cloud hosting footprint and carries type-specific metadata along with Contacts & Support info. Servers can be assigned to a Location, and the workspace derives related Servers and Applications automatically.

Key capabilities:
- `/it/locations` grid with quick search, AG filters, and per-row server counts.
- `/it/locations/:id/:tab` workspace with tabs for Overview, Contacts & Support, and Relations.
- Servers (`/ops/servers/:id/overview`) include a `LocationSelect` field for assigning/clearing the Location.
- Hosting Types + Cloud Providers are configurable via IT Ops Settings; hosting types enforce `on_prem` vs `cloud` category behavior.
- Permissions are governed by the new `locations` resource (`reader`, `manager`, `admin`).

## Data Model

New tables (see `backend/src/migrations/1765006000000-locations.ts`):

| Table | Purpose | Notes |
| --- | --- | --- |
| `locations` | Core entity with code, name, hosting_type, operating_company_id, country/city, datacenter, provider, region, `additional_info`. | Unique (tenant, lower(code/name)); FK to `companies` (operating company). |
| `location_user_contacts` | Internal contact links to `users`. | Unique (tenant, location, user). Optional `role` description. |
| `location_contacts` | External contact links to `contacts`. | Unique (tenant, location, contact). Optional `role` description. |
| `location_links` | Relevant website links. | Mirrors application links (description + URL). |

Other tables updated:
- `servers.location_id` (nullable FK to `locations`, `ON DELETE SET NULL`).
- Permissions seeding inserts `locations:admin` for the Administrator role.

All new tables enforce row-level security (`tenant_id = app_current_tenant()`).

## Backend Modules

- Module: `backend/src/locations/locations.module.ts`
  - Imports: TypeORM repos for `Location`, contact/link entities, `Server`, `Company`, `User`, `ExternalContact`.
  - Providers: `LocationsService`.
  - Controller: `LocationsController`.

- Service: `backend/src/locations/locations.service.ts`
  - Lists with pagination/filter/sort (`buildWhereFromAgFilters`, server counts, company name joins).
  - CRUD operations with validation:
    - Hosting type resolved via `ItOpsSettingsService` (category drives clearing of on-prem vs cloud fields).
    - Operating company auto-fills `country_iso`/`city` when empty.
    - Delete detaches servers by setting `location_id = NULL`.
  - Contacts & Support endpoints (`internal-contacts`, `external-contacts`, `links`).
  - Relations endpoints derive Servers and deduplicated Applications (via assignments → instances → applications).
  - Audit logging on every mutation (`locations`, `location_user_contacts`, `location_contacts`, `location_links`).

- Controller: `backend/src/locations/locations.controller.ts`
  - Base path `/locations`, guards (`JwtAuthGuard`, `PermissionGuard`).
  - Routes:
    - `GET /locations` (`locations:reader`)
    - `GET /locations/:id` (`include` query for `internal_contacts`, `external_contacts`, `links`)
    - `POST/PATCH /locations/:id` (`locations:manager`)
    - `DELETE /locations/:id` (`locations:admin`)
    - Contacts (`/internal-contacts`, `/external-contacts`, `/links`)
    - Relations (`/servers`, `/applications`)

- Servers Service (`backend/src/servers/servers.service.ts`)
  - New helper `resolveLocationId` ensures referenced Location exists for the tenant.
  - `create`/`update` accept `location_id`; persisted to the entity and audited.

## Frontend Surface

### Locations Grid (`frontend/src/pages/it/LocationsPage.tsx`)

- Uses `ServerDataGrid`.
- Columns: Code, Name, Hosting type (labelled via `useItOpsEnumOptions`), Provider/Company (switches based on hosting category), Country (ISO + label), City, Servers count, Created.
- Quick search and AG filters persist via query params, enabling workspace round-trips.
- “Add Location” button appears when the user has `locations:manager`.

### Location Workspace (`frontend/src/pages/it/LocationWorkspacePage.tsx`)

- Tabs:
  1. **Overview** – `LocationOverviewEditor` handles the form, hosting-type switching (with confirmation + auto-clearing incompatible fields), Operating Company select (auto-populates country/city), Cloud provider fields for `cloud` types.
  2. **Contacts & Support** – `LocationContactsPanel` for internal users, external contacts, and Relevant websites. Uses inline tables with add/remove actions. Roles are optional free-text notes; users can leave them blank. Save/Reset integrate with workspace dirty state.
  3. **Relations** – `LocationRelationsPanel` renders read-only tables of linked Servers and derived Applications with deep links to their workspaces.
- `New` flow lives at `/it/locations/new/overview`; Contacts/Relations tabs remain disabled until the record exists.
- Save/Reset buttons respect permissions: readers get read-only UI; managers can edit.
- Workspace delete is available to `locations:admin` only. Deleting a location automatically unassigns linked assets by clearing their `location_id`.
- Close button returns to `/it/locations` while preserving list query params (`sort`, `q`, `filters`).

### Server Workspace Update (`frontend/src/pages/ops/ServerWorkspacePage.tsx`)

- Overview tab now includes a `LocationSelect` (typeahead backed by `/locations?limit=200`).
- Saving a server persists `location_id` and updates downstream relations automatically.

### Navigation / Routing

- IT Landscape drawer now lists: Locations → Servers → Applications → Interfaces → Interface Map → Settings.
- `/it` redirects to `/it/locations`.
- Routes:
  - `/it/locations`
  - `/it/locations/:id`
  - `/it/locations/:id/:tab`

## Permissions

- Backend `RESOURCES` array includes `'locations'`.
- Default roles:
  - Administrator seeded with `locations:admin`.
  - Other roles configure `locations` in the Roles UI (`frontend/src/pages/admin/RolesPage.tsx`).
- Enforcement:
  - `locations:reader` – list/workspace read access.
  - `locations:manager` – create/update and manage contacts/links.
  - `locations:admin` – can also delete locations.
- NAV visibility for Locations requires at least `locations:reader`.
