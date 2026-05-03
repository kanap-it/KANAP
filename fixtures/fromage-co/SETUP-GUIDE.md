# Fromage & Co Tenant Initialization Guide

This guide contains the minimum procedure to initialize the Fromage & Co demo
tenant in a local KANAP environment.

## Scope

- The local Docker stack runs in single-tenant mode.
- The local tenant should resolve through `DEFAULT_TENANT_SLUG=fromage`.
- The Node setup runner is idempotent and safe to rerun.
- The legacy shell scripts are kept for hosted environments that already have
  `bash`, `curl`, and `jq`.

## 1. Local Prerequisites

Start the local stack from the repository root:

```powershell
docker compose -f infra/docker-compose.example.yml up --build -d
```

For the local demo tenant, `backend/env.dev` should contain:

```dotenv
DEFAULT_TENANT_SLUG=fromage
DEFAULT_TENANT_NAME=Fromage & Co
```

If you change these values after the stack is running, recreate the API
container. A plain restart does not reload `env.dev`.

```powershell
docker compose -f infra/docker-compose.example.yml up -d --force-recreate api
```

## 2. Snapshot Before Iterating

Use a database dump before experimenting so you can restore quickly:

```powershell
New-Item -ItemType Directory -Force .codex\snapshots | Out-Null
docker compose -f infra/docker-compose.example.yml exec -T db pg_dump -U postgres -d appdb -Fc > .codex\snapshots\pre-fromage-fixture.dump
```

Restore with:

```powershell
Get-Content .codex\snapshots\pre-fromage-fixture.dump -Encoding Byte -ReadCount 0 |
  docker compose -f infra/docker-compose.example.yml exec -T db pg_restore -U postgres -d appdb --clean --if-exists
```

## 3. Initialize The Tenant Locally

Run from the repository root:

```powershell
& 'C:\Users\fried\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' fixtures\fromage-co\setup-tenant.mjs --base-url http://localhost:8080
```

By default the runner uses the local disposable administrator:

- Email: `admin@example.com`
- Password: `KANAPLocalDev!2026`

You can override the credentials:

```powershell
& 'C:\Users\fried\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' fixtures\fromage-co\setup-tenant.mjs --base-url http://localhost:8080 --email thomas.berger@fromage-co.com --password '<password>'
```

## 4. What The Runner Initializes

In order, the Node runner performs:

1. Currency and IT Ops settings bootstrap.
2. Company import.
3. Chart of accounts creation, account imports, and company CoA assignment.
4. CSV imports for suppliers, departments, contacts, users, business processes,
   applications, contracts, spend, CAPEX, portfolio projects, and requests.
5. Location creation before asset import, because assets now validate
   `location_code`.
6. Asset and task imports.
7. IT integration/network setup:
   - `20-app-instances.csv`
   - `21-interfaces.csv`
   - `22-interface-bindings.csv`
   - `23-connections.csv`
   - `24-connection-legs.csv`
   - `25-interface-connection-links.csv`
8. Post-import links for suites, departments, contracts, spend, and portfolio
   team capacity.

## 5. Verification

Run the login verifier from the repository root:

```powershell
& 'C:\Users\fried\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .codex\tools\verify-kanap-login.mjs
```

The verifier saves a screenshot to `.codex\tools\kanap-after-login.png`.
