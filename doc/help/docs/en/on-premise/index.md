# On-Premise Deployment

KANAP can be deployed on-premise in **single-tenant mode**. This section covers the user-facing setup and operations.

## Guides

- **Installation:** `installation.md`
- **Configuration:** `configuration.md`
- **Operations:** `operations.md`
- **Microsoft Entra SSO:** `sso-entra.md`

## Quick Notes

- You provide infrastructure: PostgreSQL, S3-compatible storage, TLS/reverse proxy.
- The app runs in **single-tenant** mode only (v1).
- `APP_BASE_URL` must match your public URL for email links.
