# On-Premise Configuration

This guide covers required and optional environment variables for on-prem deployments.
A full template is available at `infra/.env.onprem.example`.

## Required: Deployment Mode

| Variable | Description | Example |
|----------|-------------|---------|
| `DEPLOYMENT_MODE` | **Must be `single-tenant`** for on-prem deployments | `single-tenant` |

## Required: Tenant Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_TENANT_SLUG` | No | `default` | URL-safe identifier (lowercase, no spaces) |
| `DEFAULT_TENANT_NAME` | No | `My Organization` | Display name shown in UI |

The tenant is auto-created on first boot if it doesn’t exist.

## Required: Admin Credentials

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Initial admin user email | `admin@company.com` |
| `ADMIN_PASSWORD` | Initial admin password (**change after first login!**) | `ChangeMe123!` |
| `JWT_SECRET` | JWT signing key (generate: `openssl rand -hex 32`) | 64 hex chars |
| `APP_BASE_URL` | Public URL (used in email links) | `https://kanap.company.com` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (**required in production**) | `https://*.company.com` |

**Email links:** Password reset/invite URLs use `APP_BASE_URL` (or forwarded host/proto). On-prem should set `APP_BASE_URL` to the externally reachable URL and configure the reverse proxy to pass `Host` / `X-Forwarded-Proto`.

**CORS:** Configure `CORS_ORIGINS` to control which browser origins can access the API. The application **will fail to start in production** if `CORS_ORIGINS` is not set.

Supported patterns:
- **Exact origin:** `https://app.company.com`
- **Wildcard subdomain:** `https://*.company.com` (matches any subdomain, e.g., `https://tenant1.company.com`)
- **Wildcard port:** `http://localhost:*` (matches any port, useful for local development)

Examples:
```bash
# Single-tenant on-prem
CORS_ORIGINS=https://kanap.company.com

# Multi-tenant with subdomains
CORS_ORIGINS=https://*.company.com

# Multiple patterns
CORS_ORIGINS=https://*.company.com,https://admin.company.com
```

**Startup validation:** The application will refuse to start if `JWT_SECRET`, `DATABASE_URL`, or `APP_BASE_URL` are missing or empty.

## Required: Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/kanap?sslmode=require` |

**Database requirements:**
- PostgreSQL 16 or higher (tested minimum; older versions may work but are unsupported)
- Extensions: `citext`, `pgcrypto`, `uuid-ossp`
- User needs CREATE TABLE / ALTER TABLE permissions for migrations
- Recommended: dedicated database

**Database setup (example):**

```sql
-- 1. Create database and user
CREATE DATABASE kanap;
CREATE USER kanap WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE kanap TO kanap;

-- 2. Connect to kanap database and enable extensions
\c kanap
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Grant schema permissions (for migrations)
GRANT ALL ON SCHEMA public TO kanap;
```

## Required: Storage

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint | `https://s3.amazonaws.com` |
| `S3_BUCKET` | Bucket name (must exist) | `kanap-files` |
| `S3_REGION` | Region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Secret key | `secret` |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO, `false` for AWS/R2 | `false` |

**Bucket requirements:**
- Create the bucket before starting KANAP (not auto-created)
- Permissions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`

KANAP uses the AWS SDK v3 S3 client for object storage access; any provider with S3-compatible API behavior is supported.

**Tested providers:**
- AWS S3 (`S3_ENDPOINT=https://s3.amazonaws.com`, `S3_FORCE_PATH_STYLE=false`)
- MinIO (`S3_ENDPOINT=http://minio:9000`, `S3_FORCE_PATH_STYLE=true`)
- Cloudflare R2 (`https://<account>.r2.cloudflarestorage.com`)
- Backblaze B2 (`https://s3.<region>.backblazeb2.com`)
- Hetzner (`https://<region>.your-objectstorage.com`)

## Recommended : Email via Resend

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key | `re_xxxxx` |
| `RESEND_FROM_EMAIL` | From address | `KANAP <noreply@yourdomain.com>` |

If not configured, email features are disabled, including user invitations, password reset... See Operations for SQL password reset fallback.

## Optional: Email (Phase 2 - SMTP)

In a future release KANAP will include an internal SMTP engine.

| Variable        | Description                          | Example                       |
| --------------- | ------------------------------------ | ----------------------------- |
| `SMTP_HOST`     | SMTP server hostname                 | `smtp.company.com`            |
| `SMTP_PORT`     | SMTP port                            | `587`                         |
| `SMTP_USER`     | SMTP username                        | `kanap`                       |
| `SMTP_PASSWORD` | SMTP password                        | `secret`                      |
| `SMTP_FROM`     | From address                         | `KANAP <noreply@company.com>` |
| `SMTP_SECURE`   | `true` for TLS, `false` for STARTTLS | `true`                        |

## Optional: Entra SSO

See the dedicated guide: `sso-entra.md`.

## Optional: Advanced

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `info` |
| `JWT_ACCESS_TOKEN_TTL` | Access token lifetime | `15m` |
| `JWT_REFRESH_TOKEN_TTL` | Refresh token lifetime | `4h` |
| `RATE_LIMIT_ENABLED` | App-level rate limiting toggle | `true` |
| `RATE_LIMIT_TRUST_PROXY` | Trust proxy headers for client IP detection | `false` |
| `APP_URL` | Base URL for notification email links (tenant slug replaces `app`); also used as fallback origin for comment-email inline image URLs when CID embedding is not possible | `https://app.kanap.net` |
| `EMAIL_OVERRIDE` | Redirect all emails to this address (dev/QA only, **never in production**) | *unset* |

## Full Example (.env)

```bash
# =============================================================================
# KANAP On-Premise Configuration
# =============================================================================

# DEPLOYMENT MODE (required)
DEPLOYMENT_MODE=single-tenant

# TENANT CONFIGURATION (optional - defaults shown)
DEFAULT_TENANT_SLUG=default
DEFAULT_TENANT_NAME=My Organization

# ADMIN CREDENTIALS (required)
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=ChangeThisPassword123!

# SECURITY (required)
JWT_SECRET=

# APPLICATION URL (required)
APP_BASE_URL=https://kanap.your-domain.com

# DATABASE (required)
DATABASE_URL=postgres://kanap:password@your-postgres:5432/kanap?sslmode=require

# STORAGE (required)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=kanap-files
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false   # true for MinIO

# EMAIL (optional - Resend)
# RESEND_API_KEY=re_xxxxx
# RESEND_FROM_EMAIL=KANAP <noreply@yourdomain.com>

# EMAIL (optional - SMTP, Phase 2)
# SMTP_HOST=smtp.company.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASSWORD=
# SMTP_FROM=KANAP <noreply@company.com>
# SMTP_SECURE=true

# ADVANCED (optional - defaults are fine)
# LOG_LEVEL=info
# JWT_ACCESS_TOKEN_TTL=15m
# JWT_REFRESH_TOKEN_TTL=4h
# RATE_LIMIT_ENABLED=true
# RATE_LIMIT_TRUST_PROXY=false
```

## External Connections (Firewall)

| Service | Endpoint | Purpose | Required |
|---------|----------|---------|----------|
| GitHub | github.com | Clone source code | Once (initial setup) |
| npm registry | registry.npmjs.org | Download dependencies | During build |
| Resend API | api.resend.com | Send emails | If using Resend |
| Microsoft Entra | login.microsoftonline.com | SSO metadata/token | If using Entra |
| Microsoft Graph | graph.microsoft.com | Profile enrichment | Optional |
| World Bank API | api.worldbank.org | FX rates (annual) | Optional |
| Exchange Rate API | v6.exchangerate-api.com | FX rates (spot) | Optional |

After initial build, KANAP can run without internet access (except for email/SSO or optional FX rates).

## Background Jobs

The backend runs scheduled background jobs for email notifications:
- **Expiration warnings**: daily at 08:00 UTC — alerts users about contracts and OPEX items expiring within 30 days.
- **Weekly review digest**: hourly check — sends timezone-aware weekly summaries to users who have opted in.

These jobs require the API to run as a **long-running process** (not a serverless function). `APP_URL` must be set for notification email links to resolve correctly.
