import { api, PaginatedResponse, PaginationParams } from '../client';

/**
 * Interface entity (data flow between applications)
 */
export interface Interface {
  id: string;
  interface_id: string; // Human-readable ID like INT-001
  name: string;
  description?: string | null;
  source_application_id: string;
  target_application_id: string;
  business_process_id?: string | null;
  lifecycle: string;
  criticality: string;
  data_category?: string | null;
  data_class?: 'public' | 'internal' | 'confidential' | 'restricted' | null;
  integration_route_type?: string | null;
  contains_pii: boolean;
  frequency?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Interface summary for list views
 */
export interface InterfaceSummary extends Interface {
  source_application_name: string;
  target_application_name: string;
  business_process_name?: string | null;
  bindings_count?: number;
  environment_coverage?: number;
  binding_environments?: string[];
}

/**
 * Interface binding (environment-specific instance)
 */
export interface InterfaceBinding {
  id: string;
  interface_id: string;
  environment: 'prod' | 'pre_prod' | 'qa' | 'test' | 'dev' | 'sandbox';
  source_instance_id?: string | null;
  target_instance_id?: string | null;
  status: string;
  endpoint_url?: string | null;
  authentication_method?: string | null;
  job_name?: string | null;
  schedule?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Binding summary for list views
 */
export interface BindingSummary extends InterfaceBinding {
  source_instance_label?: string | null;
  target_instance_label?: string | null;
  interface_name?: string;
}

/**
 * Connection entity (server-to-server network flow)
 */
export interface Connection {
  id: string;
  connection_id: string; // Human-readable ID like CONN-001
  name: string;
  description?: string | null;
  topology: 'server_to_server' | 'multi_server';
  lifecycle: string;
  protocols?: string[];
  source_server_id?: string | null;
  destination_server_id?: string | null;
  source_port?: number | null;
  destination_port?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Connection summary for list views
 */
export interface ConnectionSummary extends Connection {
  source_server_name?: string | null;
  destination_server_name?: string | null;
  protocol_labels?: string[];
}

/**
 * Payload for creating an interface
 */
export interface CreateInterfaceInput {
  name: string;
  description?: string | null;
  source_application_id: string;
  target_application_id: string;
  business_process_id?: string | null;
  lifecycle?: string;
  criticality?: string;
  data_category?: string | null;
  data_class?: 'public' | 'internal' | 'confidential' | 'restricted' | null;
  integration_route_type?: string | null;
  contains_pii?: boolean;
  frequency?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating an interface
 */
export type UpdateInterfaceInput = Partial<CreateInterfaceInput>;

/**
 * Payload for creating an interface binding
 */
export interface CreateBindingInput {
  environment: 'prod' | 'pre_prod' | 'qa' | 'test' | 'dev' | 'sandbox';
  source_instance_id?: string | null;
  target_instance_id?: string | null;
  status?: string;
  endpoint_url?: string | null;
  authentication_method?: string | null;
  job_name?: string | null;
  schedule?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating an interface binding
 */
export type UpdateBindingInput = Partial<CreateBindingInput>;

/**
 * Payload for creating a connection
 */
export interface CreateConnectionInput {
  name: string;
  description?: string | null;
  topology?: 'server_to_server' | 'multi_server';
  lifecycle?: string;
  protocols?: string[];
  source_server_id?: string | null;
  destination_server_id?: string | null;
  source_port?: number | null;
  destination_port?: number | null;
  notes?: string | null;
}

/**
 * Payload for updating a connection
 */
export type UpdateConnectionInput = Partial<CreateConnectionInput>;

/**
 * Interfaces API endpoints
 */
export const interfacesApi = {
  /**
   * List interfaces with pagination and filtering
   */
  list: (params?: PaginationParams & {
    lifecycle?: string;
    criticality?: string;
    data_category?: string;
    business_process_id?: string;
    contains_pii?: string;
  }): Promise<PaginatedResponse<InterfaceSummary>> =>
    api.paginated<InterfaceSummary>('/interfaces', params),

  /**
   * Get a single interface by ID
   */
  get: (id: string): Promise<Interface> =>
    api.get<Interface>(`/interfaces/${id}`),

  /**
   * Create a new interface
   */
  create: (data: CreateInterfaceInput): Promise<Interface> =>
    api.post<Interface, CreateInterfaceInput>('/interfaces', data),

  /**
   * Update an existing interface
   */
  update: (id: string, data: UpdateInterfaceInput): Promise<Interface> =>
    api.patch<Interface, UpdateInterfaceInput>(`/interfaces/${id}`, data),

  /**
   * Delete an interface
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/interfaces/${id}`),

  /**
   * Bulk delete interfaces
   */
  bulkDelete: (ids: string[], deleteRelatedBindings?: boolean): Promise<{ deleted: number }> =>
    api.post<{ deleted: number }>('/interfaces/bulk', { ids, action: 'delete', deleteRelatedBindings }),

  /**
   * Duplicate an interface
   */
  duplicate: (id: string, copyBindings?: boolean): Promise<Interface> =>
    api.post<Interface>(`/interfaces/${id}/duplicate`, { copyBindings }),

  /**
   * Get bindings for an interface
   */
  getBindings: (id: string): Promise<InterfaceBinding[]> =>
    api.get<InterfaceBinding[]>(`/interfaces/${id}/bindings`),

  /**
   * Create a binding for an interface
   */
  createBinding: (interfaceId: string, data: CreateBindingInput): Promise<InterfaceBinding> =>
    api.post<InterfaceBinding>(`/interfaces/${interfaceId}/bindings`, data),

  /**
   * Update a binding
   */
  updateBinding: (interfaceId: string, bindingId: string, data: UpdateBindingInput): Promise<InterfaceBinding> =>
    api.patch<InterfaceBinding>(`/interfaces/${interfaceId}/bindings/${bindingId}`, data),

  /**
   * Delete a binding
   */
  deleteBinding: (interfaceId: string, bindingId: string): Promise<void> =>
    api.delete(`/interfaces/${interfaceId}/bindings/${bindingId}`),
};

/**
 * Connections API endpoints
 */
export const connectionsApi = {
  /**
   * List connections with pagination and filtering
   */
  list: (params?: PaginationParams): Promise<PaginatedResponse<ConnectionSummary>> =>
    api.paginated<ConnectionSummary>('/connections', params),

  /**
   * Get a single connection by ID
   */
  get: (id: string): Promise<Connection> =>
    api.get<Connection>(`/connections/${id}`),

  /**
   * Create a new connection
   */
  create: (data: CreateConnectionInput): Promise<Connection> =>
    api.post<Connection, CreateConnectionInput>('/connections', data),

  /**
   * Update an existing connection
   */
  update: (id: string, data: UpdateConnectionInput): Promise<Connection> =>
    api.patch<Connection, UpdateConnectionInput>(`/connections/${id}`, data),

  /**
   * Delete a connection
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/connections/${id}`),

  /**
   * Get connections by server
   */
  byServer: (serverId: string): Promise<PaginatedResponse<ConnectionSummary>> =>
    api.get(`/connections/by-server/${serverId}`),
};
