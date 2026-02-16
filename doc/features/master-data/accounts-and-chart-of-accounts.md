# Accounts and Charts of Accounts (Tenant + Platform Admin)

Status: current (merged CoA+Accounts page implemented; legacy accounts list route redirected)
Last Updated: 2026-02-16

This document explains the functional model and APIs for Charts of Accounts (CoA) and Accounts, including tenant flows, platform-admin templates, CSV import/export, the native account name capability, and CoA filtering in OPEX/CAPEX workspaces.

## Concepts

- Chart of Accounts (CoA): A named set of accounts in a tenant. One default CoA can be set per country. Companies link to a CoA via `companies.coa_id`. Accounts link to a CoA via `accounts.coa_id` (NOT NULL).
- Platform Templates: A catalog of per-country CoA templates managed by platform admins. Tenants can load a template into a CoA (copy), then edit accounts freely.
- CSV alignment: Accounts CSV import/export is CoA-aware. Global accounts CSV includes a `coa_code` column. CoA-scoped CSV uses the CoA route.
- Native account name: Each account can optionally carry a `native_name` (original local-language name). The UI shows it as a tooltip over the English name and exposes a hidden "Native Name" column.
 - Global templates: When loading a platform template marked global, country input is not required; the CoA is created with scope `GLOBAL` (no country). A tenant may mark one CoA as the Global Default; setting a Global Default also assigns it to all companies in the tenant where `companies.coa_id` is NULL.

## CoA Filtering Logic (Accounts by Company)

### Backend Filtering Behavior

When querying accounts with `?companyId=X`, the backend enforces **strict CoA-based filtering**:

**For companies WITH a CoA assigned** (`coa_id` is set):
- Returns ONLY accounts that belong to that specific CoA
- Example: Company "Acme France" with CoA "FR-2024" → shows only accounts from "FR-2024"

**For companies WITHOUT a CoA** (unexpected after backfill):
- Fallback to the tenant’s Global Default CoA when present
- Note: a migration backfills `companies.coa_id` to a country default or the Global Default; new companies are auto-assigned

**Implementation** (`backend/src/accounts/accounts.service.ts`):
```typescript
if (companyId) {
  const company = await repo.findOne({ where: { id: companyId } });
  if (company) {
    if (company.coa_id) {
      where.coa_id = company.coa_id;  // Filter by specific CoA
    } else {
      // Fallback to tenant Global Default CoA when present
      const rows = await manager.query(`SELECT id FROM chart_of_accounts WHERE is_global_default = true LIMIT 1`);
      where.coa_id = rows?.[0]?.id || undefined;
    }
  }
}
```

### Virtual Field Handling (coa_code)

The `coa_code` field is a **virtual field** enriched after the query. It doesn't exist in the `accounts` table.

**For sorting by CoA**:
- Frontend sorts by `coa_code`
- Backend maps `coa_code` → `coa_id` for SQL ORDER BY

**For filtering by CoA**:
- Frontend filters by `coa_code` (text patterns like "FR", "UK-2024")
- Backend:
  1. Looks up CoA IDs matching the code pattern via `chart_of_accounts` table
  2. Converts filter to use those CoA IDs with an IN clause
  3. Supports all filter types: equals, contains, startsWith, endsWith

**Implementation** (`backend/src/accounts/accounts.service.ts`):
```typescript
// Sorting: map virtual field to actual column
const sortField = sort.field === 'coa_code' ? 'coa_id' : sort.field;

// Filtering: look up CoA IDs by code pattern
if ('coa_code' in filters) {
  const coaRows = await manager.query(
    `SELECT id FROM chart_of_accounts WHERE code ILIKE $1`,
    [pattern]
  );
  const coaIds = coaRows.map(r => r.id);
  filters.coa_id = { filterType: 'set', values: coaIds };
  delete filters.coa_code;
}
```

### Obsolete Account Detection (OPEX/CAPEX Workspaces)

When editing OPEX or CAPEX items, the system detects when an account doesn't match the company's CoA:

**Warning Trigger**:
- Item has `account_id` set
- Item has `paying_company_id` set
- Account's `coa_id` ≠ Company's `coa_id`

**User Experience**:
```
⚠️ Obsolete account detected. The selected account does not belong to
the company's Chart of Accounts. Please update the account.
```

This occurs during:
- Migration to CoA-enabled workflow (old items with pre-CoA accounts)
- Data errors (account manually reassigned to different CoA)

**Implementation** (frontend editors):
```typescript
// Fetch account's coa_id
const accountRes = await api.get(`/accounts/${accountId}`);
const accountCoaId = accountRes.data?.coa_id;

// Fetch company's coa_id
const companyRes = await api.get(`/companies/${companyId}`);
const companyCoaId = companyRes.data?.coa_id;

// Detect mismatch
const hasObsoleteAccount = accountId && companyId &&
  accountCoaId && companyCoaId &&
  accountCoaId !== companyCoaId;
```

## Data Model

### chart_of_accounts
- `id uuid` (PK)
- `tenant_id uuid` (RLS via `app.current_tenant`)
- `code text` (unique per tenant)
- `name text`
- `scope text` (`GLOBAL` | `COUNTRY`)
- `country_iso char(2) NULL` (required only when `scope=COUNTRY`)
- `is_default boolean` (applies to `COUNTRY` scope; unique per tenant+country via partial unique index)
- `is_global_default boolean` (applies to `GLOBAL` scope; one per tenant via partial unique index)
- `created_at/updated_at timestamptz`

RLS is enforced; all queries run with `tenant_id = app.current_tenant()`.

### accounts
- `id uuid` (PK)
- `tenant_id uuid` (RLS)
- `coa_id uuid NOT NULL` (scoped to a CoA)
- `account_number text` (stored as text for compatibility; accepts numeric input via transformer)
- `account_name text` (English UI label)
- `native_name text NULL` (original local-language label)
- `description text NULL`
- `consolidation_account_number int NULL`
- `consolidation_account_name text NULL`
- `consolidation_account_description text NULL`
- `status status_state` (enabled|disabled + disabled_at window semantics)
- `disabled_at timestamptz NULL`
- `created_at/updated_at timestamptz`

Planned constraint post backfill: unique `(tenant_id, coa_id, account_number)` and NOT NULL on `coa_id`.

**Note on `account_number` validation**: The DTO uses `@Transform` to automatically convert numeric values to strings before validation, ensuring compatibility when frontends send numbers instead of strings:
```typescript
@Transform(({ value }) => (value != null ? String(value) : value))
@IsString()
account_number?: string | null;
```

### companies
- `coa_id uuid NULL` with auto-assignment from default CoA by `country_iso` on create/update when missing.

Global Default Fallback
- When no country default exists for the company’s country, auto-assignment falls back to the tenant’s Global Default CoA (`is_global_default=true`).
- Country default takes precedence; the global default applies to all other countries until a country-specific default is set.

## Tenant APIs

Base permissions follow the existing model: `accounts:reader|manager|admin`.

### CoA CRUD (tenant)
- `GET /chart-of-accounts` → paginated list
  - Supports quick search, AG Grid filters, and returns `companies_count` and `accounts_count`.
- `GET /chart-of-accounts/:id` → detail
- `POST /chart-of-accounts` → create (supports `is_default`; ensures one default per country)
- `PATCH /chart-of-accounts/:id` → update
- `DELETE /chart-of-accounts/:id` → guarded delete
  - Blocks when any companies link to the CoA
  - Blocks when any OPEX/CAPEX items reference accounts in that CoA
  - When allowed, deletes the CoA and all unused accounts within it
- `DELETE /chart-of-accounts/bulk` → guarded bulk delete
- `GET /chart-of-accounts/templates` → list platform templates (for selection in load dialog)

### CoA-scoped Accounts CSV (tenant)
- `GET /chart-of-accounts/:id/accounts/export?scope=data|template`
  - `template`: headers only
  - `data`: rows for this CoA
- `POST /chart-of-accounts/:id/accounts/import?dryRun=true|false`
  - Semicolon-delimited UTF-8 CSV; validates and either reports preflight or writes changes

### Accounts (tenant)
- `GET /accounts` → paginated list
  - Supports quick search, AG filters, and CoA scoping via `?companyId` or `?coaId`
  - Enriches items with `coa_code` for display
- `POST /accounts` → create account (requires `coa_id`; UI provides a required selector; API accepts `?coaId=` fallback)
- `PATCH /accounts/:id` → update account (including moving to a different CoA via `coa_id`)
- `GET /accounts/export?scope=...&coaId=...` → CSV
  - Global export includes `coa_code` to identify the CoA; scoped export uses `coaId`
- `POST /accounts/import?dryRun=...&coaId=...` → CSV import
  - When not scoping via `?coaId`, a single `coa_code` must be provided across all rows

Deletion
- Account deletion is guarded: it fails if any OPEX/CAPEX items still reference the account. Disable accounts instead when appropriate.


### Load from Template (tenant)
- `POST /chart-of-accounts/:id/load-template` with `{ template_id, dryRun?: boolean, overwrite?: boolean }`
  - `overwrite=false`: only insert missing account numbers; leave existing accounts unchanged.
  - `overwrite=true` (default): update existing accounts in the target CoA.
  
Preflight for template import:
- `POST /chart-of-accounts/import-template/preflight` with `{ template_id, target_coa_id? }`
  - Without `target_coa_id`, indicates all rows would be inserted when creating a new CoA.
  - With `target_coa_id`, reports `{ inserted, updated }` based on existing account numbers.
  - Preflight and then apply accounts into the selected CoA (copy behavior; no sync)
Notes on Global Templates
- When a platform template is marked global, the tenant CoA created from it does not prompt for a country. The CoA is created with `scope=GLOBAL` and can be marked as the tenant’s Global Default.

## Platform Admin APIs

Guarded by `PlatformAdminGuard` and intended for the platform host.

- `GET /admin/coa-templates` → list
- `GET /admin/coa-templates/:id` → detail
- `POST /admin/coa-templates` → create `{ template_code, template_name, version, is_global?, loaded_by_default?, country_iso? }`
- `PATCH /admin/coa-templates/:id` → edit (same fields)
- `DELETE /admin/coa-templates/:id` → delete
- `GET /admin/coa-templates/:id/export` → CSV of template accounts
- `POST /admin/coa-templates/:id/import?dryRun=true|false` → upload CSV (semicolons, UTF‑8)
  - `dryRun=true` performs a preflight only and returns `{ ok, dryRun: true, total, inserted, updated, errors: [] }`
  - `dryRun=false` persists as the template’s `csv_payload` and returns `{ ok, dryRun: false, total, inserted, updated, processed, errors: [] }`

Standard Accounts within a Template (CRUD on the template CSV)
- `GET /admin/coa-templates/:id/accounts?sort=account_number:ASC&q=&page=1&limit=50` → list rows parsed from the template’s CSV
- `GET /admin/coa-templates/:id/accounts/ids?sort=...&q=...` → `{ ids: string[] }` ordered for prev/next in workspace
- `GET /admin/coa-templates/:id/accounts/:accountNumber` → get one row (by `account_number`)
- `POST /admin/coa-templates/:id/accounts` → create row `{ account_number, account_name, native_name?, description?, consolidation_account_number?, consolidation_account_name?, consolidation_account_description?, status }`
- `PATCH /admin/coa-templates/:id/accounts/:accountNumber` → update row; allows renumbering
- `DELETE /admin/coa-templates/:id/accounts/:accountNumber` → delete row
- `DELETE /admin/coa-templates/:id/accounts/bulk` → delete many `{ ids: string[] }` (ids are account numbers)

## CSV Schema (Accounts)

CSV is semicolon (`;`) delimited, UTF‑8 (export includes BOM for Excel). Header order matters and is validated.

Global export/import (`/accounts`):
```
coa_code;account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```

CoA-scoped export/import (`/chart-of-accounts/:id/accounts`):
```
account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```

Validation rules:
- `account_number`: required, integer (stored as text for compatibility)
- `account_name`: required (English UI name)
- `native_name`: optional (original local-language name)
- `status`: `enabled|disabled` (defaults to enabled); disable uses `disabled_at` in the model
- `consolidation_*`: optional; `consolidation_account_number` must be an integer if provided

Import behavior:
- Deduplicates by `account_number` within the target CoA (first row wins)
- Classifies rows as inserts/updates by existence in the target CoA
- `dryRun=true` returns a report `{ ok, total, inserted, updated, errors[] }`
- Global import requires either a `?coaId` param or a single uniform `coa_code` column across rows

## Frontend

### Master Data → Charts of Accounts (Merged CoA + Accounts)
- The tenant UI now uses a single CoA-centric page at `/master-data/coa`.
- Top section: horizontal CoA chip bar (`code` with default badges) plus `New` and `Manage`.
- URL state: selected CoA is stored as `?selected=<coaId>` (legacy `?coaId=` links are mapped automatically).
- Accounts grid is always CoA-scoped (no cross-CoA list view in the main UI).
- Account actions are on the same page:
  - `New Account`
  - `Import CSV` (to `/chart-of-accounts/:id/accounts/import`)
  - `Export CSV` (to `/chart-of-accounts/:id/accounts/export`)
  - `Delete Selected` (guarded)
- Account columns reuse prior Accounts page behavior, including native-name tooltip and optional hidden `Native Name` column.

Manage dialog:
- Replaced the oversized CoA grid with a compact modal:
  - Left: selectable CoA list
  - Right: details panel (scope, country, defaults, counts)
  - Actions: `New`, `Set Country Default`, `Set Global Default`, `Delete Selected`

Legacy route behavior:
- `/master-data/accounts` now redirects to `/master-data/coa` and preserves list/query context.
- Account workspace routes remain `/master-data/accounts/:id/:tab` for deep links and prev/next navigation.

Account create/edit:
- Create and Edit forms still include required CoA selection.
- Moving an account to a different CoA is supported; uniqueness conflicts on `(tenant_id, coa_id, account_number)` return friendly errors.

### Master Data → Companies
- Overview tab: CoA selector appears between Country and Address 1; persists `coa_id`.
- Defaulting in the form: when a country is selected, the CoA field preselects the country default when available; otherwise it preselects the tenant’s Global Default. The dropdown lists `COUNTRY`-scoped CoAs for the selected country and also includes all `GLOBAL`-scoped CoAs (with the Global Default highlighted by the UI).
- Set Global Default behavior: when a CoA is set as the tenant’s Global Default, companies with `coa_id` still NULL are automatically assigned to it.

### Platform Admin → CoA Templates
- Grid to manage template metadata and CSV payload
- CSV Import supports preflight (dry run) and commit

### Platform Admin → Standard Accounts
- Route: `/admin/standard-accounts` with a template selector
- Lists and manages “standard accounts” stored in the selected template’s CSV
- Actions: New, Import (preflight + load), Export, Delete Selected
- Workspace: `/admin/standard-accounts/:templateId/:accountNumber/overview` with prev/next navigation
- Isolation: This UI only edits the template CSV; tenant `accounts` are unaffected until a tenant loads the template into their CoA

## Security & RLS
- All tenant resources apply RLS using `app.current_tenant()`
- Platform admin APIs are only accessible on the platform host with platform admin privileges

## Migrations & Ops
- Run migrations: `cd backend && npm run typeorm -- migration:run`
  - Includes: initial CoA, CoA templates, `accounts.native_name`, Legacy CoA backfill, `accounts.coa_id` NOT NULL, and CoA `scope` migration (GLOBAL vs COUNTRY with constraints)
- Backend build: `cd backend && npm run build`
- Frontend: `cd frontend && npm run build` or `npm run dev`

Operational Notes
- Setting a CoA as Global Default also assigns it to companies with `coa_id` = NULL.
- Scope migration: legacy tenants that previously used the `ZZ` sentinel are transparently migrated to `scope=GLOBAL` with `country_iso=NULL`.

## Future Work
- Consider promoting `companies.coa_id` to NOT NULL (auto-assigned on create/update already)
- Optional: add `chart_of_accounts.language_tag` (BCP‑47) for countries with multiple official languages
