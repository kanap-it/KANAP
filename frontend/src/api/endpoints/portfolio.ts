import { api, PaginatedResponse, PaginationParams } from '../client';

/**
 * Project status values
 */
export type ProjectStatus = 'draft' | 'proposed' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

/**
 * Project priority values
 */
export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Project entity
 */
export interface Project {
  id: string;
  project_id: string; // Human-readable ID like PRJ-001
  name: string;
  description?: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  owner_id?: string | null;
  sponsor_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  actual_cost?: number | null;
  progress?: number; // 0-100
  risk_level?: 'low' | 'medium' | 'high' | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Project summary for list views
 */
export interface ProjectSummary extends Project {
  owner_name?: string | null;
  sponsor_name?: string | null;
  team_members_count?: number;
  tasks_count?: number;
  tasks_completed?: number;
}

/**
 * Request entity (project request/proposal)
 */
export interface Request {
  id: string;
  request_id: string; // Human-readable ID like REQ-001
  title: string;
  description?: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';
  priority: ProjectPriority;
  requester_id?: string | null;
  estimated_effort?: number | null;
  estimated_cost?: number | null;
  business_value?: string | null;
  target_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Request summary for list views
 */
export interface RequestSummary extends Request {
  requester_name?: string | null;
  converted_project_id?: string | null;
}

/**
 * Team member entity
 */
export interface TeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  allocation_pct?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

/**
 * Contributor entity
 */
export interface Contributor {
  id: string;
  name: string;
  email?: string | null;
  external_id?: string | null;
  organization?: string | null;
  role?: string | null;
  notes?: string | null;
  created_at: string;
}

/**
 * Project scoring criteria
 */
export interface ProjectScoring {
  id: string;
  project_id: string;
  strategic_alignment?: number | null;
  business_value?: number | null;
  risk_score?: number | null;
  feasibility?: number | null;
  total_score?: number | null;
  notes?: string | null;
}

/**
 * Payload for creating a project
 */
export interface CreateProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  owner_id?: string | null;
  sponsor_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  notes?: string | null;
}

/**
 * Payload for updating a project
 */
export type UpdateProjectInput = Partial<CreateProjectInput>;

/**
 * Payload for creating a request
 */
export interface CreateRequestInput {
  title: string;
  description?: string | null;
  priority?: ProjectPriority;
  requester_id?: string | null;
  estimated_effort?: number | null;
  estimated_cost?: number | null;
  business_value?: string | null;
  target_date?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating a request
 */
export type UpdateRequestInput = Partial<CreateRequestInput>;

/**
 * Portfolio API endpoints
 */
export const portfolioApi = {
  // Projects
  projects: {
    /**
     * List projects with pagination and filtering
     */
    list: (params?: PaginationParams): Promise<PaginatedResponse<ProjectSummary>> =>
      api.paginated<ProjectSummary>('/projects', params),

    /**
     * Get a single project by ID
     */
    get: (id: string): Promise<Project> =>
      api.get<Project>(`/projects/${id}`),

    /**
     * Create a new project
     */
    create: (data: CreateProjectInput): Promise<Project> =>
      api.post<Project, CreateProjectInput>('/projects', data),

    /**
     * Update an existing project
     */
    update: (id: string, data: UpdateProjectInput): Promise<Project> =>
      api.patch<Project, UpdateProjectInput>(`/projects/${id}`, data),

    /**
     * Delete a project
     */
    delete: (id: string): Promise<void> =>
      api.delete(`/projects/${id}`),

    /**
     * Get project team members
     */
    getTeamMembers: (id: string): Promise<TeamMember[]> =>
      api.get<TeamMember[]>(`/projects/${id}/team-members`),

    /**
     * Add team member to project
     */
    addTeamMember: (projectId: string, data: Omit<TeamMember, 'id' | 'project_id' | 'created_at'>): Promise<TeamMember> =>
      api.post<TeamMember>(`/projects/${projectId}/team-members`, data),

    /**
     * Get project scoring
     */
    getScoring: (id: string): Promise<ProjectScoring> =>
      api.get<ProjectScoring>(`/projects/${id}/scoring`),

    /**
     * Update project scoring
     */
    updateScoring: (id: string, data: Partial<ProjectScoring>): Promise<ProjectScoring> =>
      api.patch<ProjectScoring>(`/projects/${id}/scoring`, data),

    /**
     * Get project dependencies
     */
    getDependencies: (id: string): Promise<{ predecessors: Project[]; successors: Project[] }> =>
      api.get(`/projects/${id}/dependencies`),
  },

  // Requests
  requests: {
    /**
     * List requests with pagination and filtering
     */
    list: (params?: PaginationParams): Promise<PaginatedResponse<RequestSummary>> =>
      api.paginated<RequestSummary>('/requests', params),

    /**
     * Get a single request by ID
     */
    get: (id: string): Promise<Request> =>
      api.get<Request>(`/requests/${id}`),

    /**
     * Create a new request
     */
    create: (data: CreateRequestInput): Promise<Request> =>
      api.post<Request, CreateRequestInput>('/requests', data),

    /**
     * Update an existing request
     */
    update: (id: string, data: UpdateRequestInput): Promise<Request> =>
      api.patch<Request, UpdateRequestInput>(`/requests/${id}`, data),

    /**
     * Delete a request
     */
    delete: (id: string): Promise<void> =>
      api.delete(`/requests/${id}`),

    /**
     * Convert request to project
     */
    convertToProject: (id: string): Promise<Project> =>
      api.post<Project>(`/requests/${id}/convert`),
  },

  // Team Members (standalone management)
  teamMembers: {
    /**
     * List all team members
     */
    list: (params?: PaginationParams): Promise<PaginatedResponse<TeamMember>> =>
      api.paginated<TeamMember>('/team-members', params),

    /**
     * Get a single team member by ID
     */
    get: (id: string): Promise<TeamMember> =>
      api.get<TeamMember>(`/team-members/${id}`),

    /**
     * Update a team member
     */
    update: (id: string, data: Partial<TeamMember>): Promise<TeamMember> =>
      api.patch<TeamMember>(`/team-members/${id}`, data),

    /**
     * Delete a team member
     */
    delete: (id: string): Promise<void> =>
      api.delete(`/team-members/${id}`),
  },

  // Contributors
  contributors: {
    /**
     * List all contributors
     */
    list: (params?: PaginationParams): Promise<PaginatedResponse<Contributor>> =>
      api.paginated<Contributor>('/contributors', params),

    /**
     * Get a single contributor by ID
     */
    get: (id: string): Promise<Contributor> =>
      api.get<Contributor>(`/contributors/${id}`),

    /**
     * Create a new contributor
     */
    create: (data: Omit<Contributor, 'id' | 'created_at'>): Promise<Contributor> =>
      api.post<Contributor>('/contributors', data),

    /**
     * Update a contributor
     */
    update: (id: string, data: Partial<Contributor>): Promise<Contributor> =>
      api.patch<Contributor>(`/contributors/${id}`, data),

    /**
     * Delete a contributor
     */
    delete: (id: string): Promise<void> =>
      api.delete(`/contributors/${id}`),
  },
};
