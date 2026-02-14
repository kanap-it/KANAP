# Development Setup

Metadata
- Purpose: Describe how to set up a local development environment
- Audience: Contributors
- Status: draft
- Owner: TBD
- Last Updated: 2025-10-03

## Prerequisites
- OS: macOS/Linux/Windows
- Required tooling: Docker, Docker Compose; Node.js 20 + npm for local dev
- Accounts/Access: N/A for v1 local dev

## Environment Variables
Local contributors typically rely on the values baked into `infra/docker-compose.yml`; tweak them there or export env vars before running Compose. Key settings:

- `RESEND_API_KEY` *(required for outbound email)* -- create a secret key in the Resend dashboard and inject it for the API container.
- `RESEND_FROM_EMAIL` *(recommended)* -- verified sender identity, e.g. `"KANAP <no-reply@kanap.net>"`.
- `MARKETING_BASE_URL` *(optional)* -- override host used for activation links when the API receives requests on a different domain than the marketing site (e.g., API on `api.local` but static site on `www.local`). Leave unset when both share the same host.
  - In local dev when using Cloudflare + the nginx proxy, set this to `https://dev.kanap.net` so activation links hit the proxied/Cloudflare domain instead of the internal marketing container (`localhost:8082`). See `doc/planning/cloudflare-setup.md`.
- `APP_BASE_URL` -- base origin for password reset/invite links. In production this is authoritative (required); in dev it is optional because local subdomain workflows can derive links from the incoming host. Recommended dev default: `http://localhost:5173`.
- `PASSWORD_RESET_TTL` *(optional)* -- change the expiration (default `1h`). Accepts numeric seconds or `ms`-style strings (`15m`, `2h`).
- `PLATFORM_ADMIN_EMAILS` -- comma-separated list of emails that receive the platform-admin tenant controls in the backend/UI. Example: `admin@example.com,ops@example.com`. Use `*` to allow every authenticated user (dev/test only).
- `RATE_LIMIT_ENABLED` *(optional)* -- app-level rate limiting toggle (default `true`). Set to `false` for local testing if 429s get in the way.
- `RATE_LIMIT_TRUST_PROXY` *(optional)* -- set to `true` when running behind a reverse proxy so rate limiting uses the real client IP.
- `CAPTCHA_MODE` *(optional)* -- CAPTCHA behavior for `/public/start-trial` and `/public/contact`:
  - `off` (default in local dev)
  - `monitor` (logs failures, does not block)
  - `enforce` (requires valid token)
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` *(required when `CAPTCHA_MODE=enforce`)* -- Cloudflare Turnstile keys.
- `APP_URL` *(recommended for notifications)* -- base URL used in scheduled notification emails to build tenant deep links (e.g., `https://app.dev.kanap.net`). The tenant slug replaces `app` in the hostname. Without it, email links may point to the wrong host.
- `EMAIL_OVERRIDE` *(recommended for local dev)* -- redirect **all** outgoing emails to this address so you can safely test notifications without spamming real users. Example: `EMAIL_OVERRIDE=dev@example.com`.

### Database Connection Pool (Optional)
Connection pool configured with sensible defaults; override only if tuning for specific workloads:
- `DB_POOL_MAX` *(default: 20)* -- Maximum database connections
- `DB_POOL_MIN` *(default: 2)* -- Minimum idle connections to maintain
- `DB_POOL_IDLE_TIMEOUT` *(default: 30000)* -- Close idle connections after N milliseconds
- `DB_POOL_CONNECTION_TIMEOUT` *(default: 10000)* -- Fail fast if connection not acquired within N milliseconds

If you prefer to mirror production by using per-service `.env` files, keep secrets out of version control and pass them via `docker compose --env-file ...`.

### Stripe Billing (new)
- Required keys (test mode values are fine during development):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` (base prices)
  - Optional per-plan overrides follow the pattern `STRIPE_PRICE_<PLAN>_<PERIOD>` (e.g. `STRIPE_PRICE_SOLO_MONTHLY`, `STRIPE_PRICE_TEAM_ANNUAL`). These are used when deriving estimated amounts from seat counts.
  - `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`
- Set these either in `infra/docker-compose.yml` or export them in your shell before launching Compose.
- Forward webhooks with Stripe CLI: `stripe listen --forward-to http://localhost:8080/stripe/webhook`
  - Copy the printed signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` every time you restart the listener.
  - Use `stripe trigger <event>` (e.g. `stripe trigger invoice.payment_succeeded`) to exercise the webhook pipeline locally.
- **Required Stripe webhook events** (enable these when creating a webhook endpoint in the Stripe dashboard):
  - `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`, `.pending_update_applied`, `.pending_update_expired`, `.trial_will_end`
  - `checkout.session.completed`
  - `invoice.paid`, `.payment_succeeded`, `.payment_failed`, `.finalized`, `.updated`
  - `payment_intent.succeeded`, `payment_intent.payment_failed`
- Run billing migrations whenever the schema changes: `docker compose -f infra/docker-compose.yml exec api npm run typeorm -- migration:run`.
- Smoke test:
  1. `POST /auth/login` to obtain a bearer token.
  2. `POST /billing/checkout` (with success/cancel URLs) and complete the hosted Stripe Checkout page (the UI shortcut does the same call).
  3. Visit `/billing/profile` or the Billing Center — renewal date, per-period amount, payment method, and invoice history should now reflect Stripe state. Amounts fall back to the configured price IDs × seat count when Stripe has not yet reported the latest totals.

## Setup Steps
1. Clone the repository
2. Configure `.env` files from examples in `backend/.env.example` and `frontend/.env.example`
3. From `infra/`, run `docker compose up -d` to start containers (migrations auto-run for the API)
4. Tail logs and verify healthchecks; see Step 01 for details
5. Local dev (optional): `npm --prefix backend run start:dev` and `npm --prefix frontend run dev`

### Subdomain Testing in Dev
To simulate QA/Prod routing locally, and to exercise Entra flows under HTTPS, run the entire dev stack through Cloudflare:
- Recommended (Cloudflare Tunnel):
  - Follow `doc/planning/cloudflare-setup.md` to:
    - Move DNS for `kanap.net` to Cloudflare.
    - Create a `kanap-local` tunnel that forwards `dev.kanap.net` and `*.dev.kanap.net` to `localhost:80`.
    - Start the dev stack with `docker compose --profile dev-proxy up -d` so nginx routes:
      - `dev.kanap.net` → marketing; `/api/` → API.
      - `<slug>.dev.kanap.net` → web; `/api/` → API.
  - In this mode:
    - Marketing: `https://dev.kanap.net`
    - Tenant web: `https://acme.dev.kanap.net` (replace `acme` with any slug)
    - SPA calls `/api/...` on the same origin; nginx strips `/api` and forwards to the Nest API.
- Offline / no-Cloudflare fallback (dev only):
  - Use `lvh.me` wildcard domains which resolve to `127.0.0.1` without hosts file changes.
    - Marketing: `http://www.lvh.me`
    - Tenant web: `http://acme.lvh.me`
    - Platform admin console: `http://platform-admin.lvh.me`
  - Run the same nginx dev proxy (`docker compose -f infra/docker-compose.yml --profile dev-proxy up -d nginx`).
  - This mode is fine for general feature work but does **not** provide HTTPS, so Entra sign-in cookies may not behave the same as QA/Prod.

### Quick Dev Loop
- Backend (hot reload): `npm --prefix backend run start:dev`
- Frontend (dev server): `npm --prefix frontend run dev`
- Migrations auto-run on API startup; to rerun manually: `docker compose -f infra/docker-compose.yml exec api npm run typeorm -- migration:run`
 - React Query DevTools: visible in the web app (bottom-right) in development; use it to inspect queries/cache

## Common Commands
- Rebuild API image after code changes: `docker compose -f infra/docker-compose.yml build api && docker compose -f infra/docker-compose.yml up -d api`
  - The backend Dockerfile now runs `npm run build` during the image build. Fix any TypeScript errors locally (`npm run build` in `backend/`) before rebuilding to avoid broken images.
- Reset dev DB: `docker compose -f infra/docker-compose.yml down -v && docker compose -f infra/docker-compose.yml up -d`
- Run a migration manually: `docker compose -f infra/docker-compose.yml exec api npm run typeorm -- migration:run`

## Database Persistence & Reset
- Persistence: The Postgres data directory is stored in a named volume `cio_db-data`. Stopping or rebuilding containers does not delete data.
- Do not add `-v` when stopping if you want to keep data: `docker compose -f infra/docker-compose.yml down`.
- Reset (wipe) the DB when needed:
  - Quick script: `bash infra/scripts/db-reset.sh`
  - Or manually: `docker compose -f infra/docker-compose.yml down -v && docker compose -f infra/docker-compose.yml up -d db api web`


## Troubleshooting
- Ensure `Content-Type: application/json` on POST requests.
- JWT is required for protected routes: `Authorization: Bearer <token>`.
- To decode a JWT (base64url) on macOS:
  `node -e "const t=process.argv[1];const p=t.split('.')[1];const b=Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'),'base64');console.log(b.toString())" "$TOKEN"`

### Connection Pool Issues
If you encounter hanging requests or connection errors:
1. Check database connections: `docker compose -f infra/docker-compose.yml exec -T db psql -U app -d appdb -c "SELECT state, count(*) FROM pg_stat_activity WHERE datname = 'appdb' GROUP BY state;"`
2. Look for CRITICAL errors in API logs: `docker compose -f infra/docker-compose.yml logs api | grep CRITICAL`
3. Restart API if needed: `docker compose -f infra/docker-compose.yml restart api`

See `doc/runbook.md` for detailed monitoring procedures.

## Make Targets / NPM Scripts
Document common commands to build, run, test, and lint once available.
