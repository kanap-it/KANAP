import { api, PaginatedResponse, PaginationParams } from '../client';

/**
 * Application entity
 */
export interface Application {
  id: string;
  name: string;
  category: string;
  supplier_id: string | null;
  editor: string | null;
  lifecycle: string;
  criticality: string;
  environment?: string;
  etl_enabled?: boolean;
  derived_total_users?: number;
  description?: string | null;
  retired_date?: string | null;
  hosting_model?: 'on_premise' | 'saas' | 'public_cloud' | 'private_cloud';
  external_facing?: boolean;
  is_suite?: boolean;
  sso_enabled?: boolean;
  mfa_supported?: boolean;
  contains_pii?: boolean;
  data_class?: 'public' | 'internal' | 'confidential' | 'restricted';
  licensing?: string | null;
  notes?: string | null;
  support_notes?: string | null;
  users_mode?: string | null;
  users_year?: number | null;
  users_override?: number | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Application summary for list views (includes aggregated fields)
 */
export interface ApplicationSummary extends Application {
  supplier_name?: string | null;
  data_residency?: string[];
  owners_business?: string[];
  owners_it?: string[];
  spend_count?: number;
  spend_first_name?: string | null;
  capex_count?: number;
  capex_first_description?: string | null;
  contracts_count?: number;
  contracts_first_name?: string | null;
  suites_count?: number;
  first_suite_name?: string | null;
  components_count?: number;
  first_component_name?: string | null;
  instances?: ApplicationInstance[];
}

/**
 * Application instance (environment)
 */
export interface ApplicationInstance {
  id: string;
  application_id: string;
  environment: 'prod' | 'pre_prod' | 'qa' | 'test' | 'dev' | 'sandbox';
  base_url?: string | null;
  region?: string | null;
  zone?: string | null;
  lifecycle?: 'proposed' | 'active' | 'deprecated' | 'retired';
  sso_enabled?: boolean;
  mfa_supported?: boolean;
  status: string;
  notes?: string | null;
  disabled_at?: string | null;
}

/**
 * Payload for creating an application
 */
export interface CreateApplicationInput {
  name: string;
  category: string;
  supplier_id?: string | null;
  editor?: string | null;
  lifecycle?: string;
  criticality?: string;
  environment?: string;
  description?: string | null;
  hosting_model?: 'on_premise' | 'saas' | 'public_cloud' | 'private_cloud';
  external_facing?: boolean;
  is_suite?: boolean;
  etl_enabled?: boolean;
  sso_enabled?: boolean;
  mfa_supported?: boolean;
  contains_pii?: boolean;
  data_class?: 'public' | 'internal' | 'confidential' | 'restricted';
  licensing?: string | null;
  notes?: string | null;
  support_notes?: string | null;
}

/**
 * Payload for updating an application
 */
export type UpdateApplicationInput = Partial<CreateApplicationInput>;

/**
 * Application owner
 */
export interface ApplicationOwner {
  user_id: string;
  owner_type: 'business' | 'it';
  user_name?: string;
  user_email?: string;
}

/**
 * Application list params with optional include flags
 */
export interface ApplicationListParams extends PaginationParams {
  include?: string; // comma-separated: supplier,owners,residency,counts,structure,instances
  lifecycle?: string;
}

/**
 * Applications API endpoints
 */
export const applicationsApi = {
  /**
   * List applications with pagination and filtering
   */
  list: (params?: ApplicationListParams): Promise<PaginatedResponse<ApplicationSummary>> =>
    api.paginated<ApplicationSummary>('/applications', params),

  /**
   * Get a single application by ID
   */
  get: (id: string, params?: { include?: string }): Promise<Application> =>
    api.get<Application>(`/applications/${id}`, { params }),

  /**
   * Create a new application
   */
  create: (data: CreateApplicationInput): Promise<Application> =>
    api.post<Application, CreateApplicationInput>('/applications', data),

  /**
   * Update an existing application
   */
  update: (id: string, data: UpdateApplicationInput): Promise<Application> =>
    api.patch<Application, UpdateApplicationInput>(`/applications/${id}`, data),

  /**
   * Delete an application
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/applications/${id}`),

  /**
   * Bulk delete applications
   */
  bulkDelete: (ids: string[]): Promise<{ deleted: number }> =>
    api.post<{ deleted: number }>('/applications/bulk', { ids, action: 'delete' }),

  /**
   * Get application instances
   */
  getInstances: (id: string): Promise<ApplicationInstance[]> =>
    api.get<ApplicationInstance[]>(`/applications/${id}/instances`),

  /**
   * Get application owners
   */
  getOwners: (id: string): Promise<ApplicationOwner[]> =>
    api.get<ApplicationOwner[]>(`/applications/${id}/owners`),

  /**
   * Replace all owners for an application
   */
  replaceOwners: (id: string, owners: Array<{ user_id: string; owner_type: 'business' | 'it' }>): Promise<void> =>
    api.post(`/applications/${id}/owners/bulk-replace`, { owners }),

  /**
   * Get suites that include this application
   */
  getSuites: (id: string): Promise<PaginatedResponse<Application>> =>
    api.get<PaginatedResponse<Application>>(`/applications/${id}/suites`),

  /**
   * Replace suite memberships
   */
  replaceSuites: (id: string, suiteIds: string[]): Promise<void> =>
    api.post(`/applications/${id}/suites/bulk-replace`, { suite_ids: suiteIds }),

  /**
   * Get related spend items
   */
  getSpendItems: (id: string): Promise<PaginatedResponse<{ id: string; product_name: string }>> =>
    api.get(`/applications/${id}/spend-items`),

  /**
   * Get related capex items
   */
  getCapexItems: (id: string): Promise<PaginatedResponse<{ id: string; description: string }>> =>
    api.get(`/applications/${id}/capex-items`),

  /**
   * Get related contracts
   */
  getContracts: (id: string): Promise<PaginatedResponse<{ id: string; name: string }>> =>
    api.get(`/applications/${id}/contracts`),
};
