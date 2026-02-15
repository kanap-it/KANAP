# On-Premise Technical Design

This document describes the technical design for on-premise deployments. User-facing steps are in `doc/help/docs/en/on-premise/`.

**Status:** Implemented (Phase 1 MVP, 2026-02-15)

## Architecture Decisions (v1)

- **Single repo, feature flags** (no branches)
- **Single-tenant mode only** for on-prem v1
- **Customer-provided infrastructure** (PostgreSQL, S3-compatible storage, TLS/reverse proxy)
- **Build from source** (no registry management)
- **Email:** Resend API or disabled in Phase 1; SMTP support in Phase 2

## Works Out of the Box

- **Database & RLS:** PostgreSQL 16 with Row-Level Security works unchanged
- **Storage:** S3-compatible storage via AWS SDK v3 S3 client (`S3_ENDPOINT`, supports MinIO/R2/B2/AWS)
- **Billing:** Disabled when `STRIPE_SECRET_KEY` is not set (backend returns `FEATURE_DISABLED`, UI hides billing features)
- **Migrations:** Run automatically on container startup (`migrate-and-start.js`)
- **Local Auth:** Username/password works without external dependencies
- **SSO:** Entra ID is optional; local auth is fallback
- **FX Rates:** Gracefully degrades if API keys are not configured
- **Email links:** Use `APP_BASE_URL` directly in single-tenant mode (no subdomain derivation)

## Deployment Modes

`DEPLOYMENT_MODE` is the differentiator between cloud and on-prem.

| Value | Description | Use Case |
|-------|-------------|----------|
| `multi-tenant` (or unset) | Cloud mode: subdomain-based tenant resolution | SaaS |
| `single-tenant` | On-prem mode: fixed tenant, no subdomain parsing | Customer self-hosted |

**Effects:**
- Tenant resolution (routing)
- First-boot initialization (auto-create tenant/admin/subscription)
- Platform-admin access (fully disabled in single-tenant)
- SaaS-only endpoints (return 404 in single-tenant)
- UI elements (billing, platform admin, SSO hidden when features disabled)

## Feature Flags

Single source of truth: `backend/src/config/features.ts`

```typescript
const deploymentMode = (process.env.DEPLOYMENT_MODE || '').trim().toLowerCase();
const isSingleTenant = deploymentMode === 'single-tenant';

export const Features = {
  DEPLOYMENT_MODE: isSingleTenant ? ('single-tenant' as const) : ('multi-tenant' as const),
  SINGLE_TENANT: isSingleTenant,
  STRIPE_BILLING: !isSingleTenant && !!process.env.STRIPE_SECRET_KEY,
  ENTRA_SSO: !!process.env.ENTRA_CLIENT_ID,
  EMAIL_ENABLED: !!process.env.RESEND_API_KEY,
};
```

Discipline:
- Keep flags minimal and centralized in this file
- Every PR must work in both modes (CI matrix enforces this)

## Error Contract

Disabled features return structured HTTP responses via `backend/src/common/feature-gates.ts`:

- **`throwNotAvailableInMode()`** — `404 Not Found` for SaaS-only endpoints (trial, support invoice)
- **`throwFeatureDisabled(feature)`** — `403 Forbidden` with body `{ code: "FEATURE_DISABLED", feature, message }`
- **`FeatureDisabledError`** — custom Error class with stable `.code` property for internal service use (e.g., `email.service.ts`)
- **`MultiTenantOnlyGuard`** — NestJS guard returning `404` for platform-admin controllers

Frontend recognizes `FEATURE_DISABLED` in the API client and does not redirect on these errors.

## Tenant Resolution

**Cloud (multi-tenant)** — `backend/src/main.ts` inline tenancy middleware:
- Extracts subdomain from `Host`
- Recognizes: `*.kanap.net`, `*.dev.kanap.net`, `*.qa.kanap.net`, `*.lvh.me`
- Looks up tenant by slug
- Returns 404 if tenant not found

**On-Prem (single-tenant)** — early return at top of same middleware:
- Ignores `Host` for tenant routing
- Always resolves to `DEFAULT_TENANT_SLUG`
- Any domain/IP works (no wildcard DNS)
- If tenant not yet provisioned (first-boot race), returns `503 TENANT_NOT_READY`

**Important:** `Host` is still used for URL generation (password reset/invites). Ensure the reverse proxy forwards `Host` and `X-Forwarded-Proto`, or set `APP_BASE_URL`.

## Platform-Admin Handling

- `isPlatformAdmin()` returns `false` unconditionally in single-tenant mode (top of function, before any allowlist/role check)
- `PLATFORM_ADMIN_HOST` is effectively ignored since tenant resolution skips host parsing
- Platform admin controllers (`/admin/tenants`, `/admin/coa-templates`) are guarded by `MultiTenantOnlyGuard` — return 404 in single-tenant
- Platform-admin tenant row remains in the DB (same migrations everywhere) but is never routed to

## First-Boot Initialization

On first startup in single-tenant mode (`backend/src/main.ts`, before tenancy middleware):

1. Migrations run (same as cloud)
2. If `DEFAULT_TENANT_SLUG` does not exist, create tenant via `TenantsService.createTenant()` (idempotent)
3. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, seed admin user with Administrator role and full permissions
4. Bootstrap subscription row: `plan_name = 'On-Prem'`, `seat_limit = 1000`, `status = 'active'`

**Safety net:** `billing.service.ts` `ensureSubscription()` also defaults to On-Prem/1000 seats instead of Starter/5 when `Features.SINGLE_TENANT` is true.

Existing `SEED_ADMIN=true` path remains available for cloud/QA bootstrapping and is independent.

## SaaS-Only Endpoints (Disabled in Single-Tenant)

These return 404:
- `POST /public/start-trial`
- `POST /public/activate-trial`
- `POST /public/request-support-invoice`
- All `/admin/tenants/*` endpoints
- All `/admin/coa-templates/*` endpoints

## Feature-Gated Endpoints

These return `403 FEATURE_DISABLED` when the relevant feature is off:

| Feature | Endpoints |
|---------|-----------|
| `billing` (Stripe off) | All `/billing/*` endpoints |
| `email` (Resend off) | `POST /auth/password-reset/request`, `POST /users/:id/invite`, `POST /users/me/notification-preferences/test-weekly-review` |

## URL Resolution (Notifications & Exports)

`resolveNotificationBaseUrl()` in `backend/src/common/url.ts`:
- **Single-tenant:** Uses `APP_BASE_URL` directly (no subdomain logic)
- **Multi-tenant:** Uses `APP_URL` with slug substitution (`//app.` → `//{slug}.`)

Used by: `scheduled-notifications.service.ts`, `notifications.service.ts`, `portfolio-status-change-report.controller.ts`

## Frontend Configuration

Frontend reads public configuration at startup via `FeaturesContext.tsx`:

```
GET /api/config/public
→ {
    "deploymentMode": "single-tenant",
    "features": { "billing": false, "sso": false, "email": true },
    "version": "0.1.0"
  }
```

- **Fail-open:** On fetch error or 5s timeout, defaults to cloud mode (all features enabled)
- **No auth required:** Works before login, no tenant context needed
- **Route gating:** Disabled feature routes are removed from the router (not just hidden)
- **Nav filtering:** Layout hides billing/auth/platform-admin nav items based on features

## Behavioral Differences Summary

| Aspect | Cloud (multi-tenant) | On-Prem (single-tenant) |
|--------|----------------------|-------------------------|
| Tenant resolution | Subdomain from `Host` | Fixed `DEFAULT_TENANT_SLUG` |
| Valid domains | `*.kanap.net` only | Any domain |
| DNS requirements | Wildcard DNS | Simple A record |
| Platform-admin | Active (allowlist or role) | Fully disabled (`isPlatformAdmin()` → false) |
| Platform admin endpoints | Accessible | Return 404 (MultiTenantOnlyGuard) |
| Tenant creation | Platform-admin UI or trial | Auto-created on first boot |
| Multiple tenants | Yes | No (single tenant only) |
| Platform-admin nav | Visible (if user has access) | Hidden |
| Trial / support endpoints | Active | Return 404 |
| Billing | Stripe-based | Disabled (`FEATURE_DISABLED`) |
| Subscription defaults | Starter / 5 seats | On-Prem / 1000 seats |
| Notification URLs | `APP_URL` + slug substitution | `APP_BASE_URL` directly |

## CI Matrix

`.github/workflows/ci.yml` runs `npm ci && npm run build` for both backend and frontend in two modes:

| Matrix entry | `DEPLOYMENT_MODE` |
|-------------|-------------------|
| `cloud` | *(unset)* |
| `onprem` | `single-tenant` |

Both modes must build clean. This catches import/type errors from feature flag usage.

## Env Validation (Startup)

Required at startup (enforced by `validateStartupEnv()`):
- `JWT_SECRET`
- `DATABASE_URL`
- `APP_BASE_URL` (in production mode)

Fail fast with a clear error if missing.

---

## Feature Gate Inventory

**This is the definitive reference for every location in the codebase where behavior differs between cloud and on-prem.** Update this section whenever you add, move, or remove a feature gate.

### Key Files

| File | Role |
|------|------|
| `backend/src/config/features.ts` | Feature flag definitions (single source of truth) |
| `backend/src/common/feature-gates.ts` | Gate utilities: `throwNotAvailableInMode()`, `throwFeatureDisabled()`, `FeatureDisabledError`, `MultiTenantOnlyGuard` |
| `backend/src/config/config.controller.ts` | `GET /config/public` — exposes flags to frontend |
| `frontend/src/config/FeaturesContext.tsx` | React context: fetches `/api/config/public`, provides `useFeatures()` hook |

### Backend Gates

#### Deployment mode (`Features.SINGLE_TENANT`)

| File | Line | What | Behavior |
|------|------|------|----------|
| `main.ts` | 195 | First-boot provisioning | Creates tenant, admin user, subscription (On-Prem / 1000 seats) |
| `main.ts` | 324 | Tenancy middleware | Skips Host parsing, resolves to `DEFAULT_TENANT_SLUG`; returns 503 if tenant not ready |
| `platform-admin.util.ts` | 18 | `isPlatformAdmin()` | Returns `false` unconditionally |
| `public.controller.ts` | 157 | `POST /public/start-trial` | 404 |
| `public.controller.ts` | 277 | `POST /public/request-support-invoice` | 404 |
| `public.controller.ts` | 373 | `POST /public/activate-trial` | 404 |
| `admin-tenants.controller.ts` | 10 | All `/admin/tenants/*` | 404 via `MultiTenantOnlyGuard` |
| `admin-coa-templates.controller.ts` | 11 | All `/admin/coa-templates/*` | 404 via `MultiTenantOnlyGuard` |
| `billing.service.ts` | 1281 | `ensureSubscription()` fallback | Defaults to On-Prem / 1000 seats instead of Starter / 5 |
| `url.ts` | 163 | `resolveNotificationBaseUrl()` | Uses `APP_BASE_URL` directly (no subdomain substitution) |
| `portfolio-status-change-report.controller.ts` | 134 | Export base URL | Delegates to `resolveNotificationBaseUrl()` |
| `feature-gates.ts` | 34 | `MultiTenantOnlyGuard` | Throws 404 when `SINGLE_TENANT` is true |

#### Billing (`Features.STRIPE_BILLING`)

| File | Line | What | Behavior |
|------|------|------|----------|
| `billing.controller.ts` | 142 | `GET /billing/plans` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 148 | `GET /billing/subscription` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 156 | `POST /billing/change-plan` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 169 | `POST /billing/request-invoice` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 182 | `GET /billing/profile` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 197 | `POST /billing/portal` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 211 | `POST /billing/checkout` | 403 `FEATURE_DISABLED` |
| `billing.controller.ts` | 236 | `PATCH /billing/profile` | 403 `FEATURE_DISABLED` |

#### Email (`Features.EMAIL_ENABLED`)

| File | Line | What | Behavior |
|------|------|------|----------|
| `auth.controller.ts` | 206 | `POST /auth/password-reset/request` | 403 `FEATURE_DISABLED` |
| `users.controller.ts` | 106 | `POST /users/:id/invite` | 403 `FEATURE_DISABLED` |
| `notification-preferences.controller.ts` | 46 | `POST /users/me/notification-preferences/test-weekly-review` | 403 `FEATURE_DISABLED` |
| `email.service.ts` | 183 | `ensureClient()` internal | Throws `FeatureDisabledError('email')` — caught by callers via `error.code` |
| `public.controller.ts` | 221, 356, 467 | Trial/activation catch blocks | Checks `error.code === 'FEATURE_DISABLED'` — suppresses, returns graceful fallback |

#### URL resolution

| File | Line | What | Behavior |
|------|------|------|----------|
| `url.ts` | 163 | `resolveNotificationBaseUrl()` | Single-tenant: `APP_BASE_URL` directly. Multi-tenant: `APP_URL` with slug substitution |
| `scheduled-notifications.service.ts` | 52, 57 | Weekly review + expiration emails | Calls `resolveNotificationBaseUrl(slug)` |
| `notifications.service.ts` | 122 | Event-driven notifications | Calls `resolveNotificationBaseUrl(tenantSlug)` |
| `portfolio-status-change-report.controller.ts` | 134 | PDF export base URL | Calls `resolveNotificationBaseUrl(null)` in single-tenant |

### Frontend Gates

All gates read from `useFeatures()` hook (provided by `FeaturesContext.tsx`).

#### Route gating (`App.tsx`)

| Line | Condition | Routes affected |
|------|-----------|----------------|
| 109 | `config.features.email` | `/forgot-password` — redirects to `/login` if email off |
| 181–182 | `config.features.billing` | `/admin/billing`, `/admin/choose-plan` — not rendered |
| 183 | `config.features.sso` | `/admin/auth` — not rendered |
| 184–189 | `!isSingleTenant` | `/admin/tenants`, `/admin/coa-templates`, `/admin/standard-accounts/*` — not rendered |

#### Navigation gating (`Layout.tsx`)

| Line | Condition | Effect |
|------|-----------|--------|
| 453 | `isSingleTenant` | Platform admin nav hidden entirely |
| 454 | `!config.features.billing` | Billing nav item filtered out |
| 455 | `!config.features.sso` | Auth/SSO nav item filtered out |
| 495 | `config.features.billing` | `SubscriptionBanner` hidden |

#### Component gating

| File | Line | Condition | Effect |
|------|------|-----------|--------|
| `LoginPage.tsx` | 95 | `config.features.sso` | "Sign in with Microsoft" button hidden |
| `LoginPage.tsx` | 164 | `config.features.email` | "Forgot password" link hidden |
| `ForgotPasswordPage.tsx` | 11 | `!config.features.email` | Shows "contact your administrator" message instead of form |
| `SubscriptionBanner.tsx` | 14 | `!config.features.billing` | Returns null (hidden) |
| `ProtectedRoute.tsx` | 116 | `config.features.billing` | Skips billing/subscription redirect when billing off |

#### API client (`client.ts`)

| Line | What | Effect |
|------|------|--------|
| 107 | `FEATURE_DISABLED` in error code check | Does not redirect to login — lets caller handle gracefully |

### CI

| File | What |
|------|------|
| `.github/workflows/ci.yml:16` | Matrix: `DEPLOYMENT_MODE` set to `single-tenant` for `onprem` mode, unset for `cloud` mode. Both must build cleanly. |

### Infra

| File | What |
|------|------|
| `infra/compose.onprem.yml` | On-prem Docker Compose (api + web only, no DB/storage) |
| `infra/.env.onprem.example` | Complete env template with `DEPLOYMENT_MODE=single-tenant` |

### Adding a New Feature Gate

When adding a new gate, follow this checklist:

1. **Add the flag** to `backend/src/config/features.ts` if it's a new feature area
2. **Gate the backend** at controller level using `throwFeatureDisabled()` or `MultiTenantOnlyGuard`
3. **Expose to frontend** via `config.controller.ts` → `GET /config/public` response
4. **Update `FeaturesContext.tsx`** type definition if adding a new feature key
5. **Gate the frontend** — both routes (`App.tsx`) and navigation (`Layout.tsx`)
6. **Update this inventory** — add rows to the tables above
7. **Test both modes** — CI matrix catches build errors, but manually verify runtime behavior
