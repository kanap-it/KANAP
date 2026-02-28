# Architecture

Metadata
- Purpose: Describe high-level system architecture and integrations
- Audience: Engineers, architects, product, operations
- Status: current
- Owner: TBD
- Last Updated: 2026-02-27

## Summary
High-level overview of the system, major components, and how data flows between them. The core runtime uses four containers: PostgreSQL 15 (`db`), NestJS on Node 20 (`api`), Vite React+TS (`web`), and a static marketing bundle (`marketing`).

Production topology layers Cloudflare in front of an Nginx front door for routing/TLS and keeps a single Postgres database per environment shared across tenants (see Multitenancy). Platform-administration traffic is isolated on a dedicated host (`platform-admin.kanap.net`) that still terminates inside the same NestJS/Vite stack but bypasses tenant lookup entirely.

## Context
Goals, constraints, assumptions, and relevant background for architectural choices.

## Components
 - <Frontend (web)>: React + TypeScript (Vite), MUI (with icons) + AG Grid (community); routing, protected routes, and pages; TanStack Query for data; shared `ServerDataGrid` and `PageHeader` components; left drawer navigation (Budget Management, IT Operations, Master Data, Admin)
 - <Backend API (api)>: NestJS + TypeORM; auth (password + JWT), validation, audit, import/export, tenant provisioning, outbound email
 - <Data Store (db)>: PostgreSQL 15; normalized schema; audit_log; seeds for currencies and spread_profiles (flat, 4-4-5)
 - <Integrations>: CSV import/export endpoints; future external APIs
 - <Marketing (marketing)>: Static HTML/CSS/JS bundle served from Nginx; homepage, feature pages (budget, it-ops, portfolio), pricing with interactive calculator, legal pages, and workspace creation modal. See `doc/planning/marketing-revamp-plan.md` for full site structure and implementation details.

## Ingress & Routing (prod intent)
- Cloudflare:
  - DNS and TLS termination for `kanap.net`, `qa.kanap.net`, `dev.kanap.net`, and their subdomains.
  - Proxies HTTPS traffic to the origin Nginx instance (QA/prod servers) or to the Cloudflare Tunnel endpoint (local dev).
- Origin Nginx vhosts (QA/Prod):
  - `kanap.net` and `www.kanap.net` -> `marketing`
  - `location /api/` on the same vhost -> `api` (avoids CORS for signup)
  - `*.kanap.net` -> `web` (per-tenant subdomains); `location /api/` -> `api`
  - `platform-admin.kanap.net` -> `web` (platform console shell) and `location /api/` -> `api`

## Environments
- Dev (local):
  - Fully containerized: `db`, `api`, `web`, and `marketing` via Docker Compose.
  - Cloudflare Tunnel terminates HTTPS for `dev.kanap.net` and `*.dev.kanap.net` and forwards to the local dev Nginx proxy on `localhost:80`.
  - Dev Nginx mirrors QA/Prod routing:
    - `dev.kanap.net` → marketing; `/api/` → API.
    - `<slug>.dev.kanap.net` → web; `/api/` → API.
  - `lvh.me` remains available as an HTTP-only fallback for offline testing without Cloudflare.
- QA (server):
  - Root domain: `qa.kanap.net`.
  - DNS and TLS managed by Cloudflare (proxied records for `qa.kanap.net` and `*.qa.kanap.net`).
  - Host-installed Nginx (ports 80/443) and host-installed Postgres.
  - Containers for `api`, `web`, and `marketing` only, bound to loopback; host Nginx proxies to them.
- Prod (server):
  - Root domain: `kanap.net`.
  - DNS and TLS managed by Cloudflare (proxied records for `kanap.net` and `*.kanap.net`).
  - Host-installed Nginx (ports 80/443) and host-installed Postgres.
  - Containers for `api`, `web`, and `marketing` only, bound to loopback; host Nginx proxies to them.

## Data Flow
```mermaid
flowchart LR
  Marketing[Marketing Site] -->|POST /api/public/start-trial| API[API (NestJS)]
  Marketing -->|POST /api/public/activate-trial| API
  Web[Tenant Web App] -->|/api/*| API
  API --> DB[(PostgreSQL 15)]
```

## Integrations
 - External systems, APIs, data sources; document auth method, rate limits, and SLAs
 - CSV import/export as primary integration surface for v1

## Non-Functional Concerns
 - Performance, reliability, scalability, observability, cost efficiency
 - Security: local password auth + JWT plus optional Microsoft Entra SSO per tenant; audit logging for all writes
 - **CORS:** Configurable origin allowlist via `CORS_ORIGINS` env var with wildcard pattern support for multi-tenant SaaS (`https://*.kanap.net`). Production requires explicit configuration — app fails to start without it.
 - **Database Connection Management**: Connection pool sized for production workload (20 max connections supports ~50-100 concurrent users); automatic idle connection cleanup prevents resource exhaustion
 - **Resilience**: Request-level transactions with guaranteed connection cleanup; fail-fast connection timeouts (10s) prevent hung requests

### Files Storage
- All attachments (“files”) are stored in S3-compatible object storage (Hetzner) using a backend `StorageService` backed by AWS SDK v3 (`@aws-sdk/client-s3`).
- Buckets per environment: `cio-dev`, `cio-qa`, `cio-prod`; location `nbg1` with endpoint `https://nbg1.your-objectstorage.com`.
- Object keys are tenant-scoped and recorded in the database `storage_path` fields; the API streams downloads directly from S3.
- Tenant branding logos are stored in the same bucket under `files/<tenant-id>/branding/logo.<ext>` and served through `GET /public/branding/logo` so login/app-shell rendering works without JWT.
- Transport is protected with TLS. Explicit per-request SSE headers are used where supported; when a provider rejects them, uploads fall back to bucket-default encryption behavior.
- Configuration via env: `FILES_STORAGE=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

### Applications Portfolio (IT Operations)
- Backend: `ApplicationsModule` provides CRUD and sub-resources; tables are RLS-protected and tenant-scoped.
- Data model: `applications` (includes `is_suite` flag), `application_owners`, `application_companies`, `application_departments`, `application_links`, `application_attachments`, `application_data_residency`, `application_suites` (parent/child join).
- Derived metric: total users computed from audience with preference for company IT users and department headcount; de‑dups company vs department.
- Purge: `AdminTenantsService` deletes all `application_*` tables and removes S3 objects for `application_attachments` during tenant deletion.

### Infrastructure Connections & Map
- Data model: `connections` (tenant-unique `connection_id`, name, purpose, topology `asset_to_asset|multi_asset`, endpoints asset/entity, lifecycle, notes, **risk fields** `criticality`, `data_class`, `contains_pii`, `risk_mode`), `connection_assets` (multi-asset membership), `connection_protocols` (protocol codes from IT Ops Connection Types).
- Validation: lifecycle and data_class against tenant IT Ops settings; entities against settings.entities; protocols against settings.connectionTypes; risk fields default to `medium/internal/false/manual`. When `risk_mode = 'derived'`, effective risk (`effective_criticality`, `effective_data_class`, `effective_contains_pii`) is computed from linked Interfaces via `interface_connection_links`.
- Subnet management: IT Ops settings include per-location subnet definitions (`settings.subnets`) with CIDR, optional VLAN (1-4094), network zone reference, and description. Assets can select a subnet which auto-populates the network zone. Subnets are unique by CIDR and VLAN within each location.
- Endpoints: `/connections`, `/connections/by-asset/:assetId`, `/connections/:id`, `/connections/map` (environment + lifecycle filters).
- Visualization: Connection Map (`/it/connection-map`) uses `/connections/map` response to render assets/entities nodes and connections as edges with bidirectional meshes for multi-asset topology; controls include environment/lifecycle filters, multi-asset toggle (hides edges and prunes orphan nodes), freeze/auto-center/zoom, and a side panel with deep links to asset/connection workspaces and linked Interfaces. Side panel now surfaces connection purpose, protocols, typical ports, topology, and linked interface details (name/code, leg, environment, pattern, endpoints); lifecycle/data/PII badges were removed to declutter.
- Interface linkage: `interface_connection_links` joins `interface_bindings` to `connections` (unique per binding/connection, cascade delete). APIs:
  - Binding-centric: `GET/POST/DELETE /interface-bindings/:bindingId/connection-links`
  - Connection-centric: `GET /connections/:id/interface-links`
  - Interface-centric (map/navigation summary): `GET /interfaces/:id/connection-links`
  Surfaced in Interface Environments (connections column + manage dialog), Interface Map side panel (linked infra connections with deep links to Connection Map), Connection workspace (Related Interfaces tab), and Connection Map side panel (linked Interfaces with deep links to Interface Map). Cross-map links now pass `rootIds` (preselected nodes) and `depth=1` to keep default views scoped.

## Multitenancy
- Storage model: Single Postgres database per environment (not per-tenant DB). Tenants share tables keyed by `tenant_id`.
- Isolation: Enforce Row-Level Security (RLS) on all multi-tenant tables; the API sets a request-scoped session variable (via `set_config('app.current_tenant', '<uuid>', true)`) used by RLS policies.
- Indexing: Lead with `tenant_id` in composite keys and uniques (e.g., `PRIMARY KEY (tenant_id, id)`, `UNIQUE (tenant_id, slug)`).
- Tenancy resolution: API reads `Host` header; apex hosts (`kanap.net`, `www.`) are treated as no-tenant (public marketing/API endpoints). Tenant hosts `<slug>.kanap.net` resolve to a `Tenant` by slug.
- Sessions: Cookies are scoped per subdomain; no cross-subdomain cookies.
- Scalability: Horizontally scale `web`/`api`; add PgBouncer; consider partitioning large tables by `tenant_id` if needed.
- Provisioning flow: marketing POSTs to `/api/public/start-trial` (body includes `org`, `slug`, `email`, required `country_iso`, and `captchaToken`). The API verifies Turnstile (mode: `off|monitor|enforce`), records the request in `trial_signups`, emails an activation link, and `/api/public/activate-trial` provisions the tenant + admin account once the link is confirmed. The activation endpoint immediately issues a password-reset token so the admin can set credentials inside the tenant web app.
- Tenant slug reservation policy is centralized in `backend/src/tenants/tenant-slug-policy.ts` and enforced in both `POST /public/start-trial` and `TenantsService.createTenant`/`TenantsService.updateTenant` to prevent bypass through alternate creation paths. Unavailable slugs return `400` with code `SUBDOMAIN_NOT_AVAILABLE`.
- Default CoA provisioning: during `/public/activate-trial`, after the API sets `app.current_tenant`, it checks the platform CoA templates for a single global template marked `loaded_by_default` and, when present, creates a `GLOBAL`‑scoped CoA in the new tenant using that template (accounts are copied) and marks it as the tenant’s Global Default CoA. The initial company is created using the submitted `country_iso`; it auto‑assigns to that country's default CoA when available, otherwise falls back to the tenant’s Global Default CoA.
- Tenant branding is stored on `tenants.branding` (`jsonb`) with logo storage path/version, light/dark primary colors, and a dark-mode logo toggle. This column lives on the tenant record (no per-table `tenant_id`) and is guarded by host + permission checks in application code.
- Activity comment notifications: rich-text comment bodies are sanitized before email rendering. Inline images are embedded as CID attachments when possible, with absolute URL fallback for clients or payload limits that prevent embedding.

### Notifications Module
- **NotificationsModule** provides event-driven and scheduled email notifications with per-user preference control.
- **Event-driven triggers**: status changes (portfolio items), team additions, team changes (as lead), comments (portfolio/tasks), task assignments, expiration warnings (contracts/OPEX). Recipients are computed per event based on role (assignee, requestor, viewer, lead, team member).
- **Task unified-activity notifications**: task status+comment submissions are evaluated per recipient preferences. Recipients who enabled both status and comments get a merged email; status-only/comment-only preferences receive the corresponding single-purpose email.
- **Task status email action buttons**: task status notifications can include deep-link quick actions (`?action=set_status&status=...`) for common transitions (for example `pending` → `in_progress`/`done`, `in_testing` → `done`/`in_progress`).
- **Deduplication**: 5-minute in-memory window prevents duplicate emails for the same event/recipient.
- **Preferences**: `user_notification_preferences` table (RLS-protected) stores per-user, per-tenant settings. Three workspace groups (portfolio, tasks, budget) each with a master toggle and per-category switches. Global `emails_enabled` master toggle. Weekly review schedule (day, hour, timezone).
- **Scheduled jobs** (via `@nestjs/schedule` `ScheduleModule`):
  - **Expiration warnings**: daily at 08:00 UTC — checks contracts and OPEX items expiring within 30 days, sends warnings to users with `budget.expiration_warnings` enabled.
  - **Weekly review digest**: hourly — timezone-aware dispatch that matches users whose configured day/hour matches the current hour in their timezone. Summarizes assigned tasks, upcoming due dates, and recent portfolio activity. *(Note: the scheduled weekly review has not been validated in production yet.)*
- **Email templates**: shared `emailWrapper()` provides consistent HTML structure with header, footer, and a "Manage notification preferences" deep link (`/settings/notifications`). Per-event templates generate the body content.
- **Email queue**: in-process queue in `EmailService` with 700ms inter-message delay to stay within Resend rate limits.
- **`APP_URL`** env var is used to build tenant-specific deep links in scheduled notification emails (replaces `app` in hostname with the tenant slug).
- **`EMAIL_OVERRIDE`** env var redirects all outgoing emails to a single address (dev/QA safety net; must never be set in production).
- **ThrottlerModule** (`@nestjs/throttler`) provides app-level rate limiting on auth and public endpoints, configurable via `RATE_LIMIT_ENABLED` and `RATE_LIMIT_TRUST_PROXY`.

- Tenant creation notification: upon successful activation, the API sends a non‑blocking notification email to `admin@kanap.net` including the tenant name, slug, registered admin email, and `country_iso`. Delivery failures do not impact the activation response.

### Platform Administration Channel
- `PLATFORM_ADMIN_HOST` identifies requests to the platform admin console. Unlike regular tenant hosts, the slug is not extracted from the subdomain—instead, the middleware explicitly looks up the `platform-admin` **system tenant** and attaches it to the request context.
- This means platform admin operates with a **real tenant context** (the `platform-admin` tenant) rather than a null context. RLS policies apply normally, allowing admin users to authenticate and access platform routes without bypassing tenant isolation.
- The request also sets `req.isPlatformHost = true` so guards can distinguish platform admin routes from regular tenant routes.
- `/public/tenant-info` returns `{ platform: true }`, tenant metadata + branding payload (`slug`, `name`, `logoPath`, `logoVersion`, `useLogoInDark`, `primaryColorLight`, `primaryColorDark`), or `{ marketing: true }`, letting the SPA swap shells and apply tenant branding without a separate bundle.
- Branding administration endpoints (`/admin/branding/*`) are tenant-only (`users:admin`) and explicitly reject platform-host requests.
- The platform module owns endpoints for tenant stats, freeze/unfreeze, plan management, synchronous deletion, and ops monitoring (`GET /admin/ops/snapshot` — API traffic, DB health, process metrics). Future features (Stripe billing sync, backups) can extend the same module and rely on the host guard.

**System Tenant Protections:**
- The `platform-admin` tenant is marked with `is_system_tenant = true` and cannot be deleted, frozen, or modified.
- System tenants are hidden from the admin tenant list by default.
- Reserved tenant slugs (from `tenant-slug-policy.ts`) cannot be used for tenant creation: `www`, `api`, `admin`, `billing`, `account`, `platform-admin`, `app`, `nextcloud`, `migration`, `example`.

### Request DB Context
- A global Guard (`TenantInitGuard`) initializes a per-request transaction and sets the tenant context before any other Guards (important for permission checks under RLS).
- A global Interceptor (`TenantInterceptor`) reuses the same transaction for controller handling, committing it at the end of the request.
- Controllers pass the request `EntityManager` (from the QueryRunner) into services so all queries run within the tenant-scoped session.
- **Connection Pool Management**: TypeORM connection pool configured with max=20, min=2, 30s idle timeout, 10s connection timeout (configurable via environment variables).
- **Error Handling**: Both Guard and Interceptor ensure QueryRunner connections are released even on errors to prevent connection leaks.

### Current Coverage (RLS + tenant_id)
- Users, Companies, Departments, Suppliers, Accounts, Chart of Accounts.
- Spend: spend_items, spend_versions, spend_amounts, spend_allocations.
- Contracts: contracts, contract_spend_items, contract_attachments, contract_links.
- Tasks: tasks (unified across OPEX and Contracts; easily extensible to other object types via `related_object_type` + `related_object_id`).
- CAPEX: capex_items, capex_versions, capex_amounts, capex_allocations.
- RBAC & Billing: roles, role_permissions, user_roles, subscriptions. Role permissions use `tenant_id` to scope under RLS; migration `1778000000000` ensures `role_permissions.tenant_id` matches the parent role's tenant.
- Audit: audit_log (writes use the request-scoped EntityManager).
- Metrics: company_metrics, department_metrics, analytics_categories.
- Currency & Freeze: currency_rate_sets (per-tenant snapshots), freeze_states.
- Global/system tables remain shared (e.g., static currency codes, spread_profiles). `allocation_rules` support both global defaults (rows with `tenant_id IS NULL`) and per-tenant overrides (rows with `tenant_id` set). Per-tenant rows are removed during tenant purge; global defaults remain.

Notes
- Permission checks (PermissionGuard) and RBAC services execute using the request-scoped EntityManager so RLS applies to permission reads as well.
- **Multi-role support**: PermissionGuard queries the `user_roles` junction table and computes union permissions across all assigned roles using `PermissionsService.listForRoles()`. This matches the `/auth/me` endpoint behavior and supports users with multiple role assignments.
- AuditService writes via the request-scoped EntityManager, ensuring audit rows carry the tenant_id and pass RLS policies.

### Frontend Permission Gating
- `ProtectedRoute.tsx` enforces route-level access control by extracting path segments and mapping them to permission resources.
- Alias mappings bridge URL paths to backend permission resources:
  - Admin aliases: `roles` → `users`
  - Ops aliases: `reports` → `reporting`, `assets` → `applications`
- The `hasLevel(resource, level)` function in `AuthContext` supports both `'member'` (current) and `'manager'` (legacy) permission levels for backwards compatibility. The hierarchy is: `reader(1) < contributor(2) < member/manager(3) < admin(4)`. The `contributor` level allows editing existing items without creating new top-level items (currently used for `portfolio_projects`).
- Menu visibility in `Layout.tsx` checks permissions using resource identifiers that must align with backend `@RequireLevel` decorators.
- **Workspace tab visibility**: The top-bar workspace tabs (Portfolio, IT Operations, Budget Management, Master Data, Admin) are conditionally rendered based on whether the user has `reader` or higher permission on ANY resource within that workspace. This prevents users from seeing tabs that lead to "Access Denied" pages.

## Decisions
- Key architectural decisions with brief rationale; cross-link to ADRs
- Forward-compat: nullable FKs for projects/contracts; spend_amounts as reporting source; allocations for chargeback

- Multitenancy storage decision: Use a single Postgres database per environment with RLS-based tenant isolation; avoid per-tenant databases. See `doc/adr/0002-multitenancy-storage.md`.

## Backend Patterns & Abstractions

The backend uses several shared patterns to ensure consistency and reduce duplication:
- **BaseDeleteService** - Consolidated delete logic with cascade, storage cleanup, and audit logging
- **TenancyManager** - Request-scoped tenant context and transaction management
- **Service Decomposition** - Large services split using facade pattern
- **Type Safety** - Zod DTOs, typed decorators, response types

**See:** [features/backend-patterns.md](features/backend-patterns.md) for comprehensive documentation and usage examples.

## Implementation Notes
- Migrations: Run automatically on API container start via compose command; dev resets use `docker compose down -v`.
- TypeORM: Single default `DataSource` export is required for CLI; migrations are timestamped classes (e.g., `Init1756684800000`).
- Spend module: routes under `/spend-items` and `/spend-versions/:id/...`; amounts/allocations bulk endpoints use `/bulk-upsert` suffix. Current maintenance layout (summary builder, CSV service, budget operations façade) is documented in `spend-module-maintenance.md`.
- Data constraints: `spend_amounts` has unique `(version_id, period)`; allocation validator enforces total 100% (+/-0.01).
- Frontend patterns: use `ServerDataGrid` for list views (AG Grid infinite scroll with server sorting and column floating filters; only `sort` is URL-synced); `PageHeader` for titles, breadcrumbs, and actions; pages fetch via TanStack Query.
- Node module interop: Use namespace imports for CommonJS libs (e.g., `import * as jsonwebtoken`, `import * as argon2`).

### RLS Starter Pattern (for reference)
- Use a custom GUC to carry tenant id and a policy that binds to it.
```
-- API role (no BYPASS RLS)
-- CREATE ROLE app NOINHERIT LOGIN;
-- GRANT CONNECT ON DATABASE appdb TO app;

-- Example table
-- CREATE TABLE projects (
--   tenant_id uuid NOT NULL,
--   id uuid PRIMARY KEY,
--   name text NOT NULL,
--   slug text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE UNIQUE INDEX projects_slug_tenant ON projects (tenant_id, slug);

-- RLS
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects FORCE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON projects
--   USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Optional trigger to auto-fill tenant_id from session on insert
-- CREATE FUNCTION set_tenant_id() RETURNS trigger AS $$
-- BEGIN
--   IF NEW.tenant_id IS NULL THEN
--     NEW.tenant_id := current_setting('app.current_tenant', true)::uuid;
--   END IF;
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
-- CREATE TRIGGER projects_set_tenant_id
--   BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
```

See also: `doc/frontend-architecture.md` for detailed UI guidelines.

### Authentication & SSO
- Local email/password + JWT remains the baseline login path for every user. Tokens come from `AuthService.signToken` and feed `/auth/me`, guards, and the SPA’s Axios interceptor.
- Tenant-level Microsoft Entra SSO augments the existing model. Each tenant can connect exactly one Entra directory via **Admin → Authentication**. The connection stores `sso_provider`, `entra_tenant_id`, and optional `entra_metadata` on the `tenants` row so all Entra logins enforce a strict 1:1 mapping.
- `EntraAuthService` downloads the Microsoft discovery document and JWKS, builds authorization URLs, exchanges codes for tokens, and validates `id_token` claims (audience, `nonce`, `tid`, `oid`). Issuer is validated explicitly against `https://login.microsoftonline.com/<tid>/v2.0` to support multi-tenant authorities such as `https://login.microsoftonline.com/organizations`. This avoids runtime issues with mismatched `openid-client` builds and keeps the dependency surface minimal. Required env vars:
  - `ENTRA_CLIENT_ID`
  - `ENTRA_CLIENT_SECRET`
  - `ENTRA_AUTHORITY` (e.g., `https://login.microsoftonline.com/organizations`)
  - `ENTRA_REDIRECT_URI` (public HTTPS URL pointing to `/auth/entra/callback`)
- Setup flow: `POST /auth/entra/setup/start` (tenant admin, JWT required) returns `{ url }` and sets a signed nonce cookie. The authorization URL is constructed with `prompt=consent` so that the admin always sees the consent screen; Entra tenant policies (for example, "admin consent required") determine whether normal users can complete it. Completing Microsoft consent calls back into the shared callback (`/auth/entra/callback?mode=setup` via the `ENTRA_REDIRECT_URI` marketing host), which persists the Entra tenant id for the target KANAP tenant and then redirects the browser to the tenant host's `/admin/auth?setup=success` using the tenant slug (for example, `https://lohr.dev.kanap.net/admin/auth?setup=success` in dev).
- Login flow: `/login` now offers a “Sign in with Microsoft” CTA that hits `GET /auth/entra/login?redirectTo=...` on the tenant host. The backend validates SSO config and 302s to Microsoft with signed `state` + `nonce`. `/auth/entra/callback?mode=login` is invoked on the shared marketing host, validates the token (including `tid` vs `tenant.entra_tenant_id`), links or provisions a `Contact` user (matching by external subject first, then email), issues standard app tokens, and redirects the browser back to the tenant host’s `/login/callback#token=...&refreshToken=...&expiresIn=...&refreshExpiresIn=...&redirectTo=...`. The SPA reads the fragment payload, calls `AuthContext.login()`, then clears URL parameters/fragments via `history.replaceState`.
- **HTTPS requirement**: Browsers only accept Microsoft’s `SameSite=None` cookies on HTTPS origins. During development the SPA must be accessed through the same HTTPS tunnel (ngrok/Cloudflare Tunnel/etc.) referenced by `ENTRA_REDIRECT_URI` and `VITE_API_URL`; plain `http://*.lvh.me` will be blocked by Chrome/Safari.

## Open Questions
- Items requiring clarification or follow-up

## References
- Links to ADRs, tickets, designs
