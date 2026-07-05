import { AiExecutionContextWithManager } from '../../ai.types';

export type ProviderKind =
  | 'ticketing'
  | 'monitoring'
  | 'virtualization'
  | 'directory'
  | 'communication'
  | 'automation'
  | 'kanap_domain';

export type ProviderEnvironment = 'production' | 'staging' | 'sandbox' | 'lab' | 'mock';

export type ProviderCredentialRef =
  | { kind: 'none' }
  | { kind: 'secret_ref'; ref: string; version?: string | null; tenant_id?: string | null }
  | { kind: 'environment'; ref: string; tenant_id?: string | null };

export type AdapterErrorCode =
  | 'not_configured'
  | 'disabled'
  | 'malformed_config'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'timeout'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'invalid_response'
  | 'missing_credentials'
  | 'unsupported_provider_version'
  | 'unsafe_operation'
  | 'unknown';

export type AdapterEvidenceSeed = {
  sourceProvider: string;
  sourceType: string;
  sourceId?: string | null;
  sourceUri?: string | null;
  collectedAt: string;
  trustLevel: 'system' | 'customer_system' | 'external' | 'user_supplied' | 'model_generated';
  summary: string;
  redactedPayload?: unknown;
  rawPayloadRetention?: 'none' | 'redacted' | 'encrypted_debug';
};

export type AdapterResult<T> =
  | {
      ok: true;
      data: T;
      evidence: AdapterEvidenceSeed[];
      providerRequestId?: string | null;
      warnings?: string[];
    }
  | {
      ok: false;
      errorCode: AdapterErrorCode;
      message: string;
      retryable: boolean;
      providerRequestId?: string | null;
      evidence?: AdapterEvidenceSeed[];
    };

export type AdapterHealthResult = {
  ok: boolean;
  providerKind: ProviderKind;
  providerKey: string;
  implementation?: string | null;
  environment?: ProviderEnvironment | string | null;
  checkedAt: string;
  errorCode?: AdapterErrorCode;
  message?: string;
  retryable?: boolean;
  warnings?: string[];
};

export type CapabilityApplicability = {
  available: boolean;
  reasonCode?:
    | 'provider_not_configured'
    | 'provider_disabled'
    | 'missing_credentials'
    | 'missing_permission'
    | 'unsupported_provider_version'
    | 'unsafe_environment'
    | 'policy_disabled'
    | 'emergency_paused'
    | 'malformed_config';
  message?: string;
};

export type ProviderRuntimeCredential = {
  hasSecret(): boolean;
  reveal(): string;
  toJSON(): unknown;
};

export type ProviderAdapterRuntime = {
  providerKind: ProviderKind;
  providerKey: string;
  implementation: string;
  environment: string;
  baseUrl: string | null;
  credential: ProviderRuntimeCredential | null;
  configMetadata: Record<string, unknown> | null;
};

export type ProviderContext = AiExecutionContextWithManager & {
  adapterRuntime?: ProviderAdapterRuntime | null;
};

export type TicketRecord = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  urgency?: string | null;
  type?: string | null;
  requesterId?: string | null;
  requester?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  sourceUri?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  scope?: {
    entityId?: string | null;
    categoryId?: string | null;
  } | null;
  attachments?: TicketAttachmentRef[];
};

export type TicketAttachmentRef = {
  id: string | null;
  kind: 'image' | 'file';
  source: 'ticket_description' | 'ticket_note';
  sourceNoteId?: string | null;
  target: string;
  sourceUri?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  altText?: string | null;
};

export type TicketAttachmentReadResult = {
  attachment: TicketAttachmentRef;
  filename: string | null;
  mimeType: string;
  sizeBytes: number;
  base64Data: string;
};

export type RefItem = {
  value: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export type TicketReferenceEnums = {
  statuses: RefItem[];
  priorities: RefItem[];
  types: RefItem[];
};

export type TicketReferenceCatalogKind = 'category' | 'entity';

export type TicketListScope =
  | {
      mode: 'new_tickets_only';
      createdAfter: string;
      maxResults: number;
      statusValues?: string[];
      entityId?: string | null;
      categoryId?: string | null;
    }
  | {
      // All currently-open tickets (provider-defined non-terminal statuses), bounded by
      // per-cycle caps and an optional last-changed window. Oldest-changed first so a
      // cleanup agent sees the stalest tickets. `agent_involved` selection is NOT a
      // provider mode — it is resolved in the control-plane layer from agent-touched
      // target states, then fetched per id.
      mode: 'all_open';
      maxResults: number;
      statusValues?: string[];
      entityId?: string | null;
      categoryId?: string | null;
      lastChangedBefore?: string | null;
      lastChangedAfter?: string | null;
    };

export type TicketNote = {
  id: string;
  visibility: 'public' | 'internal';
  authorId?: string | null;
  author?: string | null;
  authorRole?: 'requester' | 'support' | 'kanap_agent' | 'unknown';
  body: string;
  bodyHtml?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  updateFingerprint?: string | null;
  attachments?: TicketAttachmentRef[];
};

export type TicketUserAssociation = {
  id: string;
  userId: string;
  label?: string | null;
  role: 'requester' | 'assigned' | 'observer' | 'unknown';
};

export type SimilarTicket = {
  id: string;
  title: string;
  status: string;
  similarity: number;
  resolutionSummary?: string | null;
};

export type TicketClassificationContext = {
  ticketId: string;
  category?: string | null;
  service?: string | null;
  type?: string | null;
  priority?: string | null;
  impact?: string | null;
  urgency?: string | null;
  supported: boolean;
  warnings?: string[];
};

export type TicketLifecycleTransition = {
  key: string;
  label: string;
  requiresApproval: boolean;
  destructive: boolean;
  terminal: boolean;
};

export type TicketLifecycleContext = {
  ticketId: string;
  status: string | null;
  statusLabel?: string | null;
  terminal: boolean;
  allowedTransitions: TicketLifecycleTransition[];
  updatedAt?: string | null;
  supported: boolean;
  warnings?: string[];
};

export type TicketRoutingTarget = {
  kind: 'user' | 'group';
  key: string;
  label: string;
};

export type TicketRoutingContext = {
  ticketId: string;
  requester?: string | null;
  assignee?: string | null;
  group?: string | null;
  supportedAssignmentTargets: TicketRoutingTarget[];
  assignmentSupported: boolean;
  supported: boolean;
  warnings?: string[];
};

export type TicketParticipantContext = {
  ticketId: string;
  requester?: string | null;
  observers: string[];
  watchers: string[];
  viewers: string[];
  participantUpdatesSupported: boolean;
  supported: boolean;
  warnings?: string[];
};

export type TicketClassificationUpdateProposal = {
  type?: string | null;
  priority?: string | null;
  urgency?: string | null;
  impact?: string | null;
  category?: string | null;
  service?: string | null;
};

export type TicketClassificationUpdateActionPayload = {
  ticketId: string;
  action: 'classification_update';
  current: TicketClassificationContext;
  proposed: TicketClassificationUpdateProposal;
  providerFields?: Record<string, unknown>;
  reason: string;
};

export type TicketStatusUpdateActionPayload = {
  ticketId: string;
  action: 'status_update';
  current: TicketLifecycleContext;
  transitionKey: string;
  targetStatus: string;
  targetStatusLabel?: string | null;
  // Terminal (solve/close) transitions are destructive cleanup actions that must
  // always be human-approved and surfaced distinctly in approvals/audit.
  terminal: boolean;
  providerFields?: Record<string, unknown>;
  reason: string;
};

export type TicketAssignmentUpdateActionPayload = {
  ticketId: string;
  action: 'assignment_update';
  current: TicketRoutingContext;
  target: TicketRoutingTarget;
  providerFields?: Record<string, unknown>;
  reason: string;
};

export type TicketParticipantUpdateOperation =
  | 'add_observer'
  | 'remove_observer'
  | 'set_observers';

export type TicketParticipantUpdateActionPayload = {
  ticketId: string;
  action: 'participant_update';
  current: TicketParticipantContext;
  operation: TicketParticipantUpdateOperation;
  participants: TicketRoutingTarget[];
  providerFields?: Record<string, unknown>;
  reason: string;
};

export type TicketProviderActionPrepared<TActionPayload> = {
  actionPayload: TActionPayload;
  summary: string;
};

export type TicketProviderActionWriteResult = {
  ticketId: string;
  summary: string;
  idempotencyKey: string;
  updatedFields: string[];
  alreadyApplied?: boolean;
};

export type TicketInternalNoteActionPayload = {
  ticketId: string;
  visibility: 'internal';
  body: string;
  bodyFormat: 'plain_text';
};

export type TicketPublicReplyActionPayload = {
  ticketId: string;
  visibility: 'public';
  body: string;
  bodyFormat: 'plain_text';
};

export type TicketInternalNotePrepared = {
  actionPayload: TicketInternalNoteActionPayload;
  summary: string;
};

export type TicketPublicReplyPrepared = {
  actionPayload: TicketPublicReplyActionPayload;
  summary: string;
};

export type TicketInternalNoteWriteResult = {
  noteId: string;
  ticketId: string;
  summary: string;
  idempotencyKey: string;
  alreadyApplied?: boolean;
};

export type TicketPublicReplyWriteResult = {
  noteId: string;
  ticketId: string;
  summary: string;
  idempotencyKey: string;
  alreadyApplied?: boolean;
};

export type MonitoringAlert = {
  id: string;
  status: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  sensorId: string;
  vmId?: string | null;
  relatedTicketId?: string | null;
  observedAt: string;
};

export type MonitoringSensorHistory = {
  sensorId: string;
  metric: string;
  unit: string;
  windowMinutes: number;
  points: Array<{ timestamp: string; value: number }>;
  summary: string;
};

export type MonitoringCurrentState = {
  sensorId: string;
  status: string;
  value?: number | null;
  unit?: string | null;
  observedAt: string;
};

export type VirtualMachineHealth = {
  vmId: string;
  name: string;
  status: string;
  hostId: string;
  clusterId: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageLatencyMs: number;
  recentEvents: string[];
  summary: string;
};

export type HostHealth = {
  hostId: string;
  name: string;
  status: string;
  clusterId: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  summary: string;
};

export type ClusterHealth = {
  clusterId: string;
  name: string;
  status: string;
  summary: string;
};

export type DirectoryUserContext = {
  userIdOrEmail: string;
  displayName?: string | null;
  department?: string | null;
  manager?: string | null;
  groups: string[];
  riskNotes: string[];
};

export type DirectoryGroupContext = {
  groupIdOrName: string;
  displayName?: string | null;
  membersCount?: number | null;
  owners: string[];
};

export type AutomationJobSummary = {
  jobKey: string;
  jobId?: string;
  name: string;
  environment: ProviderEnvironment | string;
  dryRunSupported: boolean;
  dryRunRequired: boolean;
  launchAllowed: boolean;
  catalogVersion: string;
  liveTestSafety: string;
};

export type AutomationTargetSelector = {
  type: string;
  values: string[];
};

export type AutomationCatalogJob = {
  id: string;
  providerKey: string;
  jobKey: string;
  catalogVersion: string;
  displayName: string;
  description?: string | null;
  environment: ProviderEnvironment | string;
  externalJobTemplateRef: string;
  enabled: boolean;
  launchAllowed: boolean;
  dryRunSupported: boolean;
  dryRunRequired: boolean;
  variableSchema: Record<string, unknown>;
  targetPolicy: Record<string, unknown>;
  blastRadiusLimit: number;
  cooldownSeconds: number;
  timeoutSeconds: number;
  redactionPolicy: Record<string, unknown>;
  liveTestSafety: string;
  cancelAllowed: boolean;
  metadata?: Record<string, unknown> | null;
};

export type AutomationDryRunResult = {
  dryRunId: string;
  jobKey: string;
  providerKey: string;
  status: 'successful';
  summary: string;
  changed: boolean;
  target: AutomationTargetSelector;
  dryRunFingerprint: string;
  dryRunResultHash: string;
  warnings?: string[];
};

export type AutomationLaunchActionPayload = {
  providerKey: string;
  jobKey: string;
  catalogVersion: string;
  environment: string;
  externalJobTemplateRef: string;
  variables: Record<string, unknown>;
  target: AutomationTargetSelector;
  dryRunRequired: boolean;
  dryRunEvidenceId?: string | null;
  dryRunResultHash?: string | null;
  blastRadius: number;
  timeoutSeconds: number;
  redactionPolicy: Record<string, unknown>;
  liveTestSafety: string;
};

export type AutomationLaunchResult = {
  jobRunId: string;
  jobKey: string;
  providerKey: string;
  status: 'started' | 'already_started';
  summary: string;
  idempotencyKey: string;
  alreadyStarted?: boolean;
};

export type AutomationJobStatusResult = {
  jobRunId: string;
  status: 'pending' | 'running' | 'successful' | 'failed' | 'cancelled';
  summary: string;
  outcome?: string | null;
};

export type AutomationJobOutputResult = {
  jobRunId: string;
  output: string;
  truncated: boolean;
};

export type ProviderActionPlannerProfile = {
  domain_preamble: string;
  action_vocabulary: readonly string[];
  validation_notes?: readonly string[];
};

export type ProviderActionExecutionReadinessAction = {
  id: string;
  tenant_id: string;
  provider_kind: string | null;
  provider_key: string | null;
  target_type: string | null;
  target_id: string | null;
  target_ref: string | null;
  capability_name: string;
  capability_version: string;
  status: string;
  action_payload_json?: unknown;
  metadata_json?: unknown;
};

export type ProviderActionExecutionReadiness = {
  action_request_id: string;
  blocked_reason: string | null;
  requires_sandbox_write_target?: boolean;
  sandbox_write_target_ref?: string | null;
};

export interface ProviderBase {
  readonly kind: ProviderKind;
  readonly providerKey: string;
  readonly actionPlannerProfile?: ProviderActionPlannerProfile;
  health(context: ProviderContext): Promise<AdapterHealthResult>;
  applicability(context: ProviderContext): Promise<CapabilityApplicability>;
  executionReadinessForActions?(
    context: ProviderContext,
    input: { actions: ProviderActionExecutionReadinessAction[] },
  ): Promise<ProviderActionExecutionReadiness[]>;
}

export interface TicketingProvider extends ProviderBase {
  getTicket(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketRecord>>;
  searchSimilarTickets(context: ProviderContext, input: { query: string; ticketId?: string | null; limit?: number | null }): Promise<AdapterResult<{ tickets: SimilarTicket[] }>>;
  listTicketNotes(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<{ notes: TicketNote[] }>>;
  readTicketAttachment(context: ProviderContext, input: { ticketId: string; target: string; source?: TicketAttachmentRef['source'] | null; sourceNoteId?: string | null }): Promise<AdapterResult<TicketAttachmentReadResult>>;
  listTicketsForScope(context: ProviderContext, input: { scope: TicketListScope }): Promise<AdapterResult<{ tickets: TicketRecord[] }>>;
  describeReferenceEnums(context: ProviderContext): Promise<AdapterResult<TicketReferenceEnums>>;
  searchReferenceCatalog(context: ProviderContext, input: { kind: TicketReferenceCatalogKind; query?: string | null; limit: number }): Promise<AdapterResult<{ items: RefItem[] }>>;
  getTicketClassificationContext(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketClassificationContext>>;
  getTicketLifecycleContext(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketLifecycleContext>>;
  getTicketRoutingContext(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketRoutingContext>>;
  getTicketParticipantContext(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketParticipantContext>>;
  prepareTicketClassificationUpdate(context: ProviderContext, input: {
    ticketId: string;
    proposed: TicketClassificationUpdateProposal;
    reason: string;
  }): Promise<AdapterResult<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>>;
  updateTicketClassification(context: ProviderContext, input: {
    actionPayload: TicketClassificationUpdateActionPayload;
    idempotencyKey: string;
  }): Promise<AdapterResult<TicketProviderActionWriteResult>>;
  prepareTicketStatusUpdate(context: ProviderContext, input: {
    ticketId: string;
    transitionKey: string;
    reason: string;
  }): Promise<AdapterResult<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>>;
  updateTicketStatus(context: ProviderContext, input: {
    actionPayload: TicketStatusUpdateActionPayload;
    idempotencyKey: string;
  }): Promise<AdapterResult<TicketProviderActionWriteResult>>;
  prepareTicketAssignmentUpdate(context: ProviderContext, input: {
    ticketId: string;
    target: TicketRoutingTarget;
    reason: string;
  }): Promise<AdapterResult<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>>;
  updateTicketAssignment(context: ProviderContext, input: {
    actionPayload: TicketAssignmentUpdateActionPayload;
    idempotencyKey: string;
  }): Promise<AdapterResult<TicketProviderActionWriteResult>>;
  prepareTicketParticipantUpdate(context: ProviderContext, input: {
    ticketId: string;
    operation: TicketParticipantUpdateOperation;
    participants: TicketRoutingTarget[];
    reason: string;
  }): Promise<AdapterResult<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>>;
  updateTicketParticipants(context: ProviderContext, input: {
    actionPayload: TicketParticipantUpdateActionPayload;
    idempotencyKey: string;
  }): Promise<AdapterResult<TicketProviderActionWriteResult>>;
  prepareInternalNote(context: ProviderContext, input: { ticketId: string; noteBody: string }): Promise<AdapterResult<TicketInternalNotePrepared>>;
  addInternalNote(context: ProviderContext, input: { actionPayload: TicketInternalNoteActionPayload; idempotencyKey: string }): Promise<AdapterResult<TicketInternalNoteWriteResult>>;
  preparePublicReply(context: ProviderContext, input: { ticketId: string; replyBody: string }): Promise<AdapterResult<TicketPublicReplyPrepared>>;
  addPublicReply(context: ProviderContext, input: { actionPayload: TicketPublicReplyActionPayload; idempotencyKey: string }): Promise<AdapterResult<TicketPublicReplyWriteResult>>;
}

export interface MonitoringProvider extends ProviderBase {
  getAlert(context: ProviderContext, input: { alertId: string }): Promise<AdapterResult<MonitoringAlert>>;
  getSensorHistory(context: ProviderContext, input: { sensorId: string; windowMinutes?: number | null }): Promise<AdapterResult<MonitoringSensorHistory>>;
  getCurrentState(context: ProviderContext, input: { sensorId: string }): Promise<AdapterResult<MonitoringCurrentState>>;
  listRelatedAlerts(context: ProviderContext, input: { sensorId: string; limit?: number | null }): Promise<AdapterResult<{ alerts: MonitoringAlert[] }>>;
}

export interface VirtualizationProvider extends ProviderBase {
  getVmHealth(context: ProviderContext, input: { vmId: string }): Promise<AdapterResult<VirtualMachineHealth>>;
  getHostHealth(context: ProviderContext, input: { hostId: string }): Promise<AdapterResult<HostHealth>>;
  getClusterHealth(context: ProviderContext, input: { clusterId: string }): Promise<AdapterResult<ClusterHealth>>;
  getRecentEvents(context: ProviderContext, input: { vmId?: string | null; hostId?: string | null; limit?: number | null }): Promise<AdapterResult<{ events: string[] }>>;
  getResourceUsageSummary(context: ProviderContext, input: { vmId?: string | null; hostId?: string | null }): Promise<AdapterResult<{ summary: string }>>;
}

export interface DirectoryProvider extends ProviderBase {
  getUserContext(context: ProviderContext, input: { userIdOrEmail: string }): Promise<AdapterResult<DirectoryUserContext>>;
  getGroupContext(context: ProviderContext, input: { groupIdOrName: string }): Promise<AdapterResult<DirectoryGroupContext>>;
  validateIdentityRelation(context: ProviderContext, input: { userIdOrEmail: string; ticketId?: string | null }): Promise<AdapterResult<{ related: boolean; summary: string }>>;
}

export interface CommunicationProvider extends ProviderBase {
  postApprovalRequest(context: ProviderContext, input: { channelRef: string; templateId: string; actionRequestId: string }): Promise<AdapterResult<{ messageId: string }>>;
  postStatusUpdate(context: ProviderContext, input: { channelRef: string; templateId: string; summary: string }): Promise<AdapterResult<{ messageId: string }>>;
}

export interface AutomationProvider extends ProviderBase {
  listAllowedJobs(context: ProviderContext, input: { jobs: AutomationCatalogJob[] }): Promise<AdapterResult<{ jobs: AutomationJobSummary[] }>>;
  getJobSchema(context: ProviderContext, input: { job: AutomationCatalogJob }): Promise<AdapterResult<{ jobKey: string; schema: Record<string, unknown> }>>;
  getJobStatus(context: ProviderContext, input: { jobRunId: string; providerKey?: string | null; jobKey?: string | null }): Promise<AdapterResult<AutomationJobStatusResult>>;
  getJobOutput(context: ProviderContext, input: { jobRunId: string; providerKey?: string | null; jobKey?: string | null }): Promise<AdapterResult<AutomationJobOutputResult>>;
  dryRunJob(context: ProviderContext, input: {
    job: AutomationCatalogJob;
    target: AutomationTargetSelector;
    variables: Record<string, unknown>;
    dryRunFingerprint: string;
  }): Promise<AdapterResult<AutomationDryRunResult>>;
  launchApprovedJob(context: ProviderContext, input: {
    actionPayload: AutomationLaunchActionPayload;
    approvalId: string;
    idempotencyKey: string;
  }): Promise<AdapterResult<AutomationLaunchResult>>;
  cancelJob(context: ProviderContext, input: { jobRunId: string }): Promise<AdapterResult<{ cancelled: boolean }>>;
}

export interface KanapDomainProvider extends ProviderBase {
  resolveOperationalContext(context: ProviderContext, input: { assetId?: string | null; applicationId?: string | null }): Promise<AdapterResult<{ summary: string }>>;
}
