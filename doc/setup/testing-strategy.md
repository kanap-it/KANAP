# Testing Strategy

Metadata
- Purpose: Define testing approach across levels
- Audience: Engineering, QA
- Status: draft
- Owner: TBD
- Last Updated: 2025-08-31

## Levels
- Unit: fast, isolated tests for functions/modules
- Integration: interactions between components and services
- E2E: user flows through the system
- Contract: provider and API compatibility

## Tooling
- Test runners and frameworks: TBD (based on chosen stack)
- Linting/formatting: TBD

## Test Data
- Synthetic vs. real datasets
- Seeding and fixtures

## CI Gates
- Run unit/integration on PRs; E2E on main/nightly
- Minimum coverage thresholds (if applicable)

## Non-Functional Tests
- Load, resilience/chaos, and security

## Current Smoke Tests (manual)
- Auth
  - POST `/auth/login` with JSON body; expect 201 and `{access_token}`
  - Use token for protected routes via `Authorization: Bearer <token>`
- Companies
  - POST `/companies` with `{name, status}`; expect created
  - GET `/companies?page=1&limit=10&sort=name:ASC&filters={...}`; expect list reflects sort and filter
- Departments
  - POST `/departments` with valid `company_id`, `code`, `name`; expect created
- Accounts/Suppliers
  - POST and GET similarly; verify audit logs via DB `audit_log`

- Spend Core
  - Spend Items: POST `/spend-items` with `{product_name, supplier_id, account_id, currency, effective_start}`; GET `/spend-items/:id`
  - Versions: POST `/spend-items/:id/versions` with `{version_name, input_grain, as_of_date}`; GET list; PATCH with body `{id,...updates}`
  - Amounts (Annual): POST `/spend-versions/:id/amounts/bulk-upsert` `{kind:'annual',year,totals:{planned:...},spread_profile_name:'flat'}`; verify 12 months inserted and sum equals total
  - Amounts (Quarterly 4-4-5): POST `/spend-versions/:id/amounts/bulk-upsert` `{kind:'quarterly',year,measure:'planned',Q1..Q4,spread_profile_name:'4-4-5'}`; verify 12 months and per-quarter sums match
  - Company Metrics: PATCH `/company-metrics/:companyId?year=YYYY` with `headcount`, optional `it_users`, `turnover`; verify visible on `/companies?year=YYYY`; negatives for non-integer it_users/headcount, >3 decimals turnover
  - Department Metrics: PATCH `/department-metrics/:departmentId?year=YYYY` with `headcount`; verify visible on `/departments?year=YYYY`; negative for non-integer headcount
  - Allocation Rules: PATCH `/allocation-rules/active?year=YYYY` → GET returns updated; default=headcount
  - Allocations:
    - Auto methods: PATCH version method, POST `/spend-versions/:id/allocations/bulk-upsert` with `[]` (or omit) → validates metrics and clears legacy rows; GET `/spend-versions/:id/allocations` returns derived shares that reflect current metrics
    - Manual company: POST the selected `company_id`s only (percentages recompute from metrics). Missing `company_id` → 400.
    - Manual department: POST `{ company_id, department_id }` pairs; headcount is recomputed. Missing `department_id` → 400.
  - Tasks: POST `/spend-items/:id/tasks` then GET list; PATCH updates status to `done`

- CAPEX Core
  - CAPEX Items: POST `/capex-items` with `{description, ppe_type, investment_type, priority, currency, effective_start}`; GET `/capex-items/:id`
  - Versions: POST `/capex-items/:id/versions` with `{version_name, input_grain, as_of_date, budget_year}`; GET list; PATCH with `{id,...updates}` including `allocation_method`
  - Amounts (Annual): POST `/capex-versions/:id/amounts/bulk-upsert` `{kind:'annual',year,totals:{planned,actual,expected_landing,committed}}`; verify sums and monthly materialization
  - Amounts (Monthly): POST `/capex-versions/:id/amounts/bulk-upsert` `{kind:'monthly',year,months:[...]}`; verify rows persisted for 12 periods
  - Allocations:
    - Auto methods: PATCH version method, POST `/capex-versions/:id/allocations/bulk-upsert` with `[]`; GET `/capex-versions/:id/allocations` shows derived shares
    - Manual company: POST the selected `company_id`s only; percentages recompute via the stored driver. department_id must be null.
    - Manual department: POST `{ company_id, department_id }` pairs; headcount is recomputed. Missing `department_id` → 400.
- Currency Management
  - Settings API/UI: `GET /currency/settings`, `PATCH /currency/settings` with new reporting/default currencies, verify defaults change in OPEX/CAPEX editor forms and allowed list enforcement (attempt to save/import a disallowed currency should return 400 with allowed codes).
  - Force sync: `POST /currency/rates/refresh` (or UI “Force FX rates sync”) and confirm `currency_rate_sets` captures the requested fiscal years with the expected `source` (`world-bank-annual`, `exchangerateapi-spot`, `world-bank-forward`). Expect totals endpoints (`/spend-items/summary/totals`, `/capex-items/summary/totals`) to echo the reporting currency. Manual calls are tenant-scoped and apply a short cooldown to the scheduled job—plan load tests accordingly.
  - Freeze integration: after force sync, freeze an OPEX budget year via `/freeze-states/freeze` and ensure affected `spend_versions.fx_rate_set_id` is populated. Unfreeze and confirm the column clears.
  - Reporting conversions: seed spend items in multiple currencies, call `/spend-items/summary?years=2024,2025` and verify the `versions.*.reporting` values line up with the annual average in the matching `currency_rate_sets` record.

## UI Conventions (test targets)
- PageHeader appears on every page; breadcrumbs reflect the route; actions appear to the right.
- ServerDataGrid (AG Grid infinite) drives list views; verify:
  - URL query param sync for `sort` (field:ASC|DESC)
  - Floating filters work per column: contains, notContains, equals, notEqual, startsWith, endsWith, blank, notBlank
  - Changing sort/filters purges cache and refetches; infinite scrolling fetches additional rows as you scroll
  - No duplicate fetch loops on rapid changes
- TanStack Query drives data fetching; verify cache invalidation on create/update/delete and no duplicate requests on fast route changes.
