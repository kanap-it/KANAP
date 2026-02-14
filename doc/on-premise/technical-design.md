# On-Premise Technical Design

This document describes the technical design for on-premise deployments. User-facing steps are in `doc/help/docs/en/on-premise/`.

## Architecture Decisions (v1)

- **Single repo, feature flags** (no branches)
- **Single-tenant mode only** for on-prem v1
- **Customer-provided infrastructure** (PostgreSQL, S3-compatible storage, TLS/reverse proxy)
- **Build from source** (no registry management)
- **Email:** Resend API or disabled in Phase 1; SMTP support in Phase 2

## Works Out of the Box

- **Database & RLS:** PostgreSQL 16 with Row-Level Security works unchanged
- **Storage:** S3-compatible storage via AWS SDK v3 S3 client (`S3_ENDPOINT`, supports MinIO/R2/B2/AWS)
- **Billing:** Disabled when `STRIPE_SECRET_KEY` is not set (UI hides billing features)
- **Migrations:** Run automatically on container startup (`migrate-and-start.js`)
- **Local Auth:** Username/password works without external dependencies
- **SSO:** Entra ID is optional; local auth is fallback
- **FX Rates:** Gracefully degrades if API keys are not configured
- **Email links:** Use `APP_BASE_URL` or reverse-proxy headers; no extra on-prem settings beyond correct URL/header config

## Deployment Modes

`DEPLOYMENT_MODE` is the differentiator between cloud and on-prem.

| Value | Description | Use Case |
|-------|-------------|----------|
| `multi-tenant` (or unset) | Cloud mode: subdomain-based tenant resolution | SaaS |
| `single-tenant` | On-prem mode: fixed tenant, no subdomain parsing | Customer self-hosted |

**Effects:**
- Tenant resolution (routing)
- First-boot initialization (auto-create tenant/admin)
- Platform-admin access (disabled in single-tenant)
- UI elements (tenant switcher hidden)

## Tenant Resolution

**Cloud (multi-tenant)**
- Extracts subdomain from `Host`
- Recognizes: `*.kanap.net`, `*.dev.kanap.net`, `*.qa.kanap.net`, `*.lvh.me`
- Looks up tenant by slug
- Returns 404 if tenant not found

**On-Prem (single-tenant)**
- Ignores `Host` for **tenant routing**
- Always uses `DEFAULT_TENANT_SLUG`
- Any domain/IP works (no wildcard DNS)

**Important:** `Host` is still used for **URL generation** (password reset/invites). Ensure the reverse proxy forwards `Host` and `X-Forwarded-Proto`, or set `APP_BASE_URL`.

## Platform-Admin Handling

- Platform-admin tenant remains in the DB (same migrations everywhere)
- In single-tenant mode, platform-admin is **never routed to**
- `PLATFORM_ADMIN_HOST` is ignored in single-tenant mode

## First-Boot Initialization

On first startup in single-tenant mode:

1. Migrations run (same as cloud)
2. If `DEFAULT_TENANT_SLUG` does not exist, create tenant via `TenantsService.createTenant()`
3. Seed admin user using `ADMIN_EMAIL`/`ADMIN_PASSWORD`

**Implementation note:** `TenantsService.createTenant()` is safe to call during startup. It runs in its own transaction and sets `app.current_tenant` for role seeding.

## Frontend Configuration

Frontend reads public configuration at startup:

```
GET /api/config/public
→ { "deploymentMode": "single-tenant", "features": { "billing": false, "sso": false } }
```

This endpoint must **not** require tenant context so it works on both SaaS apex hosts and on-prem deployments.

## Behavioral Differences Summary

| Aspect | Cloud (multi-tenant) | On-Prem (single-tenant) |
|--------|----------------------|-------------------------|
| Tenant resolution | Subdomain from `Host` | Fixed `DEFAULT_TENANT_SLUG` |
| Valid domains | `*.kanap.net` only | Any domain |
| DNS requirements | Wildcard DNS | Simple A record |
| Platform-admin | Active | Exists but inaccessible |
| Tenant creation | Platform-admin UI | Auto-created on first boot |
| Multiple tenants | Yes | No (single tenant only) |
| Tenant switcher UI | Visible (if user has access) | Hidden |
| `PLATFORM_ADMIN_HOST` | Required | Ignored |

**Note:** Single-tenant mode does not hard-block multi-tenant admin APIs. Unsupported paths are hidden in the UI and documented as out of scope.

## Feature Flags (Minimal Set)

```typescript
// backend/src/config/features.ts
export const Features = {
  SINGLE_TENANT: process.env.DEPLOYMENT_MODE === 'single-tenant',
  STRIPE_BILLING: !!process.env.STRIPE_SECRET_KEY,
  ENTRA_SSO: !!process.env.ENTRA_CLIENT_ID,
  EMAIL_ENABLED: !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST,  // Phase 2
};
```

Discipline:
- Keep flags minimal
- Prefer strategy/DI patterns over scattered conditionals
- Every PR must work in both modes

## Env Validation (Startup)

Required at startup:
- `JWT_SECRET`
- `DATABASE_URL`
- `APP_BASE_URL`

Fail fast with a clear error if missing.

## Tenant Resolution Code Change (Main)

Single-tenant logic must be **strictly gated** by `DEPLOYMENT_MODE === 'single-tenant'`.
The multi-tenant path must remain unchanged when `DEPLOYMENT_MODE` is unset to avoid SaaS regressions.
