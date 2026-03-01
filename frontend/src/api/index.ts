/**
 * Type-safe API client and endpoints
 *
 * Usage:
 *   import { api, applicationsApi, spendApi } from '@/api';
 *
 *   // Direct API client usage
 *   const user = await api.get<User>('/users/me');
 *
 *   // Typed endpoint usage
 *   const apps = await applicationsApi.list({ page: 1, limit: 20 });
 *   const app = await applicationsApi.get('app-id');
 */

// Core client
export { ApiClient, api } from './client';
export type {
  PaginatedResponse,
  PaginationParams,
  ApiError,
  AxiosRequestConfig,
} from './client';

// Applications
export { applicationsApi } from './endpoints/applications';
export type {
  Application,
  ApplicationSummary,
  ApplicationInstance,
  ApplicationOwner,
  ApplicationListParams,
  CreateApplicationInput,
  UpdateApplicationInput,
} from './endpoints/applications';

// Portfolio (Projects, Requests, Team Members, Contributors)
export { portfolioApi } from './endpoints/portfolio';
export type {
  Project,
  ProjectSummary,
  ProjectStatus,
  ProjectPriority,
  ProjectScoring,
  Request,
  RequestSummary,
  TeamMember,
  Contributor,
  CreateProjectInput,
  UpdateProjectInput,
  CreateRequestInput,
  UpdateRequestInput,
} from './endpoints/portfolio';

// Spend (OPEX and CAPEX)
export { spendApi, capexApi } from './endpoints/spend';
export type {
  SpendItem,
  SpendItemSummary,
  SpendVersionSummary,
  SpendVersionTotals,
  SpendTotals,
  CapexItem,
  CapexItemSummary,
  CapexVersionSummary,
  CapexVersionTotals,
  CapexTotals,
  Allocation,
  CreateSpendItemInput,
  UpdateSpendItemInput,
  CreateCapexItemInput,
  UpdateCapexItemInput,
} from './endpoints/spend';

// Assets (Servers and Locations)
export { assetsApi, locationsApi } from './endpoints/assets';
export type {
  Asset,
  AssetSummary,
  IpAddressEntry,
  ServerAssignment,
  ClusterMember,
  ClusterSummary,
  ServerConnection,
  Location,
  LocationSummary,
  CreateAssetInput,
  UpdateAssetInput,
  CreateLocationInput,
  UpdateLocationInput,
} from './endpoints/assets';

// Interfaces and Connections
export { interfacesApi, connectionsApi } from './endpoints/interfaces';
export type {
  Interface,
  InterfaceSummary,
  InterfaceBinding,
  BindingSummary,
  Connection,
  ConnectionSummary,
  CreateInterfaceInput,
  UpdateInterfaceInput,
  CreateBindingInput,
  UpdateBindingInput,
  CreateConnectionInput,
  UpdateConnectionInput,
} from './endpoints/interfaces';

// Document export
export { exportDocument } from './endpoints/export';
export type { DocumentExportFormat, ExportDocumentInput, ExportDocumentResult } from './endpoints/export';
