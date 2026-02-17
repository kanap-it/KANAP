import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/ForbiddenPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import OpexListPage from './pages/OpexListPage';
import SpendItemPage from './pages/opex/SpendItemPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import CompaniesPage from './pages/CompaniesPage';
import CompanyWorkspacePage from './pages/companies/CompanyWorkspacePage';
import DepartmentsPage from './pages/DepartmentsPage';
import DepartmentWorkspacePage from './pages/departments/DepartmentWorkspacePage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierWorkspacePage from './pages/suppliers/SupplierWorkspacePage';
import AccountsPage from './pages/AccountsPage';
import AccountWorkspacePage from './pages/accounts/AccountWorkspacePage';
import UsersPage from './pages/UsersPage';
import CapexPage from './pages/CapexPage';
import ProjectsPage from './pages/ProjectsPage';
import CapexItemPage from './pages/capex/CapexItemPage';
import AnalyticsCategoriesPage from './pages/AnalyticsCategoriesPage';
import AnalyticsWorkspacePage from './pages/analytics/AnalyticsWorkspacePage';
import ReportsLandingPage from './pages/reports/ReportsLandingPage';
import TopOpexReport from './pages/reports/TopOpexReport';
import OpexDeltaReport from './pages/reports/OpexDeltaReport';
import ComparisonReport from './pages/reports/ComparisonReport';
import CapexBudgetTrendReport from './pages/reports/CapexBudgetTrendReport';
import BudgetColumnsCompareReport from './pages/reports/BudgetColumnsCompareReport';
import ConsolidationReport from './pages/reports/ConsolidationReport';
import AnalyticsCategoryReport from './pages/reports/AnalyticsCategoryReport';
import GlobalChargebackReport from './pages/reports/GlobalChargebackReport';
import CompanyChargebackReport from './pages/reports/CompanyChargebackReport';
import ContractsPage from './pages/ContractsPage';
import ContractWorkspacePage from './pages/contracts/ContractWorkspacePage';
import BudgetOperationsLandingPage from './pages/operations/BudgetOperationsLandingPage';
import CopyBudgetColumnsPage from './pages/operations/CopyBudgetColumnsPage';
import BudgetColumnResetPage from './pages/operations/BudgetColumnResetPage';
import BudgetFreezePage from './pages/operations/BudgetFreezePage';
import CopyAllocationsPage from './pages/operations/CopyAllocationsPage';
import CurrencySettingsPage from './pages/operations/CurrencySettingsPage';
import TasksPage from './pages/TasksPage';
import TaskWorkspacePage from './pages/tasks/TaskWorkspacePage';
import ContactsPage from './pages/ContactsPage';
import ContactWorkspacePage from './pages/contacts/ContactWorkspacePage';
import BillingCenter from './pages/admin/BillingCenter';
import AdminLanding from './pages/admin/AdminLanding';
import RolesPage from './pages/admin/RolesPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import AdminTenantsPage from './pages/admin/AdminTenantsPage';
import AdminCoaTemplatesPage from './pages/admin/AdminCoaTemplatesPage';
import AdminStandardAccountsPage from './pages/admin/AdminStandardAccountsPage';
import AdminStandardAccountWorkspacePage from './pages/admin/AdminStandardAccountWorkspacePage';
import MasterDataOperationsPage from './pages/admin/MasterDataOperationsPage';
import MasterDataFreezePage from './pages/admin/master-data/MasterDataFreezePage';
import MasterDataCopyPage from './pages/admin/master-data/MasterDataCopyPage';
import MasterDataHomePage from './pages/admin/MasterDataHomePage';
import { TenantProvider, useTenant } from './tenant/TenantContext';
import { FeaturesProvider, useFeatures } from './config/FeaturesContext';
import ChartsOfAccountsPage from './pages/ChartsOfAccountsPage';
import ApplicationsPage from './pages/it/ApplicationsPage';
import ApplicationWorkspacePage from './pages/it/ApplicationWorkspacePage';
import InterfacesPage from './pages/it/InterfacesPage';
import InterfaceWorkspacePage from './pages/it/InterfaceWorkspacePage';
import InterfaceMapPage from './pages/it/InterfaceMapPage';
import ConnectionMapPage from './pages/it/ConnectionMapPage';
import ItOperationsSettingsPage from './pages/it/ItOperationsSettingsPage';
import ConnectionsPage from './pages/it/ConnectionsPage';
import ConnectionWorkspacePage from './pages/it/ConnectionWorkspacePage';
import LocationsPage from './pages/it/LocationsPage';
import LocationWorkspacePage from './pages/it/LocationWorkspacePage';
import AssetsPage from './pages/it/AssetsPage';
import AssetWorkspacePage from './pages/it/AssetWorkspacePage';
import BusinessProcessesPage from './pages/BusinessProcessesPage';
import BusinessProcessWorkspacePage from './pages/business-processes/BusinessProcessWorkspacePage';
import LoginCallbackPage from './pages/LoginCallbackPage';
import AdminAuthPage from './pages/admin/AdminAuthPage';
import PortfolioRequestsPage from './pages/portfolio/RequestsPage';
import PortfolioRequestWorkspacePage from './pages/portfolio/RequestWorkspacePage';
import PortfolioProjectsPage from './pages/portfolio/ProjectsPage';
import PortfolioProjectWorkspacePage from './pages/portfolio/ProjectWorkspacePage';
import PortfolioPlanningPage from './pages/portfolio/PlanningPage';
import PortfolioReportsPage from './pages/portfolio/ReportsPage';
import CapacityHeatmapReport from './pages/portfolio/CapacityHeatmapReport';
import StatusChangeReport from './pages/portfolio/StatusChangeReport';
import WeeklyReport from './pages/portfolio/WeeklyReport';
import PortfolioSettingsPage from './pages/portfolio/SettingsPage';
import PortfolioContributorsPage from './pages/portfolio/ContributorsPage';
import PortfolioContributorWorkspacePage from './pages/portfolio/ContributorWorkspacePage';
import { WorkspaceDashboardPage } from './pages/workspace';
import SettingsPage from './pages/settings/SettingsPage';

function HomeRoute() {
  const { isPlatformHost } = useTenant();
  if (isPlatformHost) return <Navigate to="/admin/tenants" replace />;
  return <WorkspaceDashboardPage />;
}

function PortfolioDefaultRedirect() {
  const { hasLevel } = useAuth();
  if (hasLevel('tasks', 'reader')) return <Navigate to="/portfolio/tasks" replace />;
  if (hasLevel('portfolio_requests', 'reader')) return <Navigate to="/portfolio/requests" replace />;
  if (hasLevel('portfolio_projects', 'reader')) return <Navigate to="/portfolio/projects" replace />;
  if (hasLevel('portfolio_planning', 'reader')) return <Navigate to="/portfolio/planning" replace />;
  if (hasLevel('portfolio_reports', 'reader')) return <Navigate to="/portfolio/reports" replace />;
  if (hasLevel('portfolio_settings', 'reader')) return <Navigate to="/portfolio/contributors" replace />;
  return <Navigate to="/portfolio/tasks" replace />;
}

function LegacyTaskRedirect() {
  const { id, tab } = useParams();
  const [sp] = useSearchParams();
  const qs = sp.toString();
  const to = id
    ? `/portfolio/tasks/${id}${tab ? `/${tab}` : ''}${qs ? `?${qs}` : ''}`
    : '/portfolio/tasks';
  return <Navigate to={to} replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  const { config } = useFeatures();
  const isSingleTenant = config.deploymentMode === 'single-tenant';
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/callback" element={<LoginCallbackPage />} />
        <Route path="/forgot-password" element={config.features.email ? <ForgotPasswordPage /> : <Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/ops" element={<DashboardPage />} />
          <Route path="/ops/opex" element={<OpexListPage />} />
          <Route path="/ops/opex/:id" element={<SpendItemPage />} />
          <Route path="/ops/opex/:id/:tab" element={<SpendItemPage />} />
          <Route path="/ops/capex" element={<CapexPage />} />
          <Route path="/ops/capex/:id" element={<CapexItemPage />} />
          <Route path="/ops/capex/:id/:tab" element={<CapexItemPage />} />
          <Route path="/ops/contracts" element={<ContractsPage />} />
          <Route path="/ops/contracts/:id" element={<ContractWorkspacePage />} />
          <Route path="/ops/contracts/:id/:tab" element={<ContractWorkspacePage />} />
          {/* Legacy ops/tasks routes - redirect to portfolio/tasks */}
          <Route path="/ops/tasks" element={<Navigate to="/portfolio/tasks" replace />} />
          <Route path="/ops/tasks/:id" element={<LegacyTaskRedirect />} />
          <Route path="/ops/tasks/:id/:tab" element={<LegacyTaskRedirect />} />
          <Route path="/it/assets" element={<AssetsPage />} />
          <Route path="/it/assets/:id" element={<AssetWorkspacePage />} />
          <Route path="/it/assets/:id/:tab" element={<AssetWorkspacePage />} />
          <Route path="/ops/reports" element={<ReportsLandingPage />} />
          <Route path="/ops/reports/chargeback" element={<Navigate to="/ops/reports/chargeback/global" replace />} />
          <Route path="/ops/reports/chargeback/global" element={<GlobalChargebackReport />} />
          <Route path="/ops/reports/chargeback/company" element={<CompanyChargebackReport />} />
          <Route path="/ops/reports/top-opex" element={<TopOpexReport />} />
          <Route path="/ops/reports/opex-delta" element={<OpexDeltaReport />} />
          <Route path="/ops/reports/comparison" element={<ComparisonReport />} />
          <Route path="/ops/reports/capex/trend" element={<CapexBudgetTrendReport />} />
          <Route path="/ops/reports/budget-columns-compare" element={<BudgetColumnsCompareReport />} />
          <Route path="/ops/reports/consolidation" element={<ConsolidationReport />} />
          <Route path="/ops/reports/analytics" element={<AnalyticsCategoryReport />} />
          <Route path="/ops/operations" element={<BudgetOperationsLandingPage />} />
          <Route path="/ops/operations/copy-budget-columns" element={<CopyBudgetColumnsPage />} />
          <Route path="/ops/operations/column-init" element={<CopyBudgetColumnsPage />} />
          <Route path="/ops/operations/copy-allocations" element={<CopyAllocationsPage />} />
          <Route path="/ops/operations/column-reset" element={<BudgetColumnResetPage />} />
          <Route path="/ops/operations/freeze" element={<BudgetFreezePage />} />
          {/* Currency Settings moved under Master Data */}
          <Route path="/master-data" element={<MasterDataHomePage />} />
          <Route path="/master-data/coa" element={<ChartsOfAccountsPage />} />
          <Route path="/master-data/companies" element={<CompaniesPage />} />
          <Route path="/master-data/companies/:id" element={<CompanyWorkspacePage />} />
          <Route path="/master-data/companies/:id/:tab" element={<CompanyWorkspacePage />} />
          <Route path="/master-data/departments" element={<DepartmentsPage />} />
          <Route path="/master-data/departments/:id" element={<DepartmentWorkspacePage />} />
          <Route path="/master-data/departments/:id/:tab" element={<DepartmentWorkspacePage />} />
          <Route path="/master-data/suppliers" element={<SuppliersPage />} />
          <Route path="/master-data/suppliers/:id" element={<SupplierWorkspacePage />} />
          <Route path="/master-data/suppliers/:id/:tab" element={<SupplierWorkspacePage />} />
          <Route path="/master-data/contacts" element={<ContactsPage />} />
          <Route path="/master-data/contacts/:id" element={<ContactWorkspacePage />} />
          <Route path="/master-data/contacts/:id/:tab" element={<ContactWorkspacePage />} />
          <Route path="/master-data/accounts" element={<AccountsPage />} />
          <Route path="/master-data/accounts/:id" element={<AccountWorkspacePage />} />
          <Route path="/master-data/accounts/:id/:tab" element={<AccountWorkspacePage />} />
          <Route path="/master-data/analytics" element={<AnalyticsCategoriesPage />} />
          <Route path="/master-data/analytics/:id" element={<AnalyticsWorkspacePage />} />
          <Route path="/master-data/analytics/:id/:tab" element={<AnalyticsWorkspacePage />} />
          <Route path="/master-data/currency" element={<CurrencySettingsPage />} />
          <Route path="/master-data/business-processes" element={<BusinessProcessesPage />} />
          <Route path="/master-data/business-processes/:id" element={<BusinessProcessWorkspacePage />} />
          <Route path="/master-data/business-processes/:id/:tab" element={<BusinessProcessWorkspacePage />} />
          <Route path="/master-data/operations" element={<MasterDataOperationsPage />} />
          <Route path="/master-data/operations/freeze" element={<MasterDataFreezePage />} />
          <Route path="/master-data/operations/copy" element={<MasterDataCopyPage />} />
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          {config.features.billing && <Route path="/admin/billing" element={<BillingCenter />} />}
          {config.features.billing && <Route path="/admin/choose-plan" element={<Navigate to="/admin/billing" replace />} />}
          {config.features.sso && <Route path="/admin/auth" element={<AdminAuthPage />} />}
          {!isSingleTenant && <Route path="/admin/tenants" element={<AdminTenantsPage />} />}
          {!isSingleTenant && <Route path="/admin/coa-templates" element={<AdminCoaTemplatesPage />} />}
          {!isSingleTenant && <Route path="/admin/standard-accounts" element={<AdminStandardAccountsPage />} />}
          {!isSingleTenant && <Route path="/admin/standard-accounts/:templateId/:id" element={<AdminStandardAccountWorkspacePage />} />}
          {!isSingleTenant && <Route path="/admin/standard-accounts/:templateId/:id/:tab" element={<AdminStandardAccountWorkspacePage />} />}
          {!isSingleTenant && <Route path="/admin/standard-accounts/:templateId/:id/*" element={<AdminStandardAccountWorkspacePage />} />}
          {/* IT Operations */}
          <Route path="/it" element={<Navigate to="/it/locations" replace />} />
          <Route path="/it/locations" element={<LocationsPage />} />
          <Route path="/it/locations/:id" element={<LocationWorkspacePage />} />
          <Route path="/it/locations/:id/:tab" element={<LocationWorkspacePage />} />
          <Route path="/it/applications" element={<ApplicationsPage />} />
          <Route path="/it/applications/:id" element={<ApplicationWorkspacePage />} />
          <Route path="/it/applications/:id/:tab" element={<ApplicationWorkspacePage />} />
          <Route path="/it/connections" element={<ConnectionsPage />} />
          <Route path="/it/connections/:id" element={<ConnectionWorkspacePage />} />
          <Route path="/it/connections/:id/:tab" element={<ConnectionWorkspacePage />} />
          <Route path="/it/interfaces" element={<InterfacesPage />} />
          <Route path="/it/interfaces/:id" element={<InterfaceWorkspacePage />} />
          <Route path="/it/interfaces/:id/:tab" element={<InterfaceWorkspacePage />} />
          <Route path="/it/interface-map" element={<InterfaceMapPage />} />
          <Route path="/it/connection-map" element={<ConnectionMapPage />} />
          <Route path="/it/settings" element={<ItOperationsSettingsPage />} />
          {/* Portfolio */}
          <Route path="/portfolio" element={<PortfolioDefaultRedirect />} />
          <Route path="/portfolio/requests" element={<PortfolioRequestsPage />} />
          <Route path="/portfolio/requests/:id" element={<PortfolioRequestWorkspacePage />} />
          <Route path="/portfolio/requests/:id/:tab" element={<PortfolioRequestWorkspacePage />} />
          <Route path="/portfolio/projects" element={<PortfolioProjectsPage />} />
          <Route path="/portfolio/projects/:id" element={<PortfolioProjectWorkspacePage />} />
          <Route path="/portfolio/projects/:id/:tab" element={<PortfolioProjectWorkspacePage />} />
          <Route path="/portfolio/planning" element={<PortfolioPlanningPage />} />
          <Route path="/portfolio/reports" element={<PortfolioReportsPage />} />
          <Route path="/portfolio/reports/capacity-heatmap" element={<CapacityHeatmapReport />} />
          <Route path="/portfolio/reports/status-change" element={<StatusChangeReport />} />
          <Route path="/portfolio/reports/weekly" element={<WeeklyReport />} />
          <Route path="/portfolio/contributors" element={<PortfolioContributorsPage />} />
          <Route path="/portfolio/contributors/:id" element={<PortfolioContributorWorkspacePage />} />
          <Route path="/portfolio/contributors/:id/:tab" element={<PortfolioContributorWorkspacePage />} />
          <Route path="/portfolio/settings" element={<PortfolioSettingsPage />} />
          <Route path="/portfolio/tasks" element={<TasksPage />} />
          <Route path="/portfolio/tasks/:id" element={<TaskWorkspacePage />} />
          <Route path="/portfolio/tasks/:id/:tab" element={<TaskWorkspacePage />} />
          {/* Legacy My Workspace routes - redirect */}
          <Route path="/my" element={<Navigate to="/" replace />} />
          <Route path="/my/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/my/tasks/:id/:tab" element={<LegacyTaskRedirect />} />
          <Route path="/my/tasks/:id" element={<LegacyTaskRedirect />} />
          <Route path="/my/tasks" element={<Navigate to="/portfolio/tasks" replace />} />
          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:tab" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
      </Routes>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <FeaturesProvider>
        <AppRoutes />
      </FeaturesProvider>
    </TenantProvider>
  );
}
