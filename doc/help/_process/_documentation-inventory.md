# User Manual Documentation Inventory

_Generated: 2026-02-28_

This document tracks documentation coverage for the KANAP user manual.

## Summary

| Category | Total Pages | Documented | Gap |
|----------|-------------|------------|-----|
| Home | 1 | 1 | 0 |
| Dashboard & Operations | 9 | 9 | 0 |
| IT Operations | 8 | 8 | 0 |
| Master Data | 8 | 8 | 0 |
| Admin & Settings | 9 | 9 | 0 |
| Reports | 10 | 10 | 0 |
| Portfolio | 9 | 9 | 0 |
| **TOTAL** | **53** | **53** | **0** |

_Note: Portfolio Planning is a placeholder (coming soon) and excluded from counts._

---

## Recent Updates

| Date | Doc File | Changes |
|------|----------|---------|
| 2026-02-28 | `portfolio-reporting.md` | Added Weekly Report section (filters, three tables, exports) |
| 2026-02-28 | `portfolio-projects.md` | Added item number (#) column in list and workspace header |
| 2026-02-28 | `portfolio-requests.md` | Added item number (#) column in list and workspace header |
| 2026-02-28 | `portfolio-team-members.md` | Added Time Logged tab documentation (view, edit, delete time entries) |
| 2026-02-28 | `tasks.md` | Added "Converting a task to a request" section |
| 2026-02-28 | `_documentation-inventory.md` | Added branding, settings, weekly report routes; updated counts and triggers |
| 2026-02-27 | `branding.md` | New documentation for Branding page (logo, colors, favicon) |
| 2026-02-22 | `chart-of-accounts.md` | Added Available Templates catalog (20 templates, 10 standards × 2 versions), IFRS consolidation reference table, v1.0 vs v2.0 guidance, updated scenarios and FAQ |
| 2026-02-16 | Multiple files | Dissolved My Workspace: Dashboard promoted to home page (`/`), Tasks moved to Portfolio section, My Workspace tab removed, legacy routes redirect |
| 2026-02-15 | Multiple files | Navigation restructure: renamed "Apps & Services" → "Applications", "Budget Operations" → "Budget Administration", "Master Data Operations" → "Master Data Administration", "Analytics Categories" → "Analytics Dimensions", "Dashboard" → "Overview"; added sidebar grouping to IT Ops and Master Data doc nav |
| 2026-02-14 | `my-dashboard.md` | New documentation for My Dashboard (tiles, quick actions, settings, customisation) |
| 2026-02-14 | `admin.md` | Added Audit Log documentation (access, filtering, pagination, source interpretation) |
| 2026-02-12 | `portfolio-reporting.md` | Added Status Change Report documentation (filters, inclusion rules, columns, exports) |
| 2026-02-10 | `tasks.md` | Added "Sending a link" section (Send link feature) |
| 2026-02-10 | `portfolio-projects.md` | Added "Sending a link" section (Send link feature) |
| 2026-02-10 | `portfolio-requests.md` | Added "Sending a link" section (Send link feature) |
| 2026-02-10 | `opex.md` | Rewrote Tasks tab for new EntityTasksPanel (list view with links to task workspace) |
| 2026-02-10 | `capex.md` | Rewrote Tasks tab for new EntityTasksPanel |
| 2026-02-10 | `contracts.md` | Rewrote Tasks tab for new EntityTasksPanel |
| 2026-02-10 | `operations-dashboard.md` | Updated for dashboard redesign: 3-column layout, View buttons, structured tile sections |
| 2026-02-10 | `tasks.md` | Fixed OPEX terminology, added default task type auto-selection |
| 2026-02-10 | `portfolio-projects.md` | Added Gantt view documentation to Timeline tab |
| 2026-02-10 | `portfolio-requests.md` | Added Integration & Compatibility as 7th feasibility dimension |
| 2026-02-10 | `contacts.md` | Added create-contact-from-supplier workflow |
| 2026-02-10 | `applications.md` | Updated for latest changes |
| 2026-02-08 | `admin.md` | Updated for latest changes |
| 2026-01-31 | `tasks.md` | Updated for task workspace sidebar, CSV import/export, standalone classification |
| 2026-01-31 | `portfolio-settings.md` | Updated for latest changes |
| 2026-01-31 | `interfaces.md` | Updated for latest changes |
| 2026-01-31 | `suppliers.md` | Updated for latest changes |
| 2026-01-29 | `portfolio-reporting.md` | New documentation for Portfolio Reporting + Capacity Heatmap |
| 2026-01-27 | `assets.md` | Updated for latest changes |
| 2026-01-26 | `it-ops-settings.md` | Updated IT Operations Settings |
| 2026-01-18 | `portfolio-team-members.md` | New documentation for Portfolio Team Members |
| 2026-01-15 | `connections.md` | Updated for latest changes |
| 2026-01-15 | `connection-map.md` | Added Applications filter, App Env filter, connection layers, export SVG/PNG, linked interfaces |
| 2026-01-15 | `interface-map.md` | Added Applications filter, export SVG/PNG, snap to grid, infra connections panel |
| 2026-01-15 | `locations.md` | Updated for latest changes |
| 2026-01-11 | `portfolio-requests.md` | New documentation for Portfolio Requests (initial) |
| 2026-01-11 | `portfolio-projects.md` | New documentation for Portfolio Projects (initial) |
| 2026-01-11 | `portfolio-settings.md` | New documentation for Portfolio Settings (initial) |
| 2026-01-11 | `admin.md` | Updated for RBAC changes: multi-role assignment, permission groups, built-in roles, role duplication |

---

## Detailed Inventory

### Home

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/` | WorkspaceDashboardPage | **DOCUMENTED** | `my-dashboard.md` |

_Note: `/my/dashboard` redirects to `/`. `/my/tasks` and `/ops/tasks` redirect to `/portfolio/tasks`._

### Budget Management

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/ops` | DashboardPage (Overview) | **DOCUMENTED** | `operations-dashboard.md` |
| `/ops/opex` | OpexListPage + SpendItemPage | **DOCUMENTED** | `opex.md` |
| `/ops/capex` | CapexPage + CapexItemPage | **DOCUMENTED** | `capex.md` |
| `/ops/contracts` | ContractsPage + ContractWorkspacePage | **DOCUMENTED** | `contracts.md` |
| `/ops/operations` | BudgetOperationsLandingPage (Administration) | **DOCUMENTED** | `budget-operations.md` |
| `/ops/operations/freeze` | BudgetFreezePage | **DOCUMENTED** | (in budget-operations) |
| `/ops/operations/copy-budget-columns` | CopyBudgetColumnsPage | **DOCUMENTED** | (in budget-operations) |
| `/ops/operations/copy-allocations` | CopyAllocationsPage | **DOCUMENTED** | (in budget-operations) |
| `/ops/operations/column-reset` | BudgetColumnResetPage | **DOCUMENTED** | (in budget-operations) |

### IT Operations

**Infrastructure**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/it/locations` | LocationsPage + LocationWorkspacePage | **DOCUMENTED** | `locations.md` |
| `/it/assets` | AssetsPage + AssetWorkspacePage | **DOCUMENTED** | `assets.md` |
| `/it/connections` | ConnectionsPage + ConnectionWorkspacePage | **DOCUMENTED** | `connections.md` |
| `/it/connection-map` | ConnectionMapPage | **DOCUMENTED** | `connection-map.md` |

**Applications**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/it/applications` | ApplicationsPage + ApplicationWorkspacePage | **DOCUMENTED** | `applications.md` |
| `/it/interfaces` | InterfacesPage + InterfaceWorkspacePage | **DOCUMENTED** | `interfaces.md` |
| `/it/interface-map` | InterfaceMapPage | **DOCUMENTED** | `interface-map.md` |

**Settings**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/it/settings` | ItOperationsSettingsPage | **DOCUMENTED** | `it-ops-settings.md` |

### Master Data

**Organization**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/master-data/companies` | CompaniesPage + CompanyWorkspacePage | **DOCUMENTED** | `companies.md` |
| `/master-data/departments` | DepartmentsPage + DepartmentWorkspacePage | **DOCUMENTED** | `departments.md` |

**External Parties**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/master-data/suppliers` | SuppliersPage + SupplierWorkspacePage | **DOCUMENTED** | `suppliers.md` |
| `/master-data/contacts` | ContactsPage + ContactWorkspacePage | **DOCUMENTED** | `contacts.md` |

**Finance**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/master-data/coa` | CoaPage + AccountWorkspacePage | **DOCUMENTED** | `chart-of-accounts.md` |
| `/master-data/accounts` | Legacy redirect to `/master-data/coa` + AccountWorkspacePage | **DOCUMENTED** | `chart-of-accounts.md` |
| `/master-data/currency` | CurrencySettingsPage | **DOCUMENTED** | `currencies.md` |

**Classification**

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/master-data/business-processes` | BusinessProcessesPage + BusinessProcessWorkspacePage | **DOCUMENTED** | `business-processes.md` |
| `/master-data/analytics` | AnalyticsCategoriesPage + AnalyticsWorkspacePage | **DOCUMENTED** | `analytics.md` |

### Admin & Settings

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/admin/users` | UsersPage | **DOCUMENTED** | `admin.md` |
| `/admin/roles` | RolesPage | **DOCUMENTED** | `admin.md` |
| `/admin/audit-logs` | AuditLogsPage | **DOCUMENTED** | `admin.md` |
| `/admin/billing` | BillingCenter | **DOCUMENTED** | `admin.md` |
| `/admin/auth` | AdminAuthPage | **DOCUMENTED** | `admin.md` |
| `/admin/branding` | AdminBrandingPage | **DOCUMENTED** | `branding.md` |
| `/settings` | SettingsPage | **DOCUMENTED** | (in admin.md or standalone) |
| `/master-data/operations` | MasterDataOperationsPage | **DOCUMENTED** | `master-data-operations.md` |
| `/master-data/operations/freeze` | MasterDataFreezePage | **DOCUMENTED** | (in master-data-operations) |
| `/master-data/operations/copy` | MasterDataCopyPage | **DOCUMENTED** | (in master-data-operations) |

### Reports

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/ops/reports` | ReportsLandingPage | **DOCUMENTED** | `reports.md` |
| `/ops/reports/top-opex` | TopOpexReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/opex-delta` | OpexDeltaReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/comparison` | ComparisonReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/capex/trend` | CapexBudgetTrendReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/budget-columns-compare` | BudgetColumnsCompareReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/consolidation` | ConsolidationReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/analytics` | AnalyticsCategoryReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/chargeback/global` | GlobalChargebackReport | **DOCUMENTED** | `reports.md` |
| `/ops/reports/chargeback/company` | CompanyChargebackReport | **DOCUMENTED** | `reports.md` |

### Portfolio

| Route | Component | Status | Doc File |
|-------|-----------|--------|----------|
| `/portfolio/requests` | RequestsPage + RequestWorkspacePage | **DOCUMENTED** | `portfolio-requests.md` |
| `/portfolio/projects` | ProjectsPage + ProjectWorkspacePage | **DOCUMENTED** | `portfolio-projects.md` |
| `/portfolio/tasks` | TasksPage + TaskWorkspacePage | **DOCUMENTED** | `tasks.md` |
| `/portfolio/contributors` | ContributorsPage + ContributorWorkspacePage | **DOCUMENTED** | `portfolio-team-members.md` |
| `/portfolio/settings` | SettingsPage | **DOCUMENTED** | `portfolio-settings.md` |
| `/portfolio/reports` | ReportsPage | **DOCUMENTED** | `portfolio-reporting.md` |
| `/portfolio/reports/status-change` | StatusChangeReport | **DOCUMENTED** | `portfolio-reporting.md` |
| `/portfolio/reports/capacity-heatmap` | CapacityHeatmapReport | **DOCUMENTED** | `portfolio-reporting.md` |
| `/portfolio/reports/weekly` | WeeklyReport | **DOCUMENTED** | `portfolio-reporting.md` |
| `/portfolio/planning` | PlanningPage | **PLACEHOLDER** | Coming soon (Phases 08-10) |

### Excluded (Work in Progress or Platform Admin)

| Route | Reason |
|-------|--------|
| `/admin/tenants` | Platform admin only (not tenant-facing) |
| `/admin/coa-templates` | Platform admin only |
| `/admin/standard-accounts` | Platform admin only |
| `/ops/projects` | Placeholder (removed from routes) |
| `/ops/tasks` | Legacy route, redirects to `/portfolio/tasks` |

---

## Remaining Gaps

No gaps remaining — all tenant-facing pages are documented.

---

## Documentation Update Triggers

When these files change, the corresponding documentation may need updates:

| Component Path | Triggers Update To |
|----------------|-------------------|
| `frontend/src/pages/DashboardPage.tsx` | `operations-dashboard.md` |
| `frontend/src/pages/workspace/WorkspaceDashboardPage.tsx` | `my-dashboard.md` |
| `frontend/src/pages/workspace/**/*.tsx` | `my-dashboard.md` |
| `frontend/src/pages/OpexListPage.tsx` | `opex.md` |
| `frontend/src/pages/opex/**/*.tsx` | `opex.md` |
| `frontend/src/pages/CapexPage.tsx` | `capex.md` |
| `frontend/src/pages/capex/**/*.tsx` | `capex.md` |
| `frontend/src/pages/ContractsPage.tsx` | `contracts.md` |
| `frontend/src/pages/contracts/**/*.tsx` | `contracts.md` |
| `frontend/src/pages/CompaniesPage.tsx` | `companies.md` |
| `frontend/src/pages/companies/**/*.tsx` | `companies.md` |
| `frontend/src/pages/it/ApplicationsPage.tsx` | `applications.md` |
| `frontend/src/pages/it/ApplicationWorkspacePage.tsx` | `applications.md` |
| `frontend/src/pages/it/InterfacesPage.tsx` | `interfaces.md` |
| `frontend/src/pages/it/InterfaceWorkspacePage.tsx` | `interfaces.md` |
| `frontend/src/pages/it/InterfaceMapPage.tsx` | `interface-map.md` |
| `frontend/src/pages/it/ConnectionsPage.tsx` | `connections.md` |
| `frontend/src/pages/it/ConnectionWorkspacePage.tsx` | `connections.md` |
| `frontend/src/pages/it/ConnectionMapPage.tsx` | `connection-map.md` |
| `frontend/src/pages/it/AssetsPage.tsx` | `assets.md` |
| `frontend/src/pages/it/AssetWorkspacePage.tsx` | `assets.md` |
| `frontend/src/pages/it/LocationsPage.tsx` | `locations.md` |
| `frontend/src/pages/it/LocationWorkspacePage.tsx` | `locations.md` |
| `frontend/src/pages/UsersPage.tsx` | `admin.md` |
| `frontend/src/pages/admin/RolesPage.tsx` | `admin.md` |
| `frontend/src/pages/admin/AuditLogsPage.tsx` | `admin.md` |
| `frontend/src/pages/TasksPage.tsx` | `tasks.md` |
| `frontend/src/pages/tasks/TaskWorkspacePage.tsx` | `tasks.md` |
| `frontend/src/components/EntityTasksPanel.tsx` | `opex.md`, `capex.md`, `contracts.md`, `portfolio-projects.md` |
| `frontend/src/pages/master-data/ContactsPage.tsx` | `contacts.md` |
| `frontend/src/pages/master-data/ContactWorkspacePage.tsx` | `contacts.md` |
| `frontend/src/pages/master-data/SuppliersPage.tsx` | `suppliers.md` |
| `frontend/src/pages/master-data/SupplierWorkspacePage.tsx` | `suppliers.md` |
| `frontend/src/pages/portfolio/RequestsPage.tsx` | `portfolio-requests.md` |
| `frontend/src/pages/portfolio/RequestWorkspacePage.tsx` | `portfolio-requests.md` |
| `frontend/src/pages/portfolio/ProjectsPage.tsx` | `portfolio-projects.md` |
| `frontend/src/pages/portfolio/ProjectWorkspacePage.tsx` | `portfolio-projects.md` |
| `frontend/src/pages/portfolio/components/ProjectTimeline.tsx` | `portfolio-projects.md` |
| `frontend/src/pages/portfolio/ReportsPage.tsx` | `portfolio-reporting.md` |
| `frontend/src/pages/portfolio/StatusChangeReport.tsx` | `portfolio-reporting.md` |
| `frontend/src/pages/portfolio/CapacityHeatmapReport.tsx` | `portfolio-reporting.md` |
| `frontend/src/pages/portfolio/WeeklyReport.tsx` | `portfolio-reporting.md` |
| `frontend/src/pages/admin/AdminBrandingPage.tsx` | `branding.md` |
| `frontend/src/pages/settings/SettingsPage.tsx` | (settings doc) |
| `frontend/src/pages/portfolio/ContributorTimeLog.tsx` | `portfolio-team-members.md` |
| `frontend/src/pages/portfolio/SettingsPage.tsx` | `portfolio-settings.md` |
| `frontend/src/pages/portfolio/ContributorsPage.tsx` | `portfolio-team-members.md` |
| `frontend/src/pages/portfolio/ContributorWorkspacePage.tsx` | `portfolio-team-members.md` |
| `frontend/src/pages/portfolio/TeamMembersPage.tsx` | `portfolio-team-members.md` |
| `frontend/src/pages/portfolio/TeamMemberWorkspacePage.tsx` | `portfolio-team-members.md` |
| `frontend/src/pages/portfolio/PlanningPage.tsx` | (placeholder - no doc needed yet) |
| `frontend/src/pages/reports/**/*.tsx` | `reports.md` |
| `frontend/src/pages/admin/BillingCenter.tsx` | `admin.md` |
| `frontend/src/pages/admin/AdminAuthPage.tsx` | `admin.md` |

_This mapping enables automated staleness detection._
