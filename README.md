# KANAP

[![Website](https://img.shields.io/badge/website-kanap.net-blue)](https://kanap.net)
[![Documentation](https://img.shields.io/badge/docs-doc.kanap.net-green)](https://doc.kanap.net)
[![License](https://img.shields.io/badge/license-O'Saasy-orange)](LICENSE)

**The integrated IT management platform for budget planning, enterprise architecture, and portfolio management.**

Built by an IT director who got tired of duct-taping spreadsheets, wikis, and project tools together.

[Website](https://kanap.net) | [Documentation](https://doc.kanap.net) | [Source docs](doc/)

---

## Why KANAP?

IT departments juggle budgets across spreadsheets, track applications in wikis, and manage projects in yet another tool. Nothing connects. When the CFO asks "what are we spending on that system?", the answer takes days to assemble.

KANAP replaces that patchwork with a single platform where costs link to applications, applications link to projects, and projects link back to budgets. One source of truth, zero complexity theater.

<!-- TODO: Add a screenshot of the dashboard here -->
<!-- ![KANAP Dashboard](docs/assets/screenshot.png) -->

## What it does

**Budget Management** &mdash; Multi-year OPEX and CAPEX planning with six allocation methods, multi-currency support, CSV import/export, and executive reporting including chargeback and analytics dashboards.

**IT Operations** &mdash; Document and visualize your information system: application portfolio, infrastructure assets, network interfaces and connections with interactive architecture maps, location and subnet management, and business process catalog.

**Contract Management** &mdash; Track contracts with links to OPEX/CAPEX items, attachments, deadlines, and automated expiration warnings.

**Portfolio Management** &mdash; Manage the project lifecycle from initial request through delivery with roadmap scheduling and capacity analysis.

**Unified Tasks** &mdash; One task system spanning budget items, contracts, CAPEX items, and projects with status tracking, assignments, and email notifications.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript, TypeORM |
| Frontend | React, TypeScript, Vite, MUI, AG Grid, TanStack Query |
| Database | PostgreSQL 16 with Row-Level Security |
| Infrastructure | Docker, Nginx, S3-compatible storage |

Multi-tenant by design &mdash; single database with RLS isolation, subdomain routing, and RBAC.

## Quick start (development)

**Prerequisites:** Docker and Docker Compose.

```bash
# Clone and start the dev environment
git clone https://github.com/kanap-it/kanap.git
cd kanap/infra
docker compose up -d
```

Four services come up (including a local PostgreSQL for development):

| Service | URL |
|---------|-----|
| Web (React, hot-reload) | http://localhost:5173 |
| API (NestJS) | http://localhost:8080 |
| Database (PostgreSQL, dev only) | localhost:5432 |
| Marketing site | http://localhost:8082 |

The API container runs database migrations automatically on startup.

See [doc/setup/dev-setup.md](doc/setup/dev-setup.md) for environment configuration and subdomain testing.

## Self-hosted / on-premise

KANAP supports single-tenant on-premise deployment. You provide your own PostgreSQL, S3-compatible storage, and reverse proxy:

```bash
# 1. Clone
git clone https://github.com/kanap-it/kanap.git
cd kanap

# 2. Configure
cp infra/.env.onprem.example .env
# Edit .env: set DATABASE_URL, S3 credentials, ADMIN_EMAIL, JWT_SECRET, APP_BASE_URL

# 3. Build
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 4. Start
docker compose -f infra/compose.onprem.yml up -d
```

The first boot auto-creates the tenant, admin user, and subscription. See the [on-premise installation guide](https://doc.kanap.net/on-premise/installation/) for full setup including reverse proxy configuration.

## Project structure

```
backend/    NestJS API, migrations, business logic
frontend/   React SPA, pages, components, hooks
infra/      Docker Compose, Nginx configs, deploy scripts
doc/        Architecture, API reference, runbooks, guides
```

## Self-hosted vs. managed

KANAP is free to self-host using the on-premise deployment mode. A managed cloud service is available at [kanap.net](https://kanap.net) starting at EUR 49/month.

## Contributing

Contributions are welcome! Please [open an issue](https://github.com/kanap-it/kanap/issues) first to discuss what you'd like to change.

## License

[O'Saasy License](LICENSE) &mdash; MIT-based with a single restriction: you may not offer KANAP as a competing hosted/SaaS product. Everything else (use, modify, distribute, sell) is permitted.

Copyright 2025, Kanap SARL.
