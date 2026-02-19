# Fromage & Co — Tenant Initialization Guide

This guide contains the minimum required procedure to initialize the Fromage & Co demo tenant.

## Scope

- Tenant creation is manual (preferred).
- Everything after tenant creation is automated with `setup-tenant.sh`.
- The script is idempotent and safe to rerun.

## 1. Prerequisites

- A tenant already exists (name: `Fromage & Co`, code: `Fromage`).
- Fiscal year is configured (`Y-1 = 2025`, `Y = 2026`, `Y+1 = 2027`).
- You have tenant admin credentials.
- `curl` and `jq` are installed.

## 2. Initialize The Tenant (Recommended)

Run from `fixtures/fromage-co`:

```bash
chmod +x setup-tenant.sh setup-settings.sh
./setup-tenant.sh <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>
```

Examples:

```bash
./setup-tenant.sh http://localhost:5173 thomas.berger@fromage-co.com MyPass123
./setup-tenant.sh https://fromage.qa.kanap.net thomas.berger@fromage-co.com '***'
```

`BASE_URL` is the tenant root URL without `/api`.

## 3. What The Script Initializes

In order, the script performs:

1. Settings bootstrap via `setup-settings.sh`.
2. Currency setup early:
   - reporting/default spend/default CAPEX = `EUR`
   - allowed currencies = `EUR`, `USD`
3. CSV imports in dependency order (`01` → `19`).
4. CoA creation/import/assignment per country before spend and CAPEX imports.
5. Location creation.
6. IT integration/network model from fixture files:
   - `20-app-instances.csv`
   - `21-interfaces.csv`
   - `22-interface-bindings.csv`
   - `23-connections.csv`
   - `24-connection-legs.csv`
   - `25-interface-connection-links.csv`
   - Middleware prerequisites are enforced automatically:
     - middleware applications are set to `etl_enabled=true`
     - `via_middleware` interfaces get `middleware_application_ids` from `21-interfaces.csv`
7. Post-import linking (suites, app-departments, contract-app links, spend-app links, allocations, project timeline/team).
8. Roadmap-generator setup:
   - creates/updates portfolio teams: `Business Applications`, `Development`, `Infrastructure`
   - assigns identified project contributors to those teams
   - sets each contributor `project_availability` to `10` days/month

## 4. Idempotency And Reruns

- Re-running `setup-tenant.sh` is supported.
- Existing entities are updated/reused using upsert or bulk-replace semantics where available.
- Use reruns after CSV adjustments or partial failures.

## 5. Notes

- User import does not send invite emails automatically.
- If invites are needed, send them explicitly after initialization.
- Department hierarchy is intentionally not part of this setup (unsupported/not planned).
- Interface bindings are seeded for `prod`; one showcase flow (`IF-FROMAGE-001`) is seeded in both `prod` and `qa`.

## 6. Optional: Settings-Only Bootstrap

If you only need base settings (without data imports):

```bash
./setup-settings.sh <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>
```

This includes currency setup (`EUR` + `USD`) and portfolio/IT-ops/analytics settings.
