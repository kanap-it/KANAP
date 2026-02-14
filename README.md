# KANAP

**The integrated IT management platform for budget planning, enterprise architecture, and portfolio management.**

[Website](https://kanap.net) | [Documentation](doc/)

---

## Why KANAP?

IT departments juggle budgets across spreadsheets, track applications in wikis, and manage projects in yet another tool. Nothing connects. When the CFO asks "what are we spending on that system?", the answer takes days to assemble.

KANAP replaces that patchwork with a single platform where costs link to applications, applications link to projects, and projects link back to budgets. One source of truth, zero complexity theater.

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

## Quick start

**Prerequisites:** Docker and Docker Compose.

```bash
# Clone and start
git clone https://github.com/kanap-it/kanap.git
cd kanap/infra
docker compose up -d
```

Three services come up:

| Service | URL |
|---------|-----|
| Web (React) | http://localhost:5173 |
| API (NestJS) | http://localhost:8080 |
| Database (PostgreSQL) | localhost:5432 |

The API container runs database migrations automatically on startup.

See the [on-premise installation guide](https://doc.kanap.net/on-premise/installation/) and the [documentation](doc/) for environment configuration, QA/production deployment, and detailed setup guides.

## Project structure

```
backend/    NestJS API, migrations, business logic
frontend/   React SPA, pages, components, hooks
infra/      Docker Compose, Nginx configs, deploy scripts
doc/        Architecture, API reference, runbooks, guides
```

## Self-hosted vs. managed

KANAP is free to self-host. A managed cloud service is available at [kanap.net](https://kanap.net) starting at EUR 49/month.

## License

[O'Saasy License](LICENSE) &mdash; MIT-based with a single restriction: you may not offer KANAP as a competing hosted/SaaS product. Everything else (use, modify, distribute, sell) is permitted.

Copyright 2025, Kanap SARL.
