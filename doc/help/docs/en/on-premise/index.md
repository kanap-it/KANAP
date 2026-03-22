# On-Premise Deployment

KANAP can be deployed on-premise in **single-tenant mode**. You provide your own PostgreSQL, S3-compatible storage, and TLS reverse proxy. KANAP handles everything else: migrations run automatically, the tenant and admin user are created on first boot, and a generous seat limit (1,000) is pre-configured.

## Guides

- **[Installation](installation.md):** Clone, build, configure, and start
- **[Installation Example](installation-example.md):** Step-by-step walkthrough on Ubuntu 24.04 with PostgreSQL, MinIO, and nginx
- **[Configuration](configuration.md):** Environment variables reference
- **[Operations](operations.md):** Upgrades, backups, monitoring, troubleshooting
- **[Microsoft Entra SSO](sso-entra.md):** Optional single sign-on with Microsoft Entra ID

## What's Included

- Full application functionality (budgets, contracts, portfolio, IT operations, reporting)
- Automatic database migrations on startup
- First-boot provisioning (tenant, admin user, subscription)
- Local username/password authentication (no external dependencies)
- Optional email via Resend API (SMTP support planned for a future release)
- Optional Microsoft Entra SSO

## What's Disabled

- **Billing / Stripe:** Disabled automatically (no subscription management needed)
- **Platform admin:** Single-tenant only, no multi-tenant management surfaces
- **Trial / support invoice endpoints:** Not applicable to on-premise

## Quick Notes

- `DEPLOYMENT_MODE=single-tenant` is the single switch that activates on-premise mode.
- `APP_BASE_URL` must match your public URL for email links and exports.
- The backend returns structured `FEATURE_DISABLED` responses for disabled features — the UI hides them automatically.
