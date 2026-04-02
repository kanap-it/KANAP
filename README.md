# KANAP

[![Website](https://img.shields.io/badge/website-kanap.net-blue)](https://kanap.net)
[![Documentation](https://img.shields.io/badge/docs-doc.kanap.net-green)](https://doc.kanap.net)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--v3-blue.svg)](LICENSE)

**The AI-augmented IT governance platform for budget planning, enterprise architecture, and portfolio management.**

Built by an IT director who got tired of duct-taping spreadsheets, wikis, and project tools together.

[Website](https://kanap.net) | [Documentation](https://doc.kanap.net) | [Source docs](doc/)

---

## Why KANAP?

IT departments juggle budgets across spreadsheets, track applications in wikis, and manage projects in yet another tool. Nothing connects. When the CFO asks "what are we spending on that system?", the answer takes days to assemble.

KANAP replaces that patchwork with a single platform where costs link to applications, applications link to projects, and projects link back to budgets. One source of truth, zero complexity theater.

![KANAP Dashboard](doc/assets/dashboard.png)

## What it does

**Budget Management**: Multi-year OPEX and CAPEX planning with six allocation methods, multi-currency support, CSV import/export, and executive reporting including chargeback and analytics dashboards. Track contracts with links to OPEX/CAPEX items, attachments, deadlines, and automated expiration warnings.

**IT Landscape**: Document and visualize your information system: application portfolio, infrastructure assets, network interfaces and connections with interactive architecture maps, location and subnet management, and business process catalog.

**Portfolio Management**: Manage the project lifecycle from initial request through delivery with roadmap scheduling and capacity analysis.

**Unified Tasks**: One task system spanning budget items, contracts, CAPEX items, and projects with status tracking, assignments, and email notifications.

**Knowledge Management**: Govern your IT documentation with a built-in markdown editor, structured libraries, review and approval workflows, version history, and export to PDF, DOCX, and ODT. Documents link directly to applications, projects, assets, and tasks.

**AI Agents**: Ask questions, create documents, manage tasks, and explore all your data through natural-language chat. KANAP's AI layer works across all modules and is also available as an MCP server, so external AI tools can interact with your governance data directly.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript, TypeORM |
| Frontend | React, TypeScript, Vite, MUI, AG Grid, TanStack Query |
| Database | PostgreSQL 16 with Row-Level Security |
| Infrastructure | Docker, Nginx, S3-compatible storage |

Multi-tenant by design &mdash; single database with RLS isolation, subdomain routing, and RBAC.

## Self-hosted / on-premise

KANAP on-premise runs in single-tenant mode with Docker. Two ways to get started:

- **[AI-accelerated installation](https://doc.kanap.net/on-premise/installation-ai/)**: Let an AI assistant guide you through setup interactively. Fastest path to a running instance.
- **[Manual installation](https://doc.kanap.net/on-premise/installation-example/)** : Step-by-step guide with full control over every configuration detail.

Both paths require PostgreSQL 16+, S3-compatible object storage, and a TLS reverse proxy.

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

[AGPL v3](LICENSE) : true open source. You are free to use, modify, and distribute KANAP. The AGPL copyleft clause ensures that anyone running a modified version as a network service must share their changes, keeping the project genuinely open for everyone.

Copyright 2025-2026, Kanap SARL.
