import { api, PaginatedResponse, PaginationParams } from '../client';

/**
 * Spend item (OPEX) entity
 */
export interface SpendItem {
  id: string;
  product_name: string;
  description?: string | null;
  supplier_id?: string | null;
  account_id?: string | null;
  currency: string;
  effective_start: string;
  effective_end?: string | null;
  status: 'enabled' | 'disabled';
  owner_it_id?: string | null;
  owner_business_id?: string | null;
  analytics_category_id?: string | null;
  project_id?: string | null;
  notes?: string | null;
  paying_company_id?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Spend item summary for list views
 */
export interface SpendItemSummary extends SpendItem {
  supplier?: { id: string; name: string } | null;
  account?: { id: string; account_number: number; account_name: string } | null;
  analytics_category_name?: string | null;
  main_recipient?: {
    company_id: string;
    department_id: string;
    pct: number;
    label: string;
  } | null;
  versions?: SpendVersionSummary;
  latest_task?: {
    id: string;
    title?: string;
    description?: string;
    status?: string;
    created_at?: string;
  } | null;
  spread_mode_for_y?: 'flat' | 'manual' | null;
  latest_contract_name?: string | null;
  allocation_method_label?: string | null;
  allocation_warning?: string | null;
  paying_company_name?: string | null;
}

/**
 * Spend version summary with totals
 */
export interface SpendVersionSummary {
  yMinus1?: SpendVersionTotals;
  y?: SpendVersionTotals;
  yPlus1?: SpendVersionTotals;
  yPlus2?: SpendVersionTotals;
}

/**
 * Totals for a spend version
 */
export interface SpendVersionTotals {
  year?: number;
  totals: {
    budget: number;
    follow_up: number;
    landing: number;
    revision: number;
  };
  reporting?: {
    budget: number;
    follow_up: number;
    landing: number;
    revision: number;
  };
  version_id?: string;
}

/**
 * CAPEX item entity
 */
export interface CapexItem {
  id: string;
  description: string;
  ppe_type: 'hardware' | 'software';
  investment_type: 'replacement' | 'capacity' | 'productivity' | 'security' | 'conformity' | 'business_growth' | 'other';
  priority: 'mandatory' | 'high' | 'medium' | 'low';
  currency: string;
  effective_start: string;
  effective_end?: string | null;
  status: 'enabled' | 'disabled';
  company_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * CAPEX item summary for list views
 */
export interface CapexItemSummary extends CapexItem {
  company_name?: string | null;
  versions?: CapexVersionSummary;
  spread_mode_for_y?: 'flat' | 'manual' | null;
  allocation_method_label?: string | null;
  next_year_allocation_method_label?: string | null;
  allocation_warning?: string | null;
  latest_task?: {
    id: string;
    title?: string;
    description?: string;
    status?: string;
  } | null;
}

/**
 * CAPEX version summary with totals
 */
export interface CapexVersionSummary {
  yMinus1?: CapexVersionTotals;
  y?: CapexVersionTotals;
  yPlus1?: CapexVersionTotals;
}

/**
 * Totals for a CAPEX version
 */
export interface CapexVersionTotals {
  year?: number;
  totals: {
    budget: number;
    follow_up: number;
    landing: number;
    revision: number;
  };
  reporting?: {
    budget: number;
    follow_up: number;
    landing: number;
    revision: number;
  };
  version_id?: string;
}

/**
 * Allocation entry
 */
export interface Allocation {
  id: string;
  company_id: string;
  department_id: string;
  percentage: number;
  company_name?: string;
  department_name?: string;
}

/**
 * Payload for creating a spend item
 */
export interface CreateSpendItemInput {
  product_name: string;
  description?: string | null;
  supplier_id?: string | null;
  account_id?: string | null;
  currency?: string;
  effective_start?: string;
  effective_end?: string | null;
  status?: 'enabled' | 'disabled';
  owner_it_id?: string | null;
  owner_business_id?: string | null;
  analytics_category_id?: string | null;
  project_id?: string | null;
  paying_company_id?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating a spend item
 */
export type UpdateSpendItemInput = Partial<CreateSpendItemInput>;

/**
 * Payload for creating a CAPEX item
 */
export interface CreateCapexItemInput {
  description: string;
  ppe_type: 'hardware' | 'software';
  investment_type?: 'replacement' | 'capacity' | 'productivity' | 'security' | 'conformity' | 'business_growth' | 'other';
  priority?: 'mandatory' | 'high' | 'medium' | 'low';
  currency?: string;
  effective_start?: string;
  effective_end?: string | null;
  status?: 'enabled' | 'disabled';
  company_id?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating a CAPEX item
 */
export type UpdateCapexItemInput = Partial<CreateCapexItemInput>;

/**
 * Spend summary totals response
 */
export interface SpendTotals {
  yMinus1Budget?: number;
  yMinus1Landing?: number;
  yBudget?: number;
  yRevision?: number;
  yFollowUp?: number;
  yLanding?: number;
  yPlus1Budget?: number;
  yPlus1Revision?: number;
  yPlus2Budget?: number;
}

/**
 * CAPEX summary totals response
 */
export interface CapexTotals {
  yMinus1Landing?: number;
  yBudget?: number;
  yLanding?: number;
  yPlus1Budget?: number;
  reportingCurrency?: string;
}

/**
 * Spend items (OPEX) API endpoints
 */
export const spendApi = {
  /**
   * List spend items summary with pagination and filtering
   */
  list: (params?: PaginationParams & { years?: string }): Promise<PaginatedResponse<SpendItemSummary>> =>
    api.paginated<SpendItemSummary>('/spend-items/summary', params),

  /**
   * Get spend summary totals (for pinned row)
   */
  getTotals: (params?: { q?: string; filters?: string; status?: string; includeDisabled?: string }): Promise<SpendTotals> =>
    api.get<SpendTotals>('/spend-items/summary/totals', { params }),

  /**
   * Get a single spend item by ID
   */
  get: (id: string): Promise<SpendItem> =>
    api.get<SpendItem>(`/spend-items/${id}`),

  /**
   * Create a new spend item
   */
  create: (data: CreateSpendItemInput): Promise<SpendItem> =>
    api.post<SpendItem, CreateSpendItemInput>('/spend-items', data),

  /**
   * Update an existing spend item
   */
  update: (id: string, data: UpdateSpendItemInput): Promise<SpendItem> =>
    api.patch<SpendItem, UpdateSpendItemInput>(`/spend-items/${id}`, data),

  /**
   * Delete a spend item
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/spend-items/${id}`),

  /**
   * Bulk delete spend items
   */
  bulkDelete: (ids: string[]): Promise<{ deleted: number }> =>
    api.post<{ deleted: number }>('/spend-items/bulk', { ids, action: 'delete' }),

  /**
   * Get allocations for a spend item
   */
  getAllocations: (id: string, year?: number): Promise<Allocation[]> =>
    api.get<Allocation[]>(`/spend-items/${id}/allocations`, { params: { year } }),

  /**
   * Update allocations for a spend item
   */
  updateAllocations: (id: string, year: number, allocations: Array<{ company_id: string; department_id: string; percentage: number }>): Promise<void> =>
    api.put(`/spend-items/${id}/allocations`, { year, allocations }),
};

/**
 * CAPEX items API endpoints
 */
export const capexApi = {
  /**
   * List CAPEX items summary with pagination and filtering
   */
  list: (params?: PaginationParams): Promise<PaginatedResponse<CapexItemSummary>> =>
    api.paginated<CapexItemSummary>('/capex-items/summary', params),

  /**
   * Get CAPEX summary totals (for pinned row)
   */
  getTotals: (params?: { q?: string; filters?: string; status?: string; includeDisabled?: string }): Promise<CapexTotals> =>
    api.get<CapexTotals>('/capex-items/summary/totals', { params }),

  /**
   * Get a single CAPEX item by ID
   */
  get: (id: string): Promise<CapexItem> =>
    api.get<CapexItem>(`/capex-items/${id}`),

  /**
   * Create a new CAPEX item
   */
  create: (data: CreateCapexItemInput): Promise<CapexItem> =>
    api.post<CapexItem, CreateCapexItemInput>('/capex-items', data),

  /**
   * Update an existing CAPEX item
   */
  update: (id: string, data: UpdateCapexItemInput): Promise<CapexItem> =>
    api.patch<CapexItem, UpdateCapexItemInput>(`/capex-items/${id}`, data),

  /**
   * Delete a CAPEX item
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/capex-items/${id}`),

  /**
   * Bulk delete CAPEX items
   */
  bulkDelete: (ids: string[]): Promise<{ deleted: number }> =>
    api.post<{ deleted: number }>('/capex-items/bulk', { ids, action: 'delete' }),

  /**
   * Get allocations for a CAPEX item
   */
  getAllocations: (id: string, year?: number): Promise<Allocation[]> =>
    api.get<Allocation[]>(`/capex-items/${id}/allocations`, { params: { year } }),

  /**
   * Update allocations for a CAPEX item
   */
  updateAllocations: (id: string, year: number, allocations: Array<{ company_id: string; department_id: string; percentage: number }>): Promise<void> =>
    api.put(`/capex-items/${id}/allocations`, { year, allocations }),
};
