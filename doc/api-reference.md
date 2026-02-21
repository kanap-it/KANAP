# API Reference (Short)

Metadata
- Purpose: Quick reference for core endpoints and allocation/metrics model
- Audience: Engineers, integrators
- Status: current
- Last Updated: 2026-02-21

## Auth

### Session Management
The API uses a **refresh token pattern with sliding expiration**:
- **Access tokens**: Short-lived (default 15 minutes), used for API authentication
- **Refresh tokens**: Longer-lived (default 4 hours), stored in database, extend on activity
- **Sliding window**: Each token refresh extends the session by the refresh TTL
- **Automatic logout**: Sessions expire after the refresh TTL of inactivity

Configuration (backend `.env`):
```
JWT_ACCESS_TOKEN_TTL=15m      # Access token lifetime (default: 15m)
JWT_REFRESH_TOKEN_TTL=4h      # Inactivity timeout / sliding window (default: 4h)
```

Rate limiting (default enabled):
- `RATE_LIMIT_ENABLED=true` to keep app-level throttling on; set `false` for local testing.
- `RATE_LIMIT_TRUST_PROXY=true` when behind a proxy/Cloudflare so limits use the real client IP.
- Defaults: `POST /auth/login` (5/60s), `POST /auth/password-reset/request` (3/15m), `POST /auth/password-reset/complete` (5/10m), `POST /public/start-trial` (5/10m), `POST /public/contact` (5/10m).

### Endpoints

- POST `/auth/login` → `{ access_token, refresh_token, expires_in, refresh_expires_in }`
  - Returns both tokens; `expires_in` is access token lifetime in seconds
  - `refresh_expires_in` is the refresh-token TTL in seconds (idle timeout window)
  - Use header `Authorization: Bearer <access_token>` for protected routes
  - Backend also sets `refresh_token` as an `HttpOnly` cookie (primary transport for refresh/logout)

- POST `/auth/refresh` → `{ access_token, expires_in, refresh_expires_in }`
  - Body: `{ refresh_token?: string }` (optional when `refresh_token` cookie is present)
  - Validates the refresh token, extends its expiration (sliding window), returns new access token
  - Returns 401 if refresh token is invalid or expired

- POST `/auth/logout` → `{ ok: true }`
  - Body: `{ refresh_token?: string }` (optional when `refresh_token` cookie is present)
  - Revokes the refresh token (logout from current device)
  - Always returns success even if token was already revoked

- GET `/auth/me` → returns claims and subscription summary
  - Response:
    - `profile`: `{ id, email, first_name, last_name, status, role }`
    - `claims`: `{ isGlobalAdmin: boolean, isBillingAdmin: boolean, isPlatformAdmin: boolean, permissions: { [resource]: 'reader'|'manager'|'admin' } }`
    - `subscription`: `{ plan_name, seat_limit, seats_used }`
  - Notes:
    - Admin safety: users with the `Administrator` role have `admin` across all resources.
    - `seats_used` counts users with `status='enabled'`.
- POST `/auth/password-reset/request` → `{ email }`
  - Body: `{ email: string }` (case-insensitive). Always returns `{ ok: true }`.
  - Requires `RESEND_API_KEY` to be configured; in production links are built from configured `APP_BASE_URL`/`PUBLIC_APP_URL` (non-production can derive from request host for local subdomain workflows).
  - Security: reset links now carry the token in URL fragment form (`/reset-password#token=...`) instead of query string.
- POST `/auth/password-reset/complete` → `{ ok: true }`
  - Body: `{ token: string, password: string }`. Minimum length 8.
  - Token expires based on `PASSWORD_RESET_TTL` (defaults to 1 hour).

### Microsoft Entra SSO
- POST `/auth/entra/setup/start` → `{ url }`
  - Requires tenant context + `users:admin` (the user must be an Administrator in the current tenant).
  - Reads `req.tenant` (blocked on the platform-admin host) and signs a short-lived `state` + `nonce` cookie before returning an Entra consent URL. The SPA immediately navigates to the returned URL.
  - Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Secure=true` in production. Dev must use HTTPS to satisfy Microsoft’s cookie rules.
- GET `/auth/entra/login?redirectTo=/path`
  - Public endpoint, but only available on tenant hosts that previously completed setup (`sso_provider='entra'`).
  - Validates `redirectTo` (defaults to `/`), signs new `state`/`nonce`, and 302s to the Microsoft authorization endpoint. Errors return JSON (e.g., `{ message: 'SSO_NOT_CONFIGURED' }`).
- GET `/auth/entra/callback`
  - Shared callback for both setup & login.
  - Mode is embedded in the signed `state` payload (`mode='setup' | 'login'`). The endpoint exchanges the auth code for tokens using the shared app registration, validates the ID token (issuer, audience, nonce, `tid`, `oid`, email), and then:
    - `mode=setup`: stores `sso_provider='entra'`, `entra_tenant_id=tid`, and metadata on the tenant, then redirects to `/admin/auth?setup=success` on the tenant host.
    - `mode=login`: links or provisions a tenant user (by external subject first, then email), issues tokens via `AuthService.signTokens`, and redirects to `/login/callback#token=...&refreshToken=...&expiresIn=...&refreshExpiresIn=...&redirectTo=...` on the tenant host.
      - Security: callback tokens are passed in the URL fragment (not query string). The SPA reads the fragment and clears it via `history.replaceState`.

- GET `/admin/auth/settings`
  - Requires `users:admin` and a tenant host.
  - Returns `{ sso_provider, sso_enabled, entra_tenant_id, entra_metadata }` for the current tenant. Used by the **Admin → Authentication** UI to show status and surface the “Test Microsoft sign-in” button (which simply calls `/auth/entra/login`).

## Public Utilities
- GET `/public/tenant-info`
  - Resolves tenant metadata for the current host.
  - Returns `{ slug, name }` for valid tenant subdomains.
  - Returns `{ platform: true }` when called on `PLATFORM_ADMIN_HOST` (no tenant context).
  - Responds `404 { error: 'TENANT_NOT_FOUND', marketingUrl }` for unknown slugs so the SPA can redirect users back to marketing.

- GET `/public/captcha-config`
  - Returns current CAPTCHA client configuration for the marketing forms:
    - `{ provider: 'turnstile', mode: 'off'|'monitor'|'enforce', enabled: boolean, required: boolean, siteKey: string|null }`
  - `siteKey` is only returned when CAPTCHA is enabled and configured.

- POST `/public/start-trial` → `{ ok: true } | { ok: true, activation_url }`
  - Body: `{ org: string, slug: string, email: string, country_iso: string, captchaToken?: string }`
    - `slug` must match `/^[a-z0-9-]+$/`.
    - Slug normalization/reservation is centralized in `backend/src/tenants/tenant-slug-policy.ts`.
    - Reserved slugs rejected as unavailable: `www`, `api`, `admin`, `billing`, `account`, `platform-admin`, `app`, `nextcloud`, `migration`, `example`.
    - `country_iso` is a 2-letter ISO code (uppercase), used later for the initial company.
  - Behavior: saves a pending signup and emails an activation link. When email is not configured, returns `{ activation_url }` so QA/dev can activate manually.
  - Unavailable slug response (reserved or already used by an active tenant): `400` with `message: 'Slug not available'` and `code: 'SUBDOMAIN_NOT_AVAILABLE'`.
  - CAPTCHA:
    - When `CAPTCHA_MODE=enforce`, a valid Turnstile token is required.
    - When `CAPTCHA_MODE=monitor`, verification failures are logged but requests are not blocked.
  - Security: activation links now use fragment token form (`/activate.html#token=...`).

- POST `/public/contact` → `{ ok: true }`
  - Body: `{ name: string, email: string, company: string, message: string, captchaToken?: string }`
  - CAPTCHA behavior matches `/public/start-trial` (`off|monitor|enforce`).

- POST `/public/activate-trial` → `{ tenant_url, reset_token }`
  - Body: `{ token: string }`
  - Behavior (transactional):
    - Creates the tenant and an Administrator user for the submitted email.
    - Creates an initial company named from the org/slug with `country_iso` from the signup.
    - Provisions the default global CoA into the tenant if a platform template is marked `loaded_by_default`.
    - Issues a password-reset token so the owner can set credentials inside the tenant.
    - Sends a non-blocking notification email to `admin@kanap.net` with the tenant name, slug, registered email, and `country_iso`. This notification does not affect the response if delivery fails.

## Billing
- GET `/billing/subscription` → `{ plan_name, seat_limit, seats_used }`
- POST `/billing/portal` → `{ url }`
  - Opens Stripe Customer Portal for Billing/Global Admins
  - Requires env: `STRIPE_SECRET_KEY` (or `STRIPE_SECRET`) and a `stripe_customer_id` stored in subscription

## Companies
- GET `/companies?year=YYYY&status=enabled|disabled&page=1&limit=50&sort=name:ASC`
  - Response item fields include (in addition to company fields):
    - `headcount_year: number` (0 if missing)
    - `it_users_year: number` (0 if missing)
    - `turnover_year: number` (0 if missing)
    - `metrics_frozen: boolean`
    - `metrics_frozen` reflects the `freeze-states` companies scope for that year
- GET `/companies/ids?year=YYYY&sort=headcount_year:DESC&q&filters`
  - Returns `{ ids: string[], total: number }` ordered according to the current list query (supports the Companies workspace prev/next navigation).
- POST `/companies` → create
- PATCH `/companies/:id` → update (no metrics here)

### Company and CoA
- Companies include an optional `coa_id` which links the company to a Chart of Accounts.
- If `coa_id` is not supplied on create/update, the backend auto-assigns the default CoA for the company’s `country_iso` (when available); otherwise it falls back to the tenant’s Global Default CoA (a `GLOBAL`‑scoped CoA).

## Charts of Accounts (Tenant)
- GET `/chart-of-accounts` → list (supports quick search and AG Grid filters)
  - Items include `scope: 'GLOBAL'|'COUNTRY'`, `country_iso` (NULL for GLOBAL), `is_default`, `is_global_default`, `companies_count`, and `accounts_count`.
- GET `/chart-of-accounts/:id` → detail
- POST `/chart-of-accounts` → create
  - Body: `{ code: string, name: string, scope: 'GLOBAL'|'COUNTRY', country_iso?: string(2), is_default?: boolean }`
  - Rules: `scope='GLOBAL'` → `country_iso` omitted and `is_default=false`. `scope='COUNTRY'` → `country_iso` required; `is_default=true` makes it the single default for that country.
- PATCH `/chart-of-accounts/:id` → update (enforces the same scope rules as create)
- PATCH `/chart-of-accounts/:id/global-default` → sets the Global Default CoA
  - Only allowed when the target CoA has `scope='GLOBAL'`; clears any previous Global Default and assigns it to companies with `coa_id=NULL`.
- DELETE `/chart-of-accounts/:id` → guarded delete
  - Blocks when companies reference the CoA
  - Blocks when any OPEX/CAPEX items reference its accounts
  - If no usage, removes the CoA and all its unused accounts
- DELETE `/chart-of-accounts/bulk` → guarded bulk delete
- GET `/chart-of-accounts/templates` → platform-admin template catalog (for tenant selection in “Copy from template”)
- POST `/chart-of-accounts/:id/load-template` → `{ template_id, dryRun?: boolean, overwrite?: boolean }`
  - When `overwrite=false`, only new account numbers are inserted; existing ones are left unchanged.
  - When `overwrite=true` (default), existing accounts are updated.
  
  Preflight:
- POST `/chart-of-accounts/import-template/preflight` → `{ template_id, target_coa_id? }`
  - Without `target_coa_id`, returns counts for creating a new CoA: `{ ok, dryRun: true, total, inserted: total, updated: 0 }`.
  - With `target_coa_id`, returns `{ ok, dryRun: true, total, inserted, updated }` based on conflicts in the target CoA.
  - Copies accounts from the selected platform template into the target CoA; supports preflight (`dryRun: true`).

## CoA Templates (Platform Admin)
Requires platform admin claim (`isPlatformAdmin: true`) and must be called on the platform admin host. These endpoints manage the cross-tenant template catalog that tenants can copy from.

- GET `/admin/coa-templates` → list
- GET `/admin/coa-templates/:id` → detail
- POST `/admin/coa-templates` → create
  - Body: `{ template_code: string, template_name: string, version: string, is_global?: boolean, loaded_by_default?: boolean, country_iso?: string }`
  - If `is_global=true`, `country_iso` is ignored (NULL). If `is_global=false` or omitted, `country_iso` is required (2-letter ISO).
  - At most one global template can be `loaded_by_default=true` at a time (enforced). This template is auto-provisioned into every new tenant as the tenant’s Global Default CoA.
- PATCH `/admin/coa-templates/:id` → update (same fields as POST; you can toggle `is_global` and `loaded_by_default`)
- DELETE `/admin/coa-templates/:id` → delete template metadata + CSV payload
- GET `/admin/coa-templates/:id/export` → download accounts CSV (semicolon, UTF‑8 with BOM)
- POST `/admin/coa-templates/:id/import?dryRun=true|false` → upload accounts CSV (headers validated; preflight on `dryRun=true`)

Template Accounts (CSV-backed, addressed by `account_number`)
- GET `/admin/coa-templates/:id/accounts?sort=account_number:ASC&q=&page=1&limit=50` → list parsed rows
- GET `/admin/coa-templates/:id/accounts/ids?sort=...&q=...` → `{ ids: string[] }` ordered for prev/next navigation
- GET `/admin/coa-templates/:id/accounts/:accountNumber` → single row (404 if the number does not exist in the template)
- POST `/admin/coa-templates/:id/accounts` → create row `{ account_number, account_name, native_name?, description?, consolidation_account_number?, consolidation_account_name?, consolidation_account_description?, status }`
- PATCH `/admin/coa-templates/:id/accounts/:accountNumber` → update row (supports renumbering; prevents duplicates)
- DELETE `/admin/coa-templates/:id/accounts/bulk` → bulk delete `{ ids: string[] }` by account numbers
- DELETE `/admin/coa-templates/:id/accounts/:accountNumber` → delete one row by its `account_number`

Notes
- Global templates appear in UI with scope “ALL”. Country templates display their 2-letter code.
- The single template with `loaded_by_default=true` (global scope) is applied during tenant provisioning; its accounts are copied into the tenant’s newly created Global Default CoA (editable by the tenant).

### CoA-scoped Accounts CSV
- GET `/chart-of-accounts/:id/accounts/export?scope=template|data`
  - `template`: header line only; `data`: rows for this CoA
- POST `/chart-of-accounts/:id/accounts/import?dryRun=true|false`
  - Semicolon-delimited UTF‑8 CSV; validates header and rows; returns preflight or applies changes

CSV schema (CoA-scoped):
```
account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```
Notes: `native_name` is optional (original local-language label). `account_number` must be integer-like; `status` is `enabled|disabled`.

## Platform Admin: CoA Templates & Standard Accounts
- GET `/admin/coa-templates` → list templates `{ id, country_iso, template_code, template_name, version, created_at, updated_at }`
- GET `/admin/coa-templates/:id` → get template
- POST `/admin/coa-templates` → create template `{ country_iso, template_code, template_name, version }`
- PATCH `/admin/coa-templates/:id` → update template metadata or `csv_payload`
- DELETE `/admin/coa-templates/:id` → delete template

CSV (Templates)
- GET `/admin/coa-templates/:id/export` → returns template CSV (headers only if empty)
- POST `/admin/coa-templates/:id/import?dryRun=true|false` → preflight/commit CSV payload for the template
  - Response: `{ ok, dryRun, total, inserted, updated, processed?, errors: [] }`

Standard Accounts within a Template
- GET `/admin/coa-templates/:id/accounts?sort=account_number:ASC&q=&page=1&limit=50` → list standard accounts parsed from the template CSV
- GET `/admin/coa-templates/:id/accounts/ids?sort=...&q=...` → `{ ids: string[] }` ordered for workspace navigation
- GET `/admin/coa-templates/:id/accounts/:accountNumber` → get a single account
- POST `/admin/coa-templates/:id/accounts` → create `{ account_number, account_name, native_name?, description?, consolidation_account_number?, consolidation_account_name?, consolidation_account_description?, status }`
- PATCH `/admin/coa-templates/:id/accounts/:accountNumber` → update (supports changing `account_number`)
- DELETE `/admin/coa-templates/:id/accounts/:accountNumber` → delete one
- DELETE `/admin/coa-templates/:id/accounts/bulk` → delete many `{ ids: string[] }` (ids are account numbers as strings)

Notes
- Platform Admin endpoints operate outside of tenant context and never read/write tenant `accounts`.
- Standard accounts are stored as the template’s `csv_payload` and are used to seed tenant CoAs via `/chart-of-accounts/:id/load-template`.

## Accounts (Tenant)
- GET `/accounts?status=...&page=...&limit=...&sort=...&filters=...&companyId=...&coaId=...`
  - Respects quick search and AG Grid filter model
  - Supports CoA scoping via `companyId` (company’s `coa_id`) or explicit `coaId`
  - Items include `coa_code` to display CoA in the grid
- GET `/accounts/ids?sort=...&q=...&filters=...` → `{ ids, total }` (ordered by current list query)
- GET `/accounts/export?scope=template|data&coaId=...`
  - Global export includes `coa_code`; when `coaId` is provided, export is scoped
- POST `/accounts/import?dryRun=true|false&coaId=...`
  - If `coaId` is not provided, the CSV must include a single uniform `coa_code` across all rows

CSV schema (Global):
```
coa_code;account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```
Validation/behavior:
- `account_number`: required integer-like (stored as text)
- `account_name`: required (English UI label)
- `native_name`: optional (local-language label); exported and visible in UI tooltip
- `consolidation_*`: optional; number must be integer-like when present
- Deduplicates by `(account_number, target CoA)`; classifies rows as insert/update in the target CoA; supports `dryRun` preflight

### Company Metrics (per year)
- GET `/company-metrics/:companyId?year=YYYY` → `{ headcount, it_users, turnover, ... } | null`
- PATCH `/company-metrics/:companyId?year=YYYY`
  - Body: `{ headcount: int, it_users?: int, turnover?: number(<=3dp) }`
  - Validation errors: headcount/it_users must be non‑negative integers; turnover non‑negative, ≤3 decimals
  - Freeze: edits are rejected when the `freeze-states` API reports the companies scope locked for that year

## Departments
- GET `/departments?year=YYYY&status=enabled|disabled&page=1&limit=50&sort=name:ASC`
  - Response item fields include:
    - `headcount_year: number` (0 if missing)
    - `metrics_frozen: boolean`
    - `metrics_frozen` reflects the `freeze-states` departments scope for that year
- GET `/departments/ids?year=YYYY&sort=headcount_year:DESC&q&filters`
  - Returns `{ ids: string[], total: number }` ordered according to the current list query (supports the Departments workspace prev/next navigation).
- POST `/departments` → create
- PATCH `/departments/:id` → update (no metrics here)

## Applications (IT Operations)
- RBAC: resource `applications` (`reader` to view, `manager` to mutate). Admin inherits all.

- GET `/applications?status=enabled|disabled&page=1&limit=50&sort=created_at:DESC&q&filters&include`
  - AG Grid filters supported for logical columns; lifecycle filter defaults to excluding `retired`.
  - Column filters in the Applications grid (including the "Environments" summary column) are forwarded as AG Grid models via `filters` and compiled server-side; text filters use contains-style semantics (`ILIKE '%value%'`).
  - Items include `derived_total_users` plus optional expansions driven by `include`:
    - `supplier` → adds `supplier_name`
    - `owners` → adds `owners_business`, `owners_it`
    - `counts` → adds spend/capex/contracts counts + first-item tooltips
    - `residency` → adds `data_residency` ISO codes
    - `structure` → adds `suites_count`, `first_suite_name`, `components_count`, `first_component_name`
    - `instances` → adds `instances: AppInstanceSummary[]` (env, URLs, auth flags, status)
  - Sorting on derived columns is unlocked only when the respective `include` is present.
- GET `/applications/filter-values?fields=fieldA,fieldB&q&filters&include`
  - Distinct filter values for closed-choice columns in Apps & Services.
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - Caller should remove the column’s own filter so values stay discoverable.
  - Lifecycle default exclusion (Retired) is not applied to filter-values so users can opt in.
- GET `/applications/with-server-assignments`
  - Returns applications that have at least one app instance with server assignments.
  - Response: `{ items: [{ id, name, lifecycle, environments: string[] }] }` where `environments` lists only those with server assignments.
  - Used by Connection Map for app-based server selection.
- GET `/applications/:id?include`
  - Returns the logical application fields plus inline collections (owners, companies, departments, links, attachments, data_residency, derived_total_users). `include=instances` attaches the environment-level rows.
- POST `/applications`
  - Body: `{ name, supplier_id?, description?, editor?, retired_date?, version?, go_live_date?, end_of_support_date?, lifecycle, criticality, data_class, external_facing?, is_suite?, last_dr_test?, etl_enabled?, contains_pii?, licensing?, notes?, users_mode?, users_year?, users_override? }`
  - Legacy fields (`environment`, `hosting_model`, `sso_enabled`, `mfa_supported`) are accepted but discouraged; the UI writes App Instances instead.
- PATCH `/applications/:id` → partial update of the fields above.
- DELETE `/applications/:id` → cascade deletes owners/audience/links/attachments/data_residency (App Instances must be removed first via the dedicated endpoints).

Version Management
- POST `/applications/:id/create-version`
  - Creates a new application version with lineage to the source.
  - Body: `{ name, version?, go_live_date?, end_of_support_date?, copyOwners?, copyCompanies?, copyDepartments?, copyDataResidency?, copyLinks?, copySupportContacts?, copyInstances?, interfaceIds?[] }`
  - Returns the newly created application with `predecessor_id` set to the source.
  - Copies selected relations (defaults: all except instances).
  - Migrates selected interfaces by duplicating them with updated source/target references.
  - New app starts with `lifecycle: 'proposed'`.
- GET `/applications/:id/version-lineage`
  - Returns `{ predecessors: Application[], current: Application, successors: Application[] }`.
  - Walks the predecessor chain upward; queries successors by `predecessor_id`.
- GET `/applications/:id/interfaces-for-migration`
  - Returns interfaces where this app is source or target.
  - Each row includes `app_role: 'source' | 'target' | 'both'` plus `source_app_name`, `target_app_name`.

Sub-resources
- Owners: `GET /applications/:id/owners`, `POST /applications/:id/owners/bulk-replace`
- Audience: `GET /applications/:id/companies`, `POST /applications/:id/companies/bulk-replace`, equivalent endpoints for departments
- Links/Attachments: CRUD endpoints under `/applications/:id/(links|attachments)` plus download/delete helpers
- Compliance: `GET`/`POST bulk-replace` for `/applications/:id/data-residency`
- Suites: `GET /applications/:id/suites`, `POST /applications/:id/suites/bulk-replace`, `GET /applications/:id/components`
- Helper: `GET /applications/:id/total-users?year=YYYY`

Notes
- Attachments are stored in S3-compatible storage; tenant purge deletes DB rows and blobs.
- Filters include `is_suite`, derived counts, and all base fields.

### App Instances
- Endpoints:
  - `GET /applications/:applicationId/instances`
  - `POST /applications/:applicationId/instances` → `{ environment, lifecycle?, base_url?, region?, zone?, notes?, sso_enabled?, mfa_supported?, status?, disabled_at? }`
  - `PATCH /app-instances/:instanceId`
  - `DELETE /app-instances/:instanceId` (fails with 400 if bindings or server assignments exist)
- Rules:
  - Environments are unique per application.
  - Status resolves from `status` + `disabled_at` using shared lifecycle helper.
  - Deleting instances with bindings/assignments returns a descriptive error.

### Interfaces & Interface Bindings
- Interfaces (`/interfaces`)
  - `GET /interfaces?page&limit&sort&q&filters` supports filters for `interface_id`, `name`, source/target app names, `lifecycle`, `criticality`, `data_category`, `data_class`, `integration_route_type`, `business_process_id`, `contains_pii`, and optionally `environment` (via EXISTS on `interface_bindings.environment`, using a contains-style match so `qa` matches `QA`). Results include `bindings_count`, `environment_coverage`, and `binding_environments: string[]` (env codes with at least one binding).
  - `POST /interfaces` → `{ interface_id, name, business_purpose, business_process_id?, source_application_id, target_application_id, data_category, integration_route_type('direct'|'via_middleware'), lifecycle?, overview_notes?, criticality?, impact_of_failure?, business_objects?, main_use_cases?, functional_rules?, core_transformations_summary?, error_handling_summary?, data_class, contains_pii?, pii_description?, typical_data?, audit_logging?, security_controls_summary?, middleware_application_ids?: string[] }`
  - `PATCH /interfaces/:id` → accepts the same fields as `POST /interfaces` (all optional) and updates the interface; changing `integration_route_type` recreates legs (bindings cascade).
  - `DELETE /interfaces/:id`
  - `GET /interfaces/:id?include=relations,legs` → detail plus related owners/companies/dependencies/key identifiers/data residency/links/attachments and leg templates when requested.
  - `GET /interfaces/:id/legs` → `{ items: InterfaceLeg[] }` for the given interface.
  - `PATCH /interfaces/:id/legs` → `{ items: InterfaceLeg[] }` updates leg template fields for the given interface. Body: `{ items: Array<{ id: string; trigger_type?: string; integration_pattern?: string; data_format?: string; job_name?: string | null }> }`. Enum fields are validated against IT Ops settings.
- Interface Bindings (`/interfaces/:id/bindings`)
  - `GET /interfaces/:id/bindings` → list of bindings joined with leg metadata and source/target app instances.
  - `POST /interfaces/:id/bindings` → `{ interface_leg_id, source_instance_id, target_instance_id, source_endpoint?, target_endpoint?, trigger_details?, env_job_name?, authentication_mode?, monitoring_url?, env_notes?, status?, integration_tool_application_id? }`
  - `PATCH /interface-bindings/:bindingId`, `DELETE /interface-bindings/:bindingId`
  - Connection links (binding-centric):
    - `GET /interface-bindings/:bindingId/connection-links`
    - `POST /interface-bindings/:bindingId/connection-links` → `{ connection_id, notes? }` (idempotent on existing link)
    - `DELETE /interface-bindings/:bindingId/connection-links/:linkId`
  - Connection links (interface-centric, summary for maps/navigation):
    - `GET /interfaces/:id/connection-links?environment=prod` → `{ items: Array<{ id, binding_id, environment, leg_type, binding_status, connection: { id, connection_id, name, topology, lifecycle, criticality, data_class, contains_pii, risk_mode } }> }`
    - Used by the Interface Map side panel to show infra connections backing a selected interface and to drive “View in Connection Map” deep-links.
  - Service enforces:
    - The target interface exists and the leg belongs to that interface.
    - Source/target instances share the same `environment`.
    - Instances’ `application_id` values match the leg roles (source/target/middleware) and the interface’s configured applications.
    - At most one binding per `(interface_leg_id, environment)` (per tenant).

### Connections
- Connections (`/connections`)
  - `GET /connections?page&limit&sort&q&filters` → filters on `connection_id`, `name`, `topology`, `lifecycle`, `criticality`, `data_class`, `contains_pii`; returns source/destination labels, protocols, multi-server counts, and risk fields. Risk fields include both stored values (`criticality`, `data_class`, `contains_pii`, `risk_mode`) and aggregated values (`effective_criticality`, `effective_data_class`, `effective_contains_pii`, `derived_interface_count`).
  - `GET /connections/by-server/:serverId` → all connections where the server appears as source, destination, or in `connection_servers`; returns the same list shape as `GET /connections` (protocol labels, source/destination labels, multi-server count, risk fields). No paging (single-server scope).
  - `GET /connections/:id` → detail including protocol codes, risk fields, aggregated effective risk (`effective_*`, `derived_interface_count`), (for multi-server) the connected servers list, and optional `legs` when `include=legs` is provided.
  - `GET /connections/:id/legs` → ordered list (max 3) of legs for the connection.
  - `GET /connections/:id/interface-links` → linked interface bindings (interface, environment, leg, endpoints, lifecycle/status) for the connection.
  - `POST /connections`
    - Body: `{ connection_id, name, purpose?, topology: 'server_to_server'|'multi_server', source_server_id?, source_entity_code?, destination_server_id?, destination_entity_code?, servers?: string[], protocol_codes: string[], lifecycle?, notes?, criticality?, data_class?, contains_pii?, risk_mode?('manual'|'derived') }`
    - Validation: at least one protocol; lifecycle from IT Ops lifecycle list (default `active`); `server_to_server` requires exactly one participant per side (server XOR entity); `multi_server` requires ≥2 servers. Risk fields validated against IT Ops settings; `risk_mode` accepts `manual|derived` but `derived` is rejected on create (connections start in manual mode until interfaces are linked).
    - Protocol codes must exist in IT Ops **Connection Types** (also surface typical ports in UI).
  - `PATCH /connections/:id` → same shape as POST (all optional); protocols/servers use replace semantics. Setting `risk_mode = 'derived'` is allowed only when at least one `interface_connection_link` exists for the connection.
  - `PUT /connections/:id/legs` → replace legs (array of up to 3) with `order_index 1..3`, `layer_type`, one source + one destination (server or entity per side), `protocol_codes[]` (from Connection Types), optional `port_override`, `notes`.
  - `DELETE /connections/:id`
  - `DELETE /connections/bulk` (admin only) with body `{ ids: string[] }`
  - `GET /connections/map?environment=prod&lifecycles=active` → returns `{ environment, lifecycles, nodes: [{ id, name, kind:'server'|'entity', environment?, network_segment?, hosting_category? }], connections: [{ id, connection_id, name, topology, lifecycle, criticality, data_class, contains_pii, protocol_codes, protocol_labels, source_server_id, source_entity_code, destination_server_id, destination_entity_code, server_ids: string[], legs?: [{ id, order_index, layer_type, source_server_id, source_entity_code, destination_server_id, destination_entity_code, protocol_codes, protocol_labels, port_override, notes }] }] }`. `criticality`, `data_class`, and `contains_pii` on the map payload reflect effective (aggregated) risk where `risk_mode = 'derived'`. When legs exist, clients render one edge per leg; otherwise they use the S2S/mesh fallback. Nodes are limited to participants; multi-server edges are expanded client-side when the toggle is enabled.
- RBAC: uses `applications` resource (`reader` list/detail; `manager` create/update/delete; `admin` bulk delete).

### Assets & App Server Assignments
- Assets (`/servers` — endpoint name preserved for backward compatibility)
- Tenant scope: all assets endpoints require tenant context and explicitly filter by `tenant_id` (defense-in-depth in case RLS is bypassed in dev).
- `GET /servers?page&limit&sort&q&filters` supports environment/kind/provider/status/cluster/is_cluster filters and returns `assignments_count` and cluster membership context (cluster name for member servers). Search (`q`) matches name, hostname, fqdn, and aliases.
- `POST /servers` → `{ name, kind, provider, environment, region?, zone?, hostname?, ip_addresses?, is_cluster?, status?, operating_system?, location_id?, domain?, aliases?: string[] }`
- `PATCH /servers/:id` → same fields; `fqdn` is computed server-side from `hostname` + domain's `dns_suffix`
- IP addresses structure:
  - `ip_addresses`: Array of `{ type, ip, subnet_cidr }` entries, or `null`
  - `type`: IP address type code from IT Ops Settings `ipAddressTypes` (e.g., `host`, `ipmi`, `management`, `iscsi`)
  - `ip`: The IP address string (validated to belong to the subnet if `subnet_cidr` is set)
  - `subnet_cidr`: Optional subnet CIDR from IT Ops Settings subnets list; network zone and VLAN are derived from subnet at display time
- Identity fields (Technical tab):
  - `hostname`: Asset hostname; required when `domain` is set to a non-system domain
  - `domain`: Domain code from IT Ops Settings domains list (e.g., `corp-ad`, `workgroup`, `n-a`)
  - `fqdn`: Read-only, computed as `{hostname}.{dns_suffix}` or just `hostname` if dns_suffix is empty
  - `aliases`: Array of additional DNS names/aliases; stored as `text[]`
- Cluster membership
  - `GET /servers/:id/members` (cluster only) → list of member servers.
  - `POST /servers/:id/members` body `{ server_ids: string[] }` replaces membership; members must be non-cluster servers.
  - `GET /servers/:id/clusters` (host only) → clusters that include the server.
  - `GET /servers/:id`, `PATCH /servers/:id`
- Delete
  - `DELETE /servers/:id` (admin) — blocked with `409 Conflict` if the server has any app assignments or is referenced by any connection (including multi-server and leg participants); the message lists sample related items.
  - `DELETE /servers/bulk` (admin) body `{ ids: string[] }` → `{ deleted: string[], failed: [{ id, name, reason }] }` with the same conflict rules.
- App Server Assignments
  - `GET /app-instances/:instanceId/servers` → assignments for a given app instance (with joined server metadata)
  - `POST /app-instances/:instanceId/servers` → `{ server_id, role, since_date?, notes? }` (unique per `(instance, server, role)`)
  - `DELETE /app-instances/:instanceId/servers/:assignmentId`
  - `GET /servers/:serverId/assignments` → view assignments from the server perspective
  - `POST /app-server-assignments/servers-by-apps` → `{ applicationIds: string[], environments: string[] }`
    - Returns unique servers assigned to app instances for the given applications and environments.
    - Response: `{ items: [{ id, name, environment, kind, provider, is_cluster }] }`
    - Used by Connection Map for app-based server selection.
  - Instance-facing list responses expose a `hosting` object derived from the assigned server's location (or the default cloud hosting type) for read-only display.

RBAC: All of the above share the `applications` resource.

### Department Metrics (per year)
- GET `/department-metrics/:departmentId?year=YYYY` → `{ headcount, ... } | null`
- PATCH `/department-metrics/:departmentId?year=YYYY`
  - Body: `{ headcount: int }`
  - Validation errors: headcount must be non‑negative integer
  - Freeze: edits are rejected when the departments scope is frozen for that year

## IT Ops Settings
Tenant-scoped configuration for IT Operations dropdowns and enums.

- GET `/it-ops/settings`
  - Guards: `JwtAuthGuard`, `PermissionGuard`, `@RequireLevel('settings', 'reader')`
  - Returns merged settings with defaults: `{ dataClasses, networkSegments, entities, serverKinds, serverProviders, serverRoles, hostingTypes, lifecycleStates, interfaceProtocols, interfaceDataCategories, interfaceTriggerTypes, interfacePatterns, interfaceFormats, interfaceAuthModes, operatingSystems, connectionTypes, subnets, domains, ipAddressTypes }`

- PATCH `/it-ops/settings`
  - Guards: `JwtAuthGuard`, `PermissionGuard`, `@RequireLevel('settings', 'admin')`
  - Body: partial update of any settings list
  - Example body:
    ```json
    {
      "networkSegments": [{ "code": "lan", "label": "LAN" }],
      "subnets": [{ "location_id": "uuid", "cidr": "192.168.1.0/24", "vlan_number": 100, "network_zone": "lan", "description": "Office network" }],
      "domains": [{ "code": "corp-ad", "label": "Corporate AD", "dns_suffix": "corp.example.com" }]
    }
    ```
  - Subnets validation:
    - `location_id`: required, must reference valid location
    - `cidr`: required, valid IPv4 CIDR (e.g., `192.168.1.0/24`)
    - `vlan_number`: optional, 1-4094, unique per location
    - `network_zone`: required, must exist in `networkSegments`
    - CIDR uniqueness enforced per location
  - Domains validation:
    - `code`: required, auto-generated from label if not provided
    - `label`: required, display name
    - `dns_suffix`: DNS suffix for FQDN computation (can be empty for Workgroup/N/A)
    - System entries (`workgroup`, `n-a`) cannot be modified or deleted

- POST `/it-ops/settings/reset`
  - Guards: `JwtAuthGuard`, `PermissionGuard`, `@RequireLevel('settings', 'admin')`
  - Resets all settings to defaults

## Analytics Categories (Admin)
- GET `/analytics-categories?status=enabled|disabled&page=1&limit=50&sort=name:ASC`
  - Used by the OPEX modal for category lookups.
  - Items expose `{ id, name, description, status, created_at, updated_at }`.
- POST `/analytics-categories`
  - Body: `{ name: string, description?: string, status?: 'enabled'|'disabled' }`
  - Requires `analytics:manager` level.
- PATCH `/analytics-categories/:id`
  - Body supports partial updates to `name`, `description`, and `status`.
  - Requires `analytics:manager` level.
- Notes:
  - Names are unique per tenant (case-insensitive) and referenced by the OPEX CSV import/export via the `analytics_category` column.
  - Disabled categories remain selectable for historical records but should not be assigned to new spend items.

## Business Processes (Master Data)

- Resource key: `business_processes`
- RLS: tenant-scoped via `tenant_id = app_current_tenant()`

### Entities

- `business_processes`:
  - Fields: `{ id, tenant_id, name, description, notes, status, disabled_at, owner_user_id, it_owner_user_id, is_default, created_at, updated_at }`
  - Notes:
    - `name` includes the short code in parentheses, e.g. `Order-to-Cash (O2C)`.
    - `owner_user_id` and `it_owner_user_id` are optional FKs to `users(id)`.

- `business_process_categories`:
  - Fields: `{ id, tenant_id, name, is_default, is_active, sort_order, created_at, updated_at }`

- `business_process_category_links`:
  - Fields: `{ id, tenant_id, process_id, category_id, created_at, updated_at }`
  - Many-to-many join table between processes and categories.

### Endpoints

- GET `/business-processes`
  - Query params: `page`, `limit`, `sort`, `q`, `filters`.
  - Filters: supports AG Grid filters on `name`, `status`; `q` matches name/description/notes.
  - Returns list shape: `{ items: BusinessProcessRow[], total, page, limit }`.
  - `BusinessProcessRow` includes:
    - Entity fields plus:
      - `categories: { id, name, is_active }[]` (sorted by name).
      - `primary_category_name: string | null` (first category name used for default sorting).
      - `owner_name: string | null` (derived from `owner_user_id`).
  - Permissions: `business_processes:reader`.

- GET `/business-processes/ids`
  - Same query params/filters as list; returns `{ ids: string[], total: number }` for workspace navigation.
  - Permissions: `business_processes:reader`.

- GET `/business-processes/:id`
  - Returns a single process with the same shape as `BusinessProcessRow` plus timestamps.
  - Permissions: `business_processes:reader`.

- POST `/business-processes`
  - Body: `BusinessProcessUpsertDto`:
    - `{ name, description?, notes?, status?, disabled_at?, category_ids?: string[], owner_user_id?: string|null, it_owner_user_id?: string|null }`
  - Behavior:
    - Validates unique name (per tenant, case-insensitive).
    - Applies lifecycle using `status`/`disabled_at`.
    - Syncs category links to the provided `category_ids`.
  - Permissions: `business_processes:manager`.

- PATCH `/business-processes/:id`
  - Body: partial `BusinessProcessUpsertDto`.
  - Behavior:
    - Allows renaming (with uniqueness check).
    - Allows updating description/notes/owners/lifecycle and category links.
  - Permissions: `business_processes:manager`.

- DELETE `/business-processes/bulk`
  - Body: `{ ids: string[] }`.
  - Returns: `{ deleted: string[], failed: { id, name, reason }[] }`.
  - Behavior:
    - Uses a dedicated delete service; FKs or usage conflicts are reported per item.
  - Permissions: `business_processes:admin`.

- DELETE `/business-processes/:id`
  - Deletes a single process; mirrors bulk behavior.
  - Permissions: `business_processes:admin`.

### Categories

- GET `/business-process-categories`
  - Query params: `page`, `limit`, `sort`, `includeInactive=true|false`.
  - Default: only active categories unless `includeInactive=true`.
  - Returns: `{ items: BusinessProcessCategory[], total, page, limit }`.
  - Permissions: `business_processes:reader`.

- POST `/business-process-categories`
  - Body: `{ name: string, is_active?: boolean }`.
  - Behavior:
    - Names are unique per tenant (case-insensitive).
  - Permissions: `business_processes:manager`.

- PATCH `/business-process-categories/:id`
  - Body: `{ name?: string, is_active?: boolean, is_default?: boolean, sort_order?: number }`.
  - Permissions: `business_processes:manager`.

- DELETE `/business-process-categories/:id`
  - Fails with `400` if the category is still referenced by any `business_process_category_links`.
  - Permissions: `business_processes:admin`.

### CSV Import/Export

- GET `/business-processes/export?scope=template|data`
  - `scope=template`: header-only CSV.
  - `scope=data`: data CSV for all processes in the tenant.
  - Format (semicolon `;` separated, UTF‑8 with BOM):
    - `name;categories;description;notes;status`
    - `categories` is a semicolon-separated list of category names.
  - Permissions: `business_processes:admin`.

- POST `/business-processes/import?dryRun=true|false`
  - Multipart form-data with `file` field.
  - Dry-run:
    - Returns `{ ok, dryRun: true, total, inserted, updated, errors[] }`.
  - Actual load:
    - Returns `{ ok, dryRun: false, total, inserted, updated, processed, errors[] }`.
  - Behavior:
    - Validates headers and required fields.
    - Deduplicates identical rows.
    - Upserts by `name` per tenant and syncs category links, auto-creating categories as needed.
  - Permissions: `business_processes:admin`.

## Allocation Rules (default method per tenant/year)
- GET `/allocation-rules/active?year=YYYY` → `{ id, tenant_id: null, fiscal_year, method: 'headcount'|'it_users'|'turnover', status } | null`
- PATCH `/allocation-rules/active?year=YYYY` with `{ method }` → upsert as active
  - Used when a spend version has `allocation_method='default'`

## Spend Items & Versions (OPEX)
- POST `/spend-items` → create item
- GET `/spend-items/:id` → detail
- POST `/spend-items/:id/versions` with `{ version_name, as_of_date, input_grain, budget_year?, allocation_method?, allocation_driver? }`
  - `budget_year` defaults to `as_of_date` year; one version per (item, year)
  - `allocation_method` defaults to `default`; `allocation_driver` defaults to `headcount`
- PATCH `/spend-items/:id/versions` with `{ id, ...updates }`
  - `budget_year` immutable; `allocation_method` can change

## Amounts (OPEX)
- POST `/spend-versions/:id/amounts/bulk-upsert` → annual or monthly payload (see README); server expands to months

## Allocations (OPEX)
- GET `/spend-versions/:id/allocations` → `{ items: AllocationRow[], total_pct, resolved_method }`
  - `AllocationRow`: `{ id|null, company_id, department_id|null, allocation_pct, source: 'manual'|'auto' }`
  - Percentages are recomputed on the fly from the active allocation method and latest company metrics. Manual rows surface as `source: 'manual'` with their persisted percentage; auto rows are derived each request.
- POST `/spend-versions/:id/allocations/bulk-upsert`
  - Auto methods (`default|headcount|it_users|turnover`) ignore the payload; the endpoint validates data/metrics and clears any persisted rows so the distribution is always derived dynamically.
  - Manual by Company (`manual_company`): send the selected `company_id`s (and optional `allocation_driver` via the version PATCH). Percentages are recomputed server-side from the chosen metric.
  - Manual by Department (`manual_department`): send `{ company_id, department_id }` pairs; headcount percentages are recomputed server-side.
  - Error codes: `400` on missing IDs or missing/zero metrics needed for the distribution.

## CAPEX Items & Versions
- POST `/capex-items` → create CAPEX item
- GET `/capex-items/:id` → detail
- POST `/capex-items/:id/versions` with `{ version_name, as_of_date, input_grain, budget_year?, allocation_method?, allocation_driver? }`
  - `allocation_method` defaults to `default`; `allocation_driver` defaults to `headcount`
  - One version per (item, budget_year)
- PATCH `/capex-items/:id/versions` with `{ id, input_grain?, notes?, allocation_method? }`

## Amounts (CAPEX)
- POST `/capex-versions/:id/amounts/bulk-upsert` → annual or monthly payload; server writes the appropriate rows to `capex_amounts`
  - Annual payload: `{ kind: 'annual', year, totals: { planned, actual, expected_landing, committed } }`
  - Monthly payload: `{ kind: 'monthly', year, months: [{ period: 'YYYY-MM-01', planned?, actual?, expected_landing?, committed?, forecast? }] }`

## Allocations (CAPEX)
- GET `/capex-versions/:id/allocations` → `{ items: AllocationRow[], total_pct, resolved_method }`
  - Same schema as OPEX allocations; resolves `default` using allocation rules for the fiscal year
- POST `/capex-versions/:id/allocations/bulk-upsert`
  - Manual methods mirror the spend API: patch the version with `{ allocation_method, allocation_driver? }`, then POST only the selected companies/departments. Percentages are recomputed server-side from company or department metrics.
  - Auto (`default|headcount|it_users|turnover`): send `[]` to recompute distribution
  - Manual company: rows require `company_id`, `department_id = null`
  - Manual department: rows require `company_id` and `department_id`

### CAPEX Tasks
- GET `/capex-items/:id/tasks` → list tasks for a CAPEX item (latest first)
- POST `/capex-items/:id/tasks` → create `{ title: string, description?: string, status?: 'open'|'in_progress'|'done'|'cancelled', due_date?: 'YYYY-MM-DD', assignee_user_id?: uuid }`
- PATCH `/capex-items/:id/tasks` → update `{ id, ...fields }`
  - Uses the same unified tasks model as OPEX/Contracts

### CAPEX Relations
- Project
  - PATCH `/capex-items/:id` → accepts `{ project_id?: uuid|null }`
- Contracts
  - GET `/capex-items/:id/contracts` → `{ items: [{ id, name }] }`
  - POST `/capex-items/:id/contracts/bulk-replace` → `{ contract_ids: uuid[] }`
- Relevant Websites (Links)
  - GET `/capex-items/:id/links`
  - POST `/capex-items/:id/links` → `{ description?: string, url: string }`
  - PATCH `/capex-items/:id/links/:linkId`
  - DELETE `/capex-items/:id/links/:linkId`
- Attachments
  - GET `/capex-items/:id/attachments`
  - POST `/capex-items/:id/attachments` (multipart `file`)
  - GET `/capex-items/attachments/:attachmentId` (download)
  - PATCH `/capex-items/attachments/:attachmentId/delete`

## Summary (OPEX list)
- GET `/spend-items/summary?status=enabled&page=1&limit=50&sort=product_name:ASC&years=2024,2025,2026`
  - Each row includes derived blocks for Y-1, Y, Y+1 totals and:
    - `allocation_method_label`: `Headcount|IT users|Turnover|Company|Department` (resolves `default` via rule)
    - `latest_contract_id` and `latest_contract_name` when linked to Contracts
  - Optional `years` parameter: comma-separated list of years to fetch (e.g., `years=2024,2025,2026`)
    - If omitted, defaults to Y-1, Y, Y+1 (where Y = current year)
    - Response includes dynamic year keys: `versions.y2024`, `versions.y2025`, etc. in addition to legacy `yMinus1`, `y`, `yPlus1` for backward compatibility
- GET `/spend-items/summary/filter-values?fields=fieldA,fieldB&q&filters&years=2024,2025,2026` **[Requires: opex:reader]**
  - Distinct filter values for closed-choice columns in the OPEX summary grid.
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - Caller should remove the column’s own filter so values stay discoverable.

## Summary (CAPEX list)
- GET `/capex-items/summary?status=enabled&page=1&limit=50&sort=yBudget:DESC`
  - Each row includes `{ versions: { yMinus1, y, yPlus1 }, allocation_method_label, next_year_allocation_method_label, spread_mode_for_y, company_name }`
  - Also includes `latest_task?: { id, title?, description?, status, created_at } | null` for open/in_progress tasks (most recent)
- GET `/capex-items/summary/ids` → `{ ids, total }` ordered by requested sort (supports derived fields like `yBudget`)
- GET `/capex-items/summary/totals` → `{ reportingCurrency, yMinus1Landing, yBudget, yLanding, yPlus1Budget }`
- GET `/capex-items/summary/filter-values?fields=fieldA,fieldB&q&filters` **[Requires: capex:reader]**
  - Distinct filter values for closed-choice columns in the CAPEX summary grid.
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - Caller should remove the column’s own filter so values stay discoverable.

## Contracts

- GET `/contracts?status=enabled&page=1&limit=50&sort=cancellation_deadline:ASC&q&filters`
  - Items include derived: `end_date`, `cancellation_deadline`, `linked_opex_count`, and nested `supplier {id,name}`, `company {id,name}` plus `latest_task`.
- GET `/contracts/:id` → details including `links` (URLs), `attachments` (metadata), and `linked_spend_items`.
- POST `/contracts` → create; PATCH `/contracts/:id` → update.

### Contracts ↔ OPEX links (many-to-many)
- Contracts side: GET `/contracts/:id/spend-items` and POST `/contracts/:id/spend-items/bulk-replace` with `{ spend_item_ids: string[] }`
- OPEX side: GET `/spend-items/:id/contracts` and POST `/spend-items/:id/contracts/bulk-replace` with `{ contract_ids: string[] }`

### OPEX URLs and attachments
- URLs: GET `/spend-items/:id/links`, POST `/spend-items/:id/links`, PATCH `/spend-items/:id/links/:linkId`, DELETE `/spend-items/:id/links/:linkId`
- Attachments: GET `/spend-items/:id/attachments`, POST `/spend-items/:id/attachments`; download GET `/spend-items/attachments/:attachmentId`, delete PATCH `/spend-items/attachments/:attachmentId/delete`
  - Permissions: `opex:reader` for list/download; `opex:manager` for create/update/delete

### Contracts ↔ CAPEX links (many-to-many)
- Contracts side: GET `/contracts/:id/capex-items` and POST `/contracts/:id/capex-items/bulk-replace` with `{ capex_item_ids: string[] }`
- CAPEX side: GET `/capex-items/:id/contracts` and POST `/capex-items/:id/contracts/bulk-replace` with `{ contract_ids: string[] }`

### Contract tasks, URLs, attachments
- Tasks: GET `/contracts/:id/tasks`, POST `/contracts/:id/tasks`, PATCH `/contracts/:id/tasks`
- URLs: GET `/contracts/:id/links`, POST `/contracts/:id/links`, PATCH `/contracts/:id/links/:linkId`
- Attachments: GET `/contracts/:id/attachments`, POST `/contracts/:id/attachments`; download GET `/contracts/attachments/:attachmentId`, delete PATCH `/contracts/attachments/:attachmentId/delete`

## Share / Send Link

Fire-and-forget email notifications to share a link to a Task, Project, or Request. Recipients can be existing platform users (by ID) and/or arbitrary email addresses. No access control changes — this is a notification, not a permission grant.

- POST `/tasks/:id/share` — share a task **[Requires: tasks:reader]**
- POST `/portfolio/projects/:id/share` — share a project **[Requires: portfolio_projects:reader]**
- POST `/portfolio/requests/:id/share` — share a request **[Requires: portfolio_requests:reader]**

All three endpoints accept the same body (`ShareItemDto`):
```json
{
  "recipient_user_ids": ["uuid", ...],   // optional — existing user IDs
  "recipient_emails": ["a@b.com", ...],  // optional — arbitrary email addresses
  "message": "Check this out"            // optional — personal message
}
```
At least one of `recipient_user_ids` or `recipient_emails` must be non-empty. User IDs are resolved to emails server-side (only enabled, non-system-role users receive the notification). Raw emails are sent directly without validation against the user table.

Response: `{ success: true }` (202-style fire-and-forget; email failures are silent).

## Tasks (Cross-Platform)

- GET `/tasks?status=open|in_progress|done|cancelled&page=1&limit=50&sort=created_at:DESC&q&filters` — list all tasks (aggregated) **[Requires: tasks:reader]**
  - Response: `{ items: TaskRow[], total, page, limit }`
  - TaskRow: `{ id, tenant_id, title, description, status, due_date, created_at, assignee_user_id, assignee_name, related_object_type, related_object_id, related_object_name, priority_level, priority_score, task_type_id, task_type_name, source_id, source_name, category_id, category_name, stream_id, stream_name, company_id, company_name }`
  - Filtering: supports AG Grid filter model via `filters` JSON and `q` quick search; default sort `created_at:DESC`
    - Text filters: `{ filterType: 'text', type: 'contains' | 'equals' | ... , filter: string }`
    - Set filters: `{ filterType: 'set', values: string[] }` (empty array = match nothing)
  - Status: `open|in_progress|done|cancelled`; Types: `spend_item|contract|capex_item|project` (or `null` for standalone)
  - Priority score: All tasks have scores; project tasks use `project.score + adjustment`, non-project use fixed mapping (Blocker=110, High=90, Normal=70, Low=50, Optional=30)
  - Classification: For standalone tasks, returns direct values; for project tasks, returns inherited values from project; for other types, returns null
  - Permissions: `tasks:reader` auto-granted when any operations resource has access

- GET `/tasks/ids?sort=...&q=...&filters=...` — ordered ids for workspace navigation **[Requires: tasks:reader]**
- GET `/tasks/filter-values?fields=fieldA,fieldB&q&filters&assigneeUserId&teamId` — distinct filter values for closed-choice columns **[Requires: tasks:reader]**
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - `filters` should be the current AG Grid filterModel JSON; the caller should remove the column’s own filter so values stay discoverable.
- GET `/tasks/:id` — single task with joined names **[Requires: tasks:reader]**
- PATCH `/tasks/:id` — update standalone task **[Requires: tasks:manager]**
  - Body: `{ title?, description?, status?, priority_level?, start_date?, due_date?, assignee_user_id?, task_type_id?, source_id?, category_id?, stream_id?, company_id? }`
  - Classification fields (`source_id`, `category_id`, `stream_id`, `company_id`) only allowed for standalone tasks; rejected for linked tasks
- PATCH `/tasks/:id/move` — change related object `{ related_object_type, related_object_id }` **[Requires: tasks:manager]**
- DELETE `/tasks/bulk` — bulk delete `{ ids: string[] }` → `{ deleted: string[], failed: { id, name, reason }[] }` **[Requires: tasks:admin]**

## Portfolio Requests
- GET `/portfolio/requests/filter-values?fields=fieldA,fieldB&q&filters` — distinct filter values for closed-choice columns **[Requires: portfolio_requests:reader]**
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - Caller should remove the column's own filter so values stay discoverable.

## Portfolio Team Members
- GET `/portfolio/team-members/time-stats` — bulk time stats for contributor list **[Requires: portfolio_settings:reader]**
  - Response: `{ stats: { [configId]: { avgProjectDays, avgTotalDays } } }`
- GET `/portfolio/team-members/:id/time-stats` — time stats for a single contributor config **[Requires: portfolio_settings:reader]**
  - Response: `{ userId, averageProjectDays, monthly: [{ yearMonth, projectDays, otherDays, totalDays }] }`

## Portfolio Reports
- GET `/portfolio/reports/status-change?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&statuses=...&itemTypes=...&sourceIds=...&categoryIds=...&streamIds=...` — status change report **[Requires: portfolio_reports:reader]**
  - Required:
    - `startDate` (`YYYY-MM-DD`)
    - `endDate` (`YYYY-MM-DD`)
  - Optional filters:
    - `statuses`: comma-separated status values; applies to the status reached after the change (final status for the period)
    - `itemTypes`: comma-separated `task|request|project`
    - `sourceIds`, `categoryIds`, `streamIds`: comma-separated UUIDs
  - Inclusion logic:
    - Includes items whose `status` changed during the selected period (inclusive by day).
    - If an item changed status multiple times in the period, only the latest in-period change is kept.
    - Task scope includes standalone tasks only (project-linked tasks excluded).
  - Response:
    - `{ items: StatusChangeReportRow[] }`
    - `StatusChangeReportRow`: `{ itemType, itemId, itemPath, name, priority, status, sourceId, sourceName, categoryId, categoryName, streamId, streamName, companyName, lastChangedAt }`
- GET `/portfolio/reports/status-change/filter-values?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&...` — distinct filters for status change report **[Requires: portfolio_reports:reader]**
  - Returns values constrained to the current query scope and period.
  - Response:
    - `{ statuses: string[], itemTypes: ('task'|'request'|'project')[], sources: {id,name}[], categories: {id,name}[], streams: {id,name,categoryId}[] }`
- GET `/portfolio/reports/status-change/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&...&format=csv|xlsx` — export status change report **[Requires: portfolio_reports:reader]**
  - `format` defaults to `csv`.
  - CSV columns: `Name, Item Type, Priority, Status, Source, Category, Stream, Company, Last Changed`.
  - XLSX includes the same columns; `Name` cells are hyperlinks to the item workspace route.
- GET `/portfolio/reports/capacity-heatmap?teamIds=...&statuses=...&capacityMode=...&groupBy=...` — capacity heatmap **[Requires: portfolio_reports:reader]**
  - `teamIds`: comma-separated team ids; include `no-team` to include contributors without a team (omit to include all teams)
  - `statuses`: comma-separated project statuses; default is `waiting_list,planned,in_progress,in_testing,on_hold`
  - `capacityMode`: `historical` (default) or `theoretical`
  - `groupBy`: `contributor` (default) or `team`
  - Response: `{ contributors: ContributorCapacityRow[], teams: TeamCapacityRow[], unassignedSummary, unassignedProjects, filters }`
- GET `/portfolio/reports/capacity-heatmap/contributor/:contributorId?statuses=...` — project breakdown for contributor **[Requires: portfolio_reports:reader]**
  - Response: `{ projects: ProjectBreakdownRow[] }`
- POST `/portfolio/reports/roadmap/generate` — generate roadmap scenario (read-only simulation) **[Requires: portfolio_reports:reader]**
  - Body:
    - `startDate` (`YYYY-MM-DD`, required)
    - `statuses` (`waiting_list|planned|in_progress|in_testing|on_hold|done`; default: `waiting_list,planned,in_progress,in_testing`)
    - `capacityMode` (`theoretical|historical`, default `theoretical`)
    - `parallelizationLimit` (`1..3`, default `1`)
    - `optimizationMode` (`priority_focused|completion_focused`, default `priority_focused`)
    - `includeAlreadyScheduled` (boolean, default `true`)
    - `excludedProjectIds` (`uuid[]`, default `[]`)
    - `contextSwitchPenaltyPct` (`0..0.5`, default `0.1`)
    - `contextSwitchGrace` (`0..10`, default `1`)
  - Response:
    - `schedule[]`:
      - `{ projectId, projectName, status, categoryId, executionProgress, priorityScore, plannedStart, plannedEnd, durationWeeks, remainingEffortDays, blockerProjectIds, contributorLoads[] }`
      - `contributorLoads[]`: `{ contributorId, contributorName, days }`
    - `unschedulable[]` (with reasons such as `missing_blocker_date`, `insufficient_capacity`, `missing_contributor_capacity`)
    - `bottlenecks[]` (`impactDays` sensitivity)
      - shape: `{ contributorId, contributorName, impactDays }`
      - UI drilldown table (project start/end, total contribution, spent days) is derived client-side from `schedule[].contributorLoads` and `executionProgress`
    - `occupation[]` (contributor/week effort/capacity/occupation + project breakdown)
      - shape: `{ contributorId, contributorName, teamId, teamName, week, effortDays, capacityDays, occupationPct, projects[] }`
      - `occupationPct` is rounded to the nearest integer
    - `teamOccupation[]` (team/week aggregation)
      - shape: `{ teamId, teamName, week, effortDays, capacityDays, occupationPct }`
      - `occupationPct` is rounded to the nearest integer
    - `roadmapEndDate`, `options`, `diagnostics`
  - Behavioral notes:
    - `includeAlreadyScheduled=true` allows recomputing projects that already have planned dates.
    - `includeAlreadyScheduled=false` keeps those projects as frozen commitments that still consume capacity.
    - `excludedProjectIds` excludes projects entirely from the scenario, including frozen-capacity consumption.
    - Best effort is used for missing capacity: contributors without configured capacity are dropped per project; the project is unschedulable only if no contributor with capacity remains.
    - For already started projects (past `actual_start`, fallback eligible past `planned_start`), the historical start is preserved while remaining effort is simulated forward.

## Portfolio Projects
- GET `/portfolio/projects/filter-values?fields=fieldA,fieldB&q&filters` — distinct filter values for closed-choice columns **[Requires: portfolio_projects:reader]**
  - Response: `{ fieldA: Array<string | null>, fieldB: Array<string | null> }`
  - Caller should remove the column's own filter so values stay discoverable.
- GET `/portfolio/projects/planning/timeline?months=3&category=<uuid>&status=planned&status=in_progress` — planning timeline feed for Gantt **[Requires: portfolio_projects:reader]**
  - Query parameters:
    - `months` (optional, number): lookback horizon for including historical items; defaults to `3`
    - `category` (optional, UUID): filter by project category
    - `status` (optional, repeated): filter by one or more project statuses
  - Response shape:
    - `projects: Array<{ id, name, status, category_id, planned_start, planned_end, actual_start, actual_end, execution_progress }>`
    - `dependencies: Array<{ id, project_id, depends_on_project_id, dependency_type }>` (only links where both ends are visible in the current project set)
    - `milestones: Array<{ id, project_id, name, target_date, status, project_name }>` (filtered to milestones with `target_date >= viewStart`)
    - `viewStart: string` (`YYYY-MM-DD`, computed as `today - months`)
  - Notes:
    - Cancelled projects are excluded.
    - Returned projects include items with planned dates, plus recently completed items still inside lookback (`planned_end` or `actual_end` >= `viewStart`).
    - Frontend visual windowing/scroll positioning is managed client-side.
- POST `/portfolio/projects/planning/roadmap/apply` — apply generated roadmap dates to selected projects **[Requires: portfolio_projects:contributor]**
  - Body: `{ projects: Array<{ projectId: uuid, plannedStart: YYYY-MM-DD, plannedEnd: YYYY-MM-DD }> }`
  - Validation:
    - `projects` must contain at least one item
    - duplicate `projectId` values are rejected
    - each item requires `plannedStart <= plannedEnd`
  - Behavior:
    - all-or-nothing transaction; one failing project aborts the entire apply
    - updates run through project update service path (same validation/audit behavior as manual edits)
  - Success response: `{ updated: number }`
  - Error response (HTTP 400):
    - `{ message: "Roadmap apply failed", code: "ROADMAP_APPLY_FAILED", details: [{ projectId, error }] }`

### Effort Allocations
- GET `/portfolio/projects/:id/effort-allocations/:effortType` — get allocations for a project **[Requires: portfolio_projects:reader]**
  - `effortType`: `it` or `business`
  - Returns: `{ mode: 'auto'|'manual', allocations: AllocationUser[], total_pct: number, estimated_effort: number }`
  - `AllocationUser`: `{ user_id, email, first_name, last_name, allocation_pct, is_lead, is_orphaned? }`
  - In auto mode, allocations are computed on-the-fly using business rules (10% lead, 90% team split)
  - In manual mode, returns stored allocations; `is_orphaned=true` for users no longer on the team
- POST `/portfolio/projects/:id/effort-allocations/:effortType` — set manual allocations **[Requires: portfolio_projects:manager]**
  - Body: `{ allocations: Array<{ user_id: string, allocation_pct: number }> }`
  - Validation: sum must equal 100%, all values must be integers 0-100, users must be eligible (lead or team member)
  - Sets allocation mode to `manual` and stores the allocations
- DELETE `/portfolio/projects/:id/effort-allocations/:effortType` — reset to auto mode **[Requires: portfolio_projects:manager]**
  - Deletes stored allocations and sets mode back to `auto`

### Standalone Task Management
- POST `/tasks/standalone` — create standalone task (not linked to any object) **[Requires: tasks:member]**
  - Body: `{ title: string, description?: string, status?: string, priority_level?: string, start_date?: string, due_date?: string, assignee_user_id?: string, task_type_id?: string, source_id?: string, category_id?: string, stream_id?: string, company_id?: string }`
  - `title` is required and cannot be empty
  - Classification fields (`source_id`, `category_id`, `stream_id`, `company_id`) reference portfolio classification entities

### OPEX Task Management
- GET `/spend-items/:id/tasks` → list tasks for specific OPEX item (sorted by creation date DESC) **[Requires: tasks:reader]**
- POST `/spend-items/:id/tasks` → create task **[Requires: tasks:manager]**
  - Body: `{ title: string, description?: string, status?: string, due_date?: string (YYYY-MM-DD), assignee_user_id?: string }`
  - `title` is required and cannot be empty
  - `description` is optional (nullable)
  - Status defaults to `open` if not provided
  - Note: Tasks are independent objects; OPEX manager without tasks:manager cannot create tasks
- PATCH `/spend-items/:id/tasks` → update task **[Requires: tasks:manager]**
  - Body: `{ id: string, title?: string, description?: string, status?: string, due_date?: string, assignee_user_id?: string }`
  - Requires task `id` in body; validates task belongs to specified item
  - `title` cannot be empty if provided
  - `description` can be null or omitted
  - Note: OPEX manager without tasks:manager cannot edit tasks

### Contracts Task Management
- GET `/contracts/:id/tasks` → list tasks for specific Contract (sorted by creation date DESC) **[Requires: tasks:reader]**
- POST `/contracts/:id/tasks` → create task **[Requires: tasks:manager]**
- PATCH `/contracts/:id/tasks` → update task **[Requires: tasks:manager]**
  - Same body/validation semantics as OPEX tasks (title required, description optional, unified statuses)

### Contracts CSV
- Export `GET /contracts/export?scope=template|data`; Import `POST /contracts/import?dryRun=true|false`
- Headers: `name;company_name;supplier_name;start_date;duration_months;auto_renewal;notice_period_months;yearly_amount_at_signature;currency;billing_frequency;status;owner_email;notes`
- Upsert key: composite `name + supplier_name`; references by name/email

## Contacts (Directory)

- GET `/contacts?page=1&limit=50&sort=last_name:ASC|supplier_name:ASC&q&filters&active=true|false` — list contacts with search across name/email/phone **and supplier name**. [Requires: contacts:reader]
  - Response: `{ items: { id, first_name, last_name, job_title, email, phone, mobile, country, notes, active, supplier_id, supplier_name, created_at, updated_at }[], total, page, limit }`
  - Filters accept `supplier_id` and `supplier_name` (AG Grid text filter semantics) in addition to the existing fields.
- GET `/contacts/:id` — single contact, returns `supplier_id` and `supplier_name`. [Requires: contacts:reader]
- POST `/contacts` — create. Body supports the fields above; `email` required, `supplier_id` optional (validated against existing suppliers). [Requires: contacts:manager]
- PATCH `/contacts/:id` — partial update (supplier_id can be set or cleared). [Requires: contacts:manager]
- DELETE `/contacts/:id` — delete one. Removes supplier links first. [Requires: contacts:manager]
- DELETE `/contacts/bulk` — bulk delete `{ ids: string[] }` → `{ deleted: string[], failed: { id, name, reason }[] }`. [Requires: contacts:admin]

### Contacts CSV
- Export: `GET /contacts/export?scope=template|data` (semicolon separator, UTF‑8 with BOM)
- Import: `POST /contacts/import?dryRun=true|false`
- Headers: `first_name;last_name;job_title;email;phone;mobile;country;notes;active`
- Upsert key: `email` (per tenant). Import normalizes to lowercase; creates when missing; updates otherwise.
- Validation: `email` required; `country` ISO alpha‑2; `active` accepts `true|false|1|0|yes|no`.

### Suppliers ↔ Contacts Links
- GET `/suppliers/:id/contacts` — list links with embedded contact and role. [Requires: suppliers:reader]
- POST `/suppliers/:id/contacts` — attach `{ contactId, role: 'commercial'|'technical'|'support'|'other', isPrimary? }`. [Requires: suppliers:manager]
- DELETE `/suppliers/:id/contacts/:linkId` — detach. [Requires: suppliers:manager]

### Suppliers CSV (contacts columns)
- Headers still include `commercial_contact;technical_contact;support_contact` for compatibility. Values must be email addresses (one per column). On import, the system links the supplier to contacts by email (creating contacts if needed). On export, these columns contain the primary (or first) linked contact email per role.

## Reporting (Phase 1)
- Frontend reports consume `/spend-items/summary` and `/capex-items/summary` to compute:
  - Top 10 OPEX by Budget (Y)
  - Top Increase/Decrease vs (Y-1) Budget or Landing → Budget (Y)
  - Budget Trend (OPEX): multi-metric line over a year range (Budget, Follow-up, Landing, Revision)
  - Budget Trend (CAPEX): same controls as OPEX trend, backed by CAPEX data
  - Budget Column Comparison: up to 10 selections (Year + Column), with a Year grouping mode that pivots by year and renders one series per column when each selected column spans at least two distinct years
  - Budget by Consolidation Account: group totals by each account's consolidation account; pie for single year, line for multi-year
  - Budget by Analytics Category: same controls/visuals as consolidation report but grouped by analytics category metadata
- Totals fields exposed per year slot:
  - Legacy keys (backward compatible): `versions.yMinus1`, `versions.y`, `versions.yPlus1`
  - Dynamic year keys: `versions.y2024`, `versions.y2025`, etc. (available when using `years` parameter)
  - Each slot contains: `{ year?, totals: { budget, follow_up, landing, revision }, approved?, version_id? }`
  - Note: Use the `years` query parameter to fetch arbitrary years (Y-5 through Y+5). Without it, defaults to Y-1, Y, Y+1.

### Disabled Date Semantics (applies to Reporting endpoints)
- Fiscal year = calendar year.
- Items contribute through their `disabled_at` year and contribute zero for strictly later years.
  - OPEX/CAPEX summaries: when `status` is omitted (neutral), items are included if `(disabled_at IS NULL OR disabled_at >= :period_start)`, where `period_start` is the start of the earliest requested year.
  - Chargeback: version/item joins are per selected `year` using `(disabled_at IS NULL OR disabled_at >= :period_start)`.
  - Allocation recipients (companies/departments): computed per version year with the same rule.
  - Manual allocation validations (company/department modes) enforce availability per fiscal year, using the same condition.
  - Example: `disabled_at = 2025-06-30` → contributes to 2025 totals; excluded from 2026.

## Common Notes
- Pagination/sort
  - `page`, `limit`, `sort=field:ASC|DESC` supported on list endpoints; lists return `{ items, total, page, limit }`
- Filtering (grids)
  - Grids pass `filters` as an AG Grid `filterModel` JSON string; server applies simple equals/contains where applicable
- Status & lifecycle
  - Most master lists support `?status=enabled|disabled`. When omitted, lists default to rows that are active as of now.
  - Reporting endpoints (OPEX/CAPEX summaries, Chargeback) are year-aware:
    - For neutral status, item inclusion uses a period-start gate derived from the requested years.
    - For joins/allocations tied to a single report year, the period start is the start of that year.
    - This yields: included through the disabled year and excluded for strictly later years.
  - Users additionally support `contact|invited`; seat usage only counts `enabled`.

## Examples

### Upsert company metrics
```
PATCH /company-metrics/3b1c…?year=2025
{
  "headcount": 120,
  "it_users": 80,
  "turnover": 12.345
}
```

### Manual by company allocations
```
PATCH /spend-items/9a2f…/versions
{
  "id": "v-2025",
  "allocation_method": "manual_company",
  "allocation_driver": "it_users"   // optional, defaults to "headcount"
}

POST  /spend-versions/v-2025/allocations/bulk-upsert
[
  { "company_id": "c1" },
  { "company_id": "c2" }
]
```
- Send only the companies you want to keep. `allocation_pct` is optional and ignored—percentages are recomputed from the latest company metrics using the stored `allocation_driver`.
- `allocation_driver` may be `headcount`, `it_users`, or `turnover`. Omit it to fall back to headcount.

### Auto (headcount) allocations (empty payload → full materialization)
```
PATCH /spend-items/9a2f…/versions { id: "v-2025", allocation_method: "headcount" }
POST  /spend-versions/v-2025/allocations/bulk-upsert []
```
## Users (Admin)
- POST `/users` → create user `{ email, first_name?, last_name?, role_id?, status? }`
  - Password is optional; most flows leave it empty and rely on the invite/password-reset pipeline.
  - `role_id` preferred; falls back to `role_name` (defaults to system `Contact`).
  - `status` defaults to `enabled`; enforcing seats still happens when saving with `status='enabled'`.
- POST `/users/:id/enable` → sets user `status='enabled'` (consumes a seat)
  - Requires: users:admin level
  - Enforces seats: fails with 400 when `seats_used >= seat_limit`
- POST `/users/:id/disable` → sets user `status='disabled'` (frees a seat)
  - Requires: users:admin level
- POST `/users/:id/invite` → sets user `status='invited'` (does not consume a seat)
  - Requires: users:admin level
  - Sends a Resend email with a password setup CTA pointing to `/accept-invite#token=...`. The token reuses the password-reset pipeline and automatically enables the user once a password is set.

## Roles (Admin)
- GET `/roles` → `{ items: Role[] }` (includes `user_count` and `is_system`)
- POST `/roles` → create role `{ role_name, role_description }` (admin only)
- DELETE `/roles/:id` → delete role (no users assigned, not system)
- GET `/roles/:id/permissions` → returns per-page permission levels for the role
  - Example: `{ companies: 'manager', suppliers: null, ... }`
- PUT `/roles/:id/permissions` → sets per-page permission levels for the role
  - Body: `{ permissions: { [resource]: 'reader'|'manager'|'admin'|null } }`
  - Note: `Administrator` and `Contact` are system-locked; the former is always full access, the latter cannot be granted access or login

## Audit Logs (Admin)
- Permission: `users:admin`
- GET `/audit-logs?page=1&limit=100&sort=created_at:DESC&q=...&from=YYYY-MM-DD&to=YYYY-MM-DD&table_name=...&action=...&source=...&user_id=...&filters=<agGridFilterModel>`
  - Returns paginated audit entries for the current tenant:
    - `{ items, total, page, limit }`
  - Item shape:
    - `{ id, tenant_id, table_name, record_id, action, before_json, after_json, user_id, user_email, user_name, source, source_ref, created_at }`
  - Supports quick search (`q`) across `table_name`, `action`, and actor name/email.
  - Supports date range filtering:
    - `from` is inclusive (`>=`)
    - `to` is exclusive (`<`) when a full datetime is provided; for `YYYY-MM-DD`, API treats it as end-of-day inclusive by shifting to the next day internally.
  - Whitelisted sort fields: `created_at`, `table_name`, `action`. Default: `created_at:DESC`.
  - `source` identifies origin (`user`, `system`, `webhook`); `source_ref` stores upstream event correlation (for example Stripe event id).
- GET `/audit-logs/filter-values?fields=table_name,action,source&q=...&filters=<agGridFilterModel>`
  - Returns distinct filter values for checkbox-set column filters, scoped by the current query state.
  - Response shape:
    - `{ table_name?: (string|null)[], action?: (string|null)[], source?: (string|null)[] }`
- GET `/audit-logs/:id`
  - Returns one audit entry with the same shape as list items.
  - Used by the detail dialog to display full before/after JSON payloads.

## Budget Operations (OPEX Admin)

### Copy Budget Columns
- POST `/spend-items/budget-operations/copy-column`
  - Body: `{ sourceYear: number, sourceColumn: BudgetColumn, destinationYear: number, destinationColumn: BudgetColumn, percentageIncrease: number, overwrite: boolean, dryRun: boolean }`
  - Budget columns: `budget`, `revision`, `follow_up`, `landing` (mapped to database columns: `planned`, `committed`, `actual`, `expected_landing`)
  - Year range: Y-1 to Y+5 (relative to current year)
  - Features:
    - `percentageIncrease`: Apply percentage adjustment (e.g., 5.0 for 5% increase) with integer rounding
    - `overwrite`: If false, skips destination items that already have data; if true, overwrites all
    - `dryRun`: If true, returns preview without making changes
  - Returns: `{ success: boolean, dryRun: boolean, summary: { totalItems, processed, skipped, errors }, results: BudgetOperationResult[] }`
  - `BudgetOperationResult`: `{ itemId, itemName, sourceValue, currentDestinationValue, newValue }`
  - Requires: `opex:admin` level
  - Notes:
    - True copy operation - source data is never modified
    - Preserves all other columns when updating destination column
    - Creates versions/amounts for destination year if they don't exist
    - Full audit logging for compliance

### Clear Budget Column
- POST `/spend-items/budget-operations/clear-column`
  - Body: `{ year: number, column: BudgetColumn }`
  - Budget columns: `budget`, `revision`, `follow_up`, `landing`
  - Year range: Y-1 to Y+5 (relative to current year)
  - Returns: `{ success: boolean, summary: { totalItems, cleared, skipped, errors } }`
  - Requires: `opex:admin` level
  - Notes:
    - Sets all values in the specified column to NULL (not zero)
    - Preserves all other columns
    - Only processes items that have data in the target column
    - Full audit logging for compliance
    - Permanent operation - cannot be undone

### Freeze / Unfreeze Data
- GET `/freeze-states?year=YYYY`
  - Returns `{ year, entries: FreezeState[], summary }`
  - `entries` list raw rows (`scope`, optional `column`, timestamps, user IDs); `summary` aggregates by scope/column for quick status checks
- POST `/freeze-states/freeze`
  - Body: `{ year: number, scopes: Array<{ scope: 'opex'|'capex'|'companies'|'departments', columns?: ('budget'|'revision'|'actual'|'landing')[] }> }`
  - Locks the requested year/scope combinations (columns required for OPEX/CAPEX; ignored for company/department metrics)
  - Requires `budget_ops:admin`
- POST `/freeze-states/unfreeze`
  - Body mirrors the freeze payload
  - Requires `budget_ops:admin`
- All three endpoints return the same shape so the UI can refresh local state after each call.

## Tenants (Platform Admin)
- GET `/admin/tenants?page=1&limit=20&q=slug&status=active`
  - Requires platform admin claim (`isPlatformAdmin` true)
  - Returns `{ items, total, page, limit }` where each item contains summary stats (companies, headcount, departments, suppliers, OPEX, CAPEX, users enabled/total) and plan snapshot `{ plan_name, seat_limit, seats_used, subscription_type, payment_mode, next_payment_at }`
  - Supports `status` filters: `active`, `frozen`, `deleting`, `deleted`
- GET `/admin/tenants/:tenantId`
  - Returns full detail including lifecycle timestamps (`frozen_at`, `deletion_requested_at`, `deletion_confirmed_at`, `deleted_at`), optional deletion reason, plan details, and stats
- PATCH `/admin/tenants/:tenantId/plan`
  - Body: subset of `{ plan_name, seat_limit, active_seats, subscription_type, payment_mode, next_payment_at, notes }`
  - Updates the tenant’s subscription metadata and records an audit entry
- POST `/admin/tenants/:tenantId/freeze`
  - Body (optional): `{ reason?: string }`
  - Sets tenant status to `frozen`, records timestamp, blocks login for tenant users, and logs audit trail
- POST `/admin/tenants/:tenantId/unfreeze`
  - Restores tenant status to `active`, clears `frozen_at`
- POST `/admin/tenants/:tenantId/delete`
  - Body: `{ confirmSlug: string, reason?: string }`
  - Immediately purges tenant-owned data across companies, users, spend, contracts, RBAC, audit, and accounting master data, frees the slug, and returns `{ tenant, purgeReport }`.
  - Purge coverage (order-aware): `contract_attachments`, `contract_tasks`, `contract_links`, `contract_spend_items`, `contracts`, `tasks`, `spend_amounts`, `spend_allocations`, `spend_versions`, `spend_tasks`, `spend_items`, `analytics_categories`, `capex_amounts`, `capex_allocations`, `capex_versions`, `currency_rate_sets`, `capex_items`, `freeze_states`, `department_metrics`, `company_metrics`, `departments`, `companies`, `user_page_roles`, `role_permissions`, `users`, `roles`, `supplier_contacts`, `contacts`, `suppliers`, `accounts`, `chart_of_accounts`, `allocation_rules`, `audit_log`, `subscriptions`.
  - Slug reuse: the tenant record remains for auditability but its `slug` is cleared for reuse by setting it to a unique marker like `deleted-<old-slug>-<timestamp>`.
  - Use freeze when you want a reversible lock; deletion is irreversible
## Notification Preferences

Requires JWT authentication. All endpoints operate on the current user's preferences within their tenant.

- GET `/users/me/notification-preferences` → current preferences
  - Response: `{ emails_enabled, workspace_settings: { portfolio: { enabled, status_changes, team_additions, team_changes_as_lead, comments }, tasks: { enabled, as_assignee, as_requestor, as_viewer, status_changes, comments }, budget: { enabled, expiration_warnings, status_changes, comments } }, weekly_review_enabled, weekly_review_day, weekly_review_hour, timezone }`
  - Returns defaults on first access (emails enabled, all categories on, weekly review Monday 09:00 in user's timezone)

- PATCH `/users/me/notification-preferences` → update (upsert)
  - Body: partial `NotificationPreferencesData` (any subset of the fields above)
  - Returns the full updated preferences object

- POST `/users/me/notification-preferences/test-weekly-review` → `{ success, message }`
  - Sends a test weekly review email to the current user immediately
  - Useful for verifying email rendering and delivery

## Health

- GET `/health` → `{ status: 'ok' }` — liveness probe
