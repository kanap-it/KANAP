# CSV Import/Export

Purpose: Describe how CSV import/export works across entities, including headers, validation, preflight vs commit, and known constraints.
Audience: Product, Engineering, QA
Status: living
Owner: Eng

## Conventions
- Delimiter: semicolon `;` (not a comma). This is consistent across all CSVs.
- Encoding: UTF‑8 with BOM on export; imports must be valid UTF‑8. If you see an encoding error, save as “CSV UTF‑8”.
- Headers: Exact match required. Use the “Export template” action to get correct headers.
- Status:
  - Most entities: `enabled` or `disabled` (case-insensitive)
  - Users: `contact | invited | enabled | disabled`
    - `contact`: directory contact only (no app access, does not consume a seat)
    - `invited`: invited, not yet enabled (does not consume a seat)
    - `enabled`: active app user (consumes a seat)
    - `disabled`: suspended (does not consume a seat)
- IDs: CSV uses business-friendly identifiers. Relationships are resolved by names as specified per entity (no UUIDs in CSV).

- Lifecycle (`disabled_at`):
  - When provided, `disabled_at` is treated as the source of truth for lifecycle. The backend derives `status` from the timestamp at save time.
  - Leave `disabled_at` blank to keep records active indefinitely. Set a date to schedule end-of-day deactivation (23:59 local input → stored ISO timestamp).
  - If both `status` and `disabled_at` are present and conflict, the date wins; the system will normalize `status` to match `disabled_at`.

## Workflow
1) Export template → download empty CSV with headers
2) Fill CSV → semicolons, exact headers, UTF‑8
3) Preflight check (dry-run) → server validates; returns insert/update counts and up to 5 sample errors
4) Load (commit) → server upserts; response includes processed count

Error reporting
- Header mismatch is reported on row 0 with missing/extra column names.
- Validation errors include row numbers (1-based with header counted as line 1).
- Import aborts on validation errors; no partial writes occur in preflight. On commit, rows are upserted per unique key.

Deduplication & Upsert keys
- Companies: unique by `name`
- Departments: unique by `company_id + name` (CSV uses `company_name` to resolve `company_id`)
- Suppliers: unique by `name`
- Accounts: unique by `account_number`
- Users: unique by `email`

## Endpoints
- Export: `GET /{entity}/export?scope=template|data&year={yyyy?}` → returns `text/csv` with BOM. `year` is optional and defaults to the current calendar year; it allows entities such as Companies to generate dynamic metric columns.
- Import: `POST /{entity}/import?dryRun=true|false&year={yyyy?}` → multipart form with `file`. When omitted, `year` defaults to the current calendar year (see Companies for details).
  - Contracts use `/contracts/export` and `/contracts/import`

Platform Admin (CoA Templates)
- Export Template CSV: `GET /admin/coa-templates/:id/export`
- Import Template CSV: `POST /admin/coa-templates/:id/import?dryRun=true|false`
  - Preflight (dryRun=true) validates header + rows and returns a standard report
  - Commit (dryRun=false) persists the CSV as the template’s `csv_payload`
  - Response shape aligns with other importers: `{ ok, dryRun, total, inserted, updated, processed?, errors[] }`

## Entity Layouts

### Companies
- Headers: core company data plus three year-specific metric groups. Format: `name;country_iso;city;postal_code;address;reg_number;vat_number;base_currency;status;disabled_at;headcount_{Y-1};it_users_{Y-1};turnover_{Y-1};headcount_{Y};it_users_{Y};turnover_{Y};headcount_{Y+1};it_users_{Y+1};turnover_{Y+1}`. The base year `Y` defaults to the current calendar year and can be overridden with the `year` query parameter (e.g. `year=2025` yields `headcount_2024`/`2025`/`2026`).
- Unique key: `name`
- Validation: `country_iso` (2 letters, required), `base_currency` (3 letters, required). Other fields are optional and normalised to `NULL` when blank.
- Metrics: all metric columns are optional; populate them when you want to upsert headcount/IT users/turnover. If you provide any metric for a given year, `headcount_{year}` must be a non-negative integer. `it_users_{year}` accepts non-negative integers; `turnover_{year}` accepts non-negative numbers with up to three decimals. Leaving all three columns blank skips updates for that year.
- Export file naming: the server includes the base year in the filename (e.g. `companies_2025.csv`, `companies_template_2025.csv`) to make it clear which metric columns are present.

### Departments
- Headers: `company_name;name;description;status;disabled_at`
- Unique key: `company_id + name` (resolved from `company_name`); enforced at the database level (case‑insensitive).
- References: `company_name` must match an existing Company by `name`

### Suppliers
- Headers: `name;erp_supplier_id;commercial_contact;technical_contact;support_contact;notes;status;disabled_at`
- Unique key: `name`
- Contacts linking: `commercial_contact`, `technical_contact`, and `support_contact` accept a single email address each. On import, the system links the supplier to an existing contact by email (or creates a new contact with that email if none exists). Only one email per column is supported.

### Accounts
- Headers: `account_number;account_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status;disabled_at`
- Unique key: `account_number` (integer)
 - Platform Admin standard accounts use the same headers (without `coa_code`) and are stored per template.

### OPEX (Spend Items)
- Headers: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`
- Unique key: composite `(product_name, supplier_id)` resolved from `supplier_name` (case-insensitive)
- References:
  - `supplier_name` → Suppliers by `name`
  - `account_number` → Accounts by `account_number`
  - `owner_*_email` → Users by `email` (optional; ignored if not found during dry-run)
  - `analytics_category` → Analytics Categories by `name` (auto-created when missing during commit)
- Import behavior: existing spend items are left untouched; the importer only inserts brand-new combinations. Use the UI for updates.

### Spend Items Summary (Reporting feed)
- Not a CSV import; derived in-app via `/spend-items/summary` and cached client-side.
- Drives reporting views: `Top OPEX`, `Top OPEX Increase/Decrease`, `Budget comparison`, `Budget by consolidation account`, `Budget by analytics category`.
- Fields include yearly metric totals (`budget`, `landing`, `follow_up`, `revision`) for Y-1, Y, Y+1 plus account/analytics metadata needed for grouping.

### Users
- Headers: `email;first_name;last_name;role;company_name;department_name;status`
- Unique key: `email`
- References:
  - `role`: resolved by `role_name` (creates role if missing with a default description)
  - `company_name`: resolved by Company `name` (optional). If omitted, `department_name` must be omitted as well.
  - `department_name`: resolved by `(company_id, name)`. Requires a valid `company_name`.
- Defaults & Notes:
  - If `role` is empty, the role defaults to `Contact`.
  - If `status` is empty, status defaults to `contact`.
  - Imports do not set passwords; newly created users will have no password until set via UI or a reset flow.
- Importing Users creates/updates directory contacts by default; enabling access is done in the UI and consumes seats.

### Contacts
- Headers: `first_name;last_name;job_title;email;phone;mobile;country;notes;active`
- Unique key: `email` (per tenant; case-insensitive)
- Validation:
  - `email`: required, normalized to lowercase
  - `country`: optional 2-letter ISO code
  - `active`: `true|false|1|0|yes|no`
- Notes:
  - Import/export is available to admins only
  - Supplier linking is managed in the UI, not via CSV

### CAPEX Items
- Headers: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`
- Unique key: `description`
- Validation:
  - `ppe_type`: `hardware|software` (case-insensitive)
  - `investment_type`: `replacement|capacity|productivity|security|conformity|business_growth|other` (case-insensitive)
  - `priority`: `mandatory|high|medium|low` (case-insensitive)
  - `currency`: 3-letter ISO code
  - `effective_start`: defaults to `Y-01-01` if omitted
- Budgets:
  - Annual totals are spread equally across 12 months
  - Y-1 Landing and Y Landing map to `expected_landing`
  - Y Follow-up maps to `actual`; Y Revision maps to `committed`
  - Creating budgets populates or creates versions for Y-1, Y, Y+1 with `input_grain=annual`

### Contracts
- Headers: `name;company_name;supplier_name;start_date;duration_months;auto_renewal;notice_period_months;yearly_amount_at_signature;currency;billing_frequency;status;owner_email;notes`
- Unique key: composite `name + supplier_name`
- References:
  - `company_name` → Companies by `name` (required)
  - `supplier_name` → Suppliers by `name` (required)
  - `owner_email` → Users by `email` (optional)
- Validation:
  - `currency`: 3-letter code
  - `billing_frequency`: `monthly|quarterly|annual|other`
  - `start_date`: ISO `YYYY-MM-DD`
- Notes:
  - OPEX links are not part of CSV v1; manage links in the UI
  - Attachments are not part of CSV; upload via UI

### Applications (Apps & Services)
- Headers: `id;name;description;category;supplier_name;editor;criticality;lifecycle;is_suite;version;go_live_date;end_of_support_date;retired_date;licensing;notes;access_methods;external_facing;etl_enabled;support_notes;data_class;last_dr_test;contains_pii;status;business_owner_email_1;business_owner_email_2;business_owner_email_3;business_owner_email_4;it_owner_email_1;it_owner_email_2;it_owner_email_3;it_owner_email_4`
- Unique key: `name` (case-insensitive)
- References:
  - `supplier_name` → Suppliers by `name` (optional)
  - `business_owner_email_*` / `it_owner_email_*` → Users by `email` (optional; up to 4 each)
- Settings-backed fields (accept both codes and labels from IT Operations Settings):
  - `category`: e.g., `line_of_business`, `productivity`, `security`
  - `lifecycle`: e.g., `active`, `proposed`, `deprecated`, `retired`
  - `data_class`: e.g., `public`, `internal`, `confidential`, `restricted`
  - `access_methods`: comma-separated, e.g., `web,mobile,vdi`. Default codes: `web`, `local`, `mobile`, `hmi`, `terminal`, `vdi`, `kiosk`. Tenants can configure custom access methods in IT Ops Settings.
- Fixed enums:
  - `criticality`: `business_critical`, `high`, `medium`, `low` (also accepts labels like "Business Critical")
  - `status`: `enabled`, `disabled`
- Export-only fields (not in import template):
  - `data_residency`: comma-separated ISO country codes
  - `users_mode`, `users_year`, `users_override`: audience/user count fields
  - `created_at`, `updated_at`: timestamps
- Export presets:
  - **Data Enrichment**: All importable fields (for round-trip editing)
  - **Full Export**: All exportable fields including computed/read-only fields
- Import modes:
  - **Enrich** (default): Empty cells preserve existing values
  - **Replace**: Empty cells clear existing values
- Import operations:
  - **Upsert** (default): Create or update
  - **Update only**: Skip new applications
  - **Insert only**: Skip existing applications

## UI Usage
- Each page (Companies, Departments, Suppliers, Accounts, Users) has Import and Export actions.
- Export dialog offers:
  - Export template → headers only
  - Export data → current records
- Import dialog supports:
  - Drag-and-drop or file picker (`.csv`)
  - Preflight check (dry-run) → shows totals and errors
  - Load (commit) → runs only after a successful preflight

## Samples
- See `doc/samples/` for starter CSVs that match the headers. For Users, see `doc/samples/users.csv`.

## Notes & Limitations
- Relationship lookups are case-sensitive by exact name (normalized by service where applicable); ensure consistent spelling.
- Department resolution requires company context to avoid ambiguity.
- Status values outside `enabled|disabled` are rejected.
- Most entities upsert rows based on their unique keys; the OPEX importer currently only creates new rows and never overwrites existing data.
