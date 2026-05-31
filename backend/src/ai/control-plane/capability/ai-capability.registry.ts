import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AiMutationPreviewService } from '../../ai-mutation-preview.service';
import { AiToolRegistry } from '../../ai-tool.registry';
import {
  AiExecutionContextWithManager,
  AiToolListItemDto,
} from '../../ai.types';
import { AiProviderToolDef } from '../../providers/ai-provider.types';
import { AiActionRequestService } from '../action-request/ai-action-request.service';
import { AiApprovalService } from '../approval/ai-approval.service';
import { AiAutomationJobCatalogService } from '../automation/ai-automation-job-catalog.service';
import { AiExternalMcpBridgeService } from '../mcp/ai-external-mcp-bridge.service';
import { AiProviderRegistryService } from '../providers/provider-registry.service';
import {
  AUTOMATION_JOB_ALLOWED_LIST_CAPABILITY,
  AUTOMATION_JOB_DRY_RUN_CAPABILITY,
  AUTOMATION_JOB_LAUNCH_APPROVED_CAPABILITY,
  AUTOMATION_JOB_LAUNCH_PREPARE_CAPABILITY,
  AUTOMATION_JOB_OUTPUT_GET_CAPABILITY,
  AUTOMATION_JOB_SCHEMA_GET_CAPABILITY,
  AUTOMATION_JOB_STATUS_GET_CAPABILITY,
  AUTOMATION_PROVIDER_CAPABILITY_VERSION,
  CapabilityContract,
  CapabilityContractSchema,
  CapabilityExecutionContext,
  CapabilityProviderKind,
  CapabilitySurface,
  EXECUTE_APPROVED_PREVIEW_CAPABILITY,
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
} from './capability-contract';
import {
  AdapterResult,
  AutomationLaunchActionPayload,
  TicketInternalNoteActionPayload,
  TicketInternalNoteWriteResult,
} from '../providers/provider.types';

const COMPATIBILITY_CAPABILITY_VERSION = '1.0.0';
const PROVIDER_CAPABILITY_VERSION = '1.0.0';
export { EXECUTE_APPROVED_PREVIEW_CAPABILITY } from './capability-contract';

const ExecuteApprovedPreviewInputSchema = z.object({
  preview_ids: z.array(z.string().trim().uuid()).min(1).max(50),
});

const MAX_INTERNAL_NOTE_CHARS = 4000;

const PrepareInternalNoteInputSchema = z.object({
  ticket_id: z.string().trim().min(1).max(128),
  note_body: z.string().trim().min(1).max(MAX_INTERNAL_NOTE_CHARS),
  provider_key: z.string().trim().min(1).max(128).optional(),
  evidence_ids: z.array(z.string().trim().min(1)).max(100).optional(),
  observation_id: z.string().trim().min(1).optional(),
  recommendation_id: z.string().trim().min(1).optional(),
  decision_id: z.string().trim().min(1).optional(),
  evaluation_id: z.string().trim().min(1).optional(),
}).strict();

const AddApprovedInternalNoteInputSchema = z.object({
  action_request_id: z.string().trim().uuid(),
}).strict();

const AutomationProviderKeySchema = z.string().trim().min(1).max(128).optional();
const AutomationTargetInputSchema = z.object({
  type: z.string().trim().min(1).max(64),
  values: z.array(z.string().trim().min(1).max(256)).min(1).max(50),
}).strict();
const AutomationListInputSchema = z.object({
  provider_key: AutomationProviderKeySchema,
}).strict();
const AutomationJobInputSchema = z.object({
  provider_key: AutomationProviderKeySchema,
  job_key: z.string().trim().min(1).max(128),
}).strict();
const AutomationDryRunInputSchema = z.object({
  provider_key: AutomationProviderKeySchema,
  job_key: z.string().trim().min(1).max(128),
  target: AutomationTargetInputSchema,
  variables: z.record(z.unknown()).default({}),
}).strict();
const AutomationLaunchPrepareInputSchema = z.object({
  provider_key: AutomationProviderKeySchema,
  job_key: z.string().trim().min(1).max(128),
  target: AutomationTargetInputSchema,
  variables: z.record(z.unknown()).default({}),
  evidence_ids: z.array(z.string().trim().min(1)).max(100).optional(),
  recommendation_id: z.string().trim().min(1).optional(),
  decision_id: z.string().trim().min(1).optional(),
  evaluation_id: z.string().trim().min(1).optional(),
}).strict();
const AutomationLaunchApprovedInputSchema = z.object({
  action_request_id: z.string().trim().uuid(),
}).strict();
const AutomationJobRunInputSchema = z.object({
  action_request_id: z.string().trim().uuid(),
  job_run_id: z.string().trim().min(1).max(256).optional(),
}).strict();

type CapabilityHandler = (
  context: AiExecutionContextWithManager,
  input: unknown,
  execution: CapabilityExecutionContext,
) => Promise<unknown>;

export type ResolvedCapability = {
  contract: CapabilityContract;
  handler: CapabilityHandler;
};

function toCapabilitySurface(surface: string): CapabilitySurface {
  if (surface === 'chat' || surface === 'mcp' || surface === 'scheduler' || surface === 'alert' || surface === 'internal') {
    return surface;
  }
  throw new BadRequestException(`Unsupported capability surface: ${surface}`);
}

function compatibilityContract(
  tool: AiToolListItemDto,
  inputSchema: Record<string, unknown>,
): CapabilityContract {
  const effect = tool.read_only ? 'read' : 'propose';
  const riskLevel = tool.read_only ? 'low' : 'medium';
  const mcpEnabled = tool.read_only && tool.surfaces.includes('mcp');
  return CapabilityContractSchema.parse({
    name: tool.name,
    version: COMPATIBILITY_CAPABILITY_VERSION,
    description: tool.description,
    category: tool.category,
    provider_kind: 'kanap_domain' satisfies CapabilityProviderKind,
    supported_surfaces: tool.surfaces.map(toCapabilitySurface),
    input_schema: inputSchema,
    output_schema: { type: 'object' },
    effect,
    risk_level: riskLevel,
    max_autonomy_level: tool.read_only ? 'A1' : 'A2',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: false,
      persist_output: tool.read_only,
      redact_fields: [],
      retention: tool.read_only ? 'standard' : 'audit',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: tool.write_preview?.entity_type ? [tool.write_preview.entity_type] : [],
    timeout_seconds: tool.read_only ? 30 : 60,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: tool.read_only ? 'idempotent' : 'non_idempotent', key_fields: tool.read_only ? ['input'] : undefined },
    rollback: { supported: tool.write_preview?.reversible === true },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: mcpEnabled, read_only: mcpEnabled },
    live_test_safety: tool.read_only ? 'live_read' : 'live_write_gated',
    compatibility: { ai_tool_name: tool.name },
  });
}

function internalExecuteApprovedPreviewContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: EXECUTE_APPROVED_PREVIEW_CAPABILITY,
    version: '1.0.0',
    description: 'Execute one or more approved KANAP mutation previews.',
    category: 'mutation',
    provider_kind: 'kanap_domain',
    supported_surfaces: ['internal'],
    input_schema: {
      type: 'object',
      properties: {
        preview_ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          minItems: 1,
          maxItems: 50,
        },
      },
      required: ['preview_ids'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'write',
    risk_level: 'medium',
    max_autonomy_level: 'A3',
    default_approval: 'human',
    approval_strategy: { mode: 'mutation_preview' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.write'],
    business_resources: ['mutation_previews'],
    timeout_seconds: 120,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['preview_ids'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'live_write_gated',
    compatibility: { ai_tool_name: null },
  });
}

function providerReadContract(input: {
  name: string;
  description: string;
  category: string;
  provider_kind: CapabilityProviderKind;
  input_schema: Record<string, unknown>;
  business_resources: string[];
}): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: input.name,
    version: PROVIDER_CAPABILITY_VERSION,
    description: input.description,
    category: input.category,
    provider_kind: input.provider_kind,
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: input.input_schema,
    output_schema: { type: 'object' },
    effect: 'read',
    risk_level: 'low',
    max_autonomy_level: 'A1',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: false,
      persist_output: true,
      redact_fields: [],
      retention: 'standard',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: input.business_resources,
    timeout_seconds: 30,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['provider_key'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'live_read',
    compatibility: { ai_tool_name: null },
  });
}

function ticketingInternalNotePrepareContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
    version: PROVIDER_CAPABILITY_VERSION,
    description: 'Prepare an approval-gated internal ticket note action request.',
    category: 'provider_ticketing',
    provider_kind: 'ticketing',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string', minLength: 1, maxLength: 128 },
        note_body: { type: 'string', minLength: 1, maxLength: MAX_INTERNAL_NOTE_CHARS },
        provider_key: { type: 'string', minLength: 1, maxLength: 128 },
        evidence_ids: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          maxItems: 100,
        },
        observation_id: { type: 'string', minLength: 1 },
        recommendation_id: { type: 'string', minLength: 1 },
        decision_id: { type: 'string', minLength: 1 },
        evaluation_id: { type: 'string', minLength: 1 },
      },
      required: ['ticket_id', 'note_body'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'propose',
    risk_level: 'low',
    max_autonomy_level: 'A2',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: ['tickets'],
    timeout_seconds: 30,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['provider_key', 'ticket_id', 'note_body'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'mock_only',
    compatibility: { ai_tool_name: null },
  });
}

function ticketingInternalNoteAddApprovedContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
    version: PROVIDER_CAPABILITY_VERSION,
    description: 'Add an internal/private ticket note after a durable approval.',
    category: 'provider_ticketing',
    provider_kind: 'ticketing',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: {
      type: 'object',
      properties: {
        action_request_id: { type: 'string', format: 'uuid' },
      },
      required: ['action_request_id'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'write',
    risk_level: 'medium',
    max_autonomy_level: 'A3',
    default_approval: 'human',
    approval_strategy: { mode: 'action_request' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.write'],
    business_resources: ['tickets'],
    timeout_seconds: 60,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['action_request_id'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'live_write_gated',
    compatibility: { ai_tool_name: null },
  });
}

function automationReadContract(input: {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  timeout_seconds?: number;
}): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: input.name,
    version: AUTOMATION_PROVIDER_CAPABILITY_VERSION,
    description: input.description,
    category: 'provider_automation',
    provider_kind: 'automation',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: input.input_schema,
    output_schema: { type: 'object' },
    effect: 'read',
    risk_level: 'low',
    max_autonomy_level: 'A1',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: false,
      persist_output: true,
      redact_fields: [],
      retention: 'standard',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: ['automation'],
    timeout_seconds: input.timeout_seconds ?? 30,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['provider_key', 'job_key', 'job_run_id'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'mock_only',
    compatibility: { ai_tool_name: null },
  });
}

function automationDryRunContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: AUTOMATION_JOB_DRY_RUN_CAPABILITY,
    version: AUTOMATION_PROVIDER_CAPABILITY_VERSION,
    description: 'Run a catalog-approved AWX automation job in check/dry-run mode.',
    category: 'provider_automation',
    provider_kind: 'automation',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: {
      type: 'object',
      properties: {
        provider_key: { type: 'string', minLength: 1, maxLength: 128 },
        job_key: { type: 'string', minLength: 1, maxLength: 128 },
        target: {
          type: 'object',
          properties: {
            type: { type: 'string', minLength: 1, maxLength: 64 },
            values: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 256 },
              minItems: 1,
              maxItems: 50,
            },
          },
          required: ['type', 'values'],
          additionalProperties: false,
        },
        variables: { type: 'object', additionalProperties: true },
      },
      required: ['job_key', 'target'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'propose',
    risk_level: 'low',
    max_autonomy_level: 'A2',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: ['automation'],
    timeout_seconds: 300,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['provider_key', 'job_key', 'target', 'variables'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'mock_only',
    compatibility: { ai_tool_name: null },
  });
}

function automationLaunchPrepareContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: AUTOMATION_JOB_LAUNCH_PREPARE_CAPABILITY,
    version: AUTOMATION_PROVIDER_CAPABILITY_VERSION,
    description: 'Prepare an approval-gated AWX automation launch action request.',
    category: 'provider_automation',
    provider_kind: 'automation',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: {
      type: 'object',
      properties: {
        provider_key: { type: 'string', minLength: 1, maxLength: 128 },
        job_key: { type: 'string', minLength: 1, maxLength: 128 },
        target: {
          type: 'object',
          properties: {
            type: { type: 'string', minLength: 1, maxLength: 64 },
            values: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 256 },
              minItems: 1,
              maxItems: 50,
            },
          },
          required: ['type', 'values'],
          additionalProperties: false,
        },
        variables: { type: 'object', additionalProperties: true },
        evidence_ids: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          maxItems: 100,
        },
        recommendation_id: { type: 'string', minLength: 1 },
        decision_id: { type: 'string', minLength: 1 },
        evaluation_id: { type: 'string', minLength: 1 },
      },
      required: ['job_key', 'target'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'propose',
    risk_level: 'medium',
    max_autonomy_level: 'A2',
    default_approval: 'none',
    approval_strategy: { mode: 'none' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.surface'],
    business_resources: ['automation'],
    timeout_seconds: 30,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['provider_key', 'job_key', 'target', 'variables'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'mock_only',
    compatibility: { ai_tool_name: null },
  });
}

function automationLaunchApprovedContract(): CapabilityContract {
  return CapabilityContractSchema.parse({
    name: AUTOMATION_JOB_LAUNCH_APPROVED_CAPABILITY,
    version: AUTOMATION_PROVIDER_CAPABILITY_VERSION,
    description: 'Launch an AWX automation job after durable human approval.',
    category: 'provider_automation',
    provider_kind: 'automation',
    supported_surfaces: ['internal', 'scheduler', 'alert'],
    input_schema: {
      type: 'object',
      properties: {
        action_request_id: { type: 'string', format: 'uuid' },
      },
      required: ['action_request_id'],
      additionalProperties: false,
    },
    output_schema: { type: 'object' },
    effect: 'remediate',
    risk_level: 'high',
    max_autonomy_level: 'A3',
    default_approval: 'human',
    approval_strategy: { mode: 'action_request' },
    evidence: {
      persist_input: true,
      persist_output: true,
      redact_fields: [],
      retention: 'audit',
    },
    tenant_permissions: ['ai.write'],
    business_resources: ['automation'],
    timeout_seconds: 600,
    retry_policy: { automatic_retry: false, max_attempts: 1 },
    idempotency: { mode: 'idempotent', key_fields: ['action_request_id'] },
    rollback: { supported: false },
    cost: { estimated_unit_cost: null, metered: false },
    redaction_policy: { fields: [] },
    mcp_exposure: { enabled: false, read_only: false },
    live_test_safety: 'destructive_gated',
    compatibility: { ai_tool_name: null },
  });
}

export function providerCapabilityContracts(): CapabilityContract[] {
  return [
    providerReadContract({
      name: 'monitoring.alert.get',
      description: 'Read a tenant-configured monitoring alert through a provider adapter.',
      category: 'provider_monitoring',
      provider_kind: 'monitoring',
      business_resources: ['infrastructure'],
      input_schema: {
        type: 'object',
        properties: {
          alert_id: { type: 'string', minLength: 1 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['alert_id'],
        additionalProperties: false,
      },
    }),
    providerReadContract({
      name: 'monitoring.sensor.history',
      description: 'Read a bounded monitoring sensor history window through a provider adapter.',
      category: 'provider_monitoring',
      provider_kind: 'monitoring',
      business_resources: ['infrastructure'],
      input_schema: {
        type: 'object',
        properties: {
          sensor_id: { type: 'string', minLength: 1 },
          window_minutes: { type: 'integer', minimum: 5, maximum: 1440 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['sensor_id'],
        additionalProperties: false,
      },
    }),
    providerReadContract({
      name: 'virtualization.vm.health',
      description: 'Read virtual machine health through a virtualization provider adapter.',
      category: 'provider_virtualization',
      provider_kind: 'virtualization',
      business_resources: ['infrastructure'],
      input_schema: {
        type: 'object',
        properties: {
          vm_id: { type: 'string', minLength: 1 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['vm_id'],
        additionalProperties: false,
      },
    }),
    providerReadContract({
      name: 'ticketing.ticket.get',
      description: 'Read a ticket through a ticketing provider adapter.',
      category: 'provider_ticketing',
      provider_kind: 'ticketing',
      business_resources: ['tickets'],
      input_schema: {
        type: 'object',
        properties: {
          ticket_id: { type: 'string', minLength: 1 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['ticket_id'],
        additionalProperties: false,
      },
    }),
    providerReadContract({
      name: 'ticketing.ticket.search_similar',
      description: 'Search for similar tickets through a ticketing provider adapter.',
      category: 'provider_ticketing',
      provider_kind: 'ticketing',
      business_resources: ['tickets'],
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1 },
          ticket_id: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 10 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['query'],
        additionalProperties: false,
      },
    }),
    providerReadContract({
      name: 'directory.user.context',
      description: 'Read user context through a directory provider adapter.',
      category: 'provider_directory',
      provider_kind: 'directory',
      business_resources: ['directory'],
      input_schema: {
        type: 'object',
        properties: {
          user_id_or_email: { type: 'string', minLength: 1 },
          provider_key: { type: 'string', minLength: 1 },
        },
        required: ['user_id_or_email'],
        additionalProperties: false,
      },
    }),
    ticketingInternalNotePrepareContract(),
    ticketingInternalNoteAddApprovedContract(),
    automationReadContract({
      name: AUTOMATION_JOB_ALLOWED_LIST_CAPABILITY,
      description: 'List tenant allowlisted automation jobs.',
      input_schema: {
        type: 'object',
        properties: {
          provider_key: { type: 'string', minLength: 1, maxLength: 128 },
        },
        additionalProperties: false,
      },
    }),
    automationReadContract({
      name: AUTOMATION_JOB_SCHEMA_GET_CAPABILITY,
      description: 'Read the catalog-controlled variable schema for an automation job.',
      input_schema: {
        type: 'object',
        properties: {
          provider_key: { type: 'string', minLength: 1, maxLength: 128 },
          job_key: { type: 'string', minLength: 1, maxLength: 128 },
        },
        required: ['job_key'],
        additionalProperties: false,
      },
    }),
    automationDryRunContract(),
    automationLaunchPrepareContract(),
    automationLaunchApprovedContract(),
    automationReadContract({
      name: AUTOMATION_JOB_STATUS_GET_CAPABILITY,
      description: 'Read the status of a launched automation job run.',
      input_schema: {
        type: 'object',
        properties: {
          action_request_id: { type: 'string', format: 'uuid' },
          job_run_id: { type: 'string', minLength: 1, maxLength: 256 },
        },
        required: ['action_request_id'],
        additionalProperties: false,
      },
    }),
    automationReadContract({
      name: AUTOMATION_JOB_OUTPUT_GET_CAPABILITY,
      description: 'Read bounded, redacted, untrusted output for a launched automation job run.',
      input_schema: {
        type: 'object',
        properties: {
          action_request_id: { type: 'string', format: 'uuid' },
          job_run_id: { type: 'string', minLength: 1, maxLength: 256 },
        },
        required: ['action_request_id'],
        additionalProperties: false,
      },
      timeout_seconds: 60,
    }),
  ];
}

function inputField(input: unknown, field: string): unknown {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)[field]
    : undefined;
}

function stringField(input: unknown, field: string): string {
  const value = inputField(input, field);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`Missing provider capability input field: ${field}`);
  }
  return value.trim();
}

function optionalStringField(input: unknown, field: string): string | null {
  const value = inputField(input, field);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function optionalNumberField(input: unknown, field: string): number | null {
  const value = inputField(input, field);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function providerKey(input: unknown): string {
  return optionalStringField(input, 'provider_key') ?? 'mock';
}

function normalizeInternalNoteBody(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    throw new BadRequestException('Internal note body is required.');
  }
  if (normalized.length > MAX_INTERNAL_NOTE_CHARS) {
    throw new BadRequestException('Internal note body exceeds the allowed length.');
  }
  if (/<[^>]+>/.test(normalized) || /javascript:/i.test(normalized)) {
    throw new BadRequestException('Internal notes must be plain text and cannot contain HTML or scripts.');
  }
  return normalized;
}

function isTicketInternalNotePayload(value: unknown): value is TicketInternalNoteActionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.ticketId === 'string'
    && record.visibility === 'internal'
    && typeof record.body === 'string'
    && record.bodyFormat === 'plain_text';
}

function isAutomationTargetPayload(value: unknown): value is { type: string; values: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.type === 'string'
    && Array.isArray(record.values)
    && record.values.every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAutomationLaunchPayload(value: unknown): value is AutomationLaunchActionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.providerKey === 'string'
    && typeof record.jobKey === 'string'
    && typeof record.catalogVersion === 'string'
    && typeof record.environment === 'string'
    && typeof record.externalJobTemplateRef === 'string'
    && record.variables != null
    && typeof record.variables === 'object'
    && !Array.isArray(record.variables)
    && isAutomationTargetPayload(record.target)
    && typeof record.dryRunRequired === 'boolean'
    && typeof record.blastRadius === 'number'
    && typeof record.timeoutSeconds === 'number';
}

function stringMetadataField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const raw = value[field];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function withActionRequestData<T extends Record<string, unknown>>(
  result: AdapterResult<T>,
  data: Record<string, unknown>,
): AdapterResult<T & Record<string, unknown>> {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    data: {
      ...result.data,
      ...data,
    },
  };
}

@Injectable()
export class AiCapabilityRegistry {
  private readonly internalContracts = new Map<string, CapabilityContract>([
    [EXECUTE_APPROVED_PREVIEW_CAPABILITY, internalExecuteApprovedPreviewContract()],
  ]);
  private readonly providerContracts = new Map<string, CapabilityContract>(
    providerCapabilityContracts().map((contract) => [contract.name, contract]),
  );

  constructor(
    private readonly tools: AiToolRegistry,
    private readonly previews: AiMutationPreviewService,
    private readonly actions: AiActionRequestService,
    private readonly approvals: AiApprovalService,
    private readonly providers: AiProviderRegistryService,
    private readonly automationCatalog: AiAutomationJobCatalogService,
    private readonly externalMcpBridge?: AiExternalMcpBridgeService,
  ) {}

  validateContract(contract: CapabilityContract): CapabilityContract {
    return CapabilityContractSchema.parse(contract);
  }

  async listAvailableToolItems(context: AiExecutionContextWithManager): Promise<AiToolListItemDto[]> {
    return this.tools.listAvailableTools(context);
  }

  async listAvailableCapabilities(context: AiExecutionContextWithManager): Promise<CapabilityContract[]> {
    const tools = await this.listAvailableToolItems(context);
    const schemas = new Map(this.tools.toToolJsonSchemas(tools).map((schema) => [schema.name, schema.parameters]));
    return [
      ...tools.map((tool) => compatibilityContract(tool, schemas.get(tool.name) as Record<string, unknown>)),
      ...Array.from(this.providerContracts.values()),
      ...(this.externalMcpBridge ? await this.externalMcpBridge.listCapabilityContracts(context) : []),
    ];
  }

  async getToolJsonSchemas(context: AiExecutionContextWithManager): Promise<AiProviderToolDef[]> {
    const capabilities = await this.listAvailableCapabilities(context);
    return capabilities
      .filter((capability) => capability.supported_surfaces.includes(toCapabilitySurface(context.surface)))
      .filter((capability) => context.surface !== 'mcp' || (
        capability.effect === 'read'
        && capability.default_approval === 'none'
        && capability.mcp_exposure.enabled
        && capability.mcp_exposure.read_only
      ))
      .map((capability) => ({
        name: capability.name,
        description: capability.description,
        parameters: capability.input_schema,
      }));
  }

  toToolJsonSchemas(tools: Array<Pick<AiToolListItemDto, 'name'>>): AiProviderToolDef[] {
    return this.tools.toToolJsonSchemas(tools);
  }

  async resolve(
    context: AiExecutionContextWithManager,
    capabilityName: string,
    version = COMPATIBILITY_CAPABILITY_VERSION,
  ): Promise<ResolvedCapability> {
    const internal = this.internalContracts.get(capabilityName);
    if (internal) {
      if (version !== internal.version) {
        throw new NotFoundException('Unknown capability version.');
      }
      return {
        contract: internal,
        handler: async (ctx, input) => this.executeApprovedPreview(ctx, input),
      };
    }

    const providerContract = this.providerContracts.get(capabilityName);
    if (providerContract) {
      if (version !== providerContract.version) {
        throw new NotFoundException('Unknown capability version.');
      }
      return {
        contract: providerContract,
        handler: (ctx, input, execution) => this.executeProviderCapability(ctx, providerContract.name, input, execution),
      };
    }

    const externalMcpContract = this.externalMcpBridge
      ? await this.externalMcpBridge.resolveCapabilityContract(context, capabilityName, version)
      : null;
    if (externalMcpContract) {
      return {
        contract: externalMcpContract,
        handler: (ctx, input, execution) => this.externalMcpBridge!.executeTool(ctx, externalMcpContract, input, execution),
      };
    }

    const available = await this.listAvailableCapabilities(context);
    const contract = available.find((capability) =>
      capability.name === capabilityName && capability.version === version,
    );
    if (!contract) {
      throw new NotFoundException('Unknown or unavailable capability.');
    }
    const toolName = contract.compatibility.ai_tool_name;
    if (!toolName) {
      throw new NotFoundException('Capability has no executable handler.');
    }
    return {
      contract,
      handler: async (ctx, input) => this.tools.execute(ctx, toolName, input),
    };
  }

  private async executeApprovedPreview(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = ExecuteApprovedPreviewInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actions = [];
    for (const previewId of parsed.data.preview_ids) {
      const action = await this.actions.ensureForPreview(context, previewId, {
        capabilityName: EXECUTE_APPROVED_PREVIEW_CAPABILITY,
        capabilityVersion: '1.0.0',
        effect: 'write',
      });
      await this.approvals.resolveApprovedAction(context, action);
      actions.push(action);
    }

    const execution = await this.previews.executePreviewsWithFollowUps(
      context,
      parsed.data.preview_ids,
    );

    for (const result of execution.results) {
      const action = actions.find((candidate) => candidate.preview_id === result.preview_id);
      if (!action) {
        continue;
      }
      const status = result.status === 'executed'
        ? 'executed'
        : result.status === 'expired'
          ? 'expired'
          : result.status === 'rejected'
            ? 'rejected'
            : result.status === 'failed'
              ? 'failed'
              : action.status;
      await this.actions.markExecuted(context, action, status, result.error_message ?? null);
    }

    return execution;
  }

  private async executeProviderCapability(
    context: AiExecutionContextWithManager,
    capabilityName: string,
    rawInput: unknown,
    execution: CapabilityExecutionContext,
  ): Promise<unknown> {
    switch (capabilityName) {
      case 'monitoring.alert.get': {
        const provider = await this.providers.monitoring(context, providerKey(rawInput));
        return provider.getAlert(context, { alertId: stringField(rawInput, 'alert_id') });
      }
      case 'monitoring.sensor.history': {
        const provider = await this.providers.monitoring(context, providerKey(rawInput));
        return provider.getSensorHistory(context, {
          sensorId: stringField(rawInput, 'sensor_id'),
          windowMinutes: optionalNumberField(rawInput, 'window_minutes'),
        });
      }
      case 'virtualization.vm.health': {
        const provider = await this.providers.virtualization(context, providerKey(rawInput));
        return provider.getVmHealth(context, { vmId: stringField(rawInput, 'vm_id') });
      }
      case 'ticketing.ticket.get': {
        const provider = await this.providers.ticketing(context, providerKey(rawInput));
        return provider.getTicket(context, { ticketId: stringField(rawInput, 'ticket_id') });
      }
      case 'ticketing.ticket.search_similar': {
        const provider = await this.providers.ticketing(context, providerKey(rawInput));
        return provider.searchSimilarTickets(context, {
          query: stringField(rawInput, 'query'),
          ticketId: optionalStringField(rawInput, 'ticket_id'),
          limit: optionalNumberField(rawInput, 'limit'),
        });
      }
      case TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY:
        return this.prepareInternalNoteAction(context, rawInput, execution);
      case TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY:
        return this.addApprovedInternalNote(context, rawInput);
      case AUTOMATION_JOB_ALLOWED_LIST_CAPABILITY:
        return this.listAllowedAutomationJobs(context, rawInput);
      case AUTOMATION_JOB_SCHEMA_GET_CAPABILITY:
        return this.getAutomationJobSchema(context, rawInput);
      case AUTOMATION_JOB_DRY_RUN_CAPABILITY:
        return this.dryRunAutomationJob(context, rawInput);
      case AUTOMATION_JOB_LAUNCH_PREPARE_CAPABILITY:
        return this.prepareAutomationLaunch(context, rawInput, execution);
      case AUTOMATION_JOB_LAUNCH_APPROVED_CAPABILITY:
        return this.launchApprovedAutomationJob(context, rawInput);
      case AUTOMATION_JOB_STATUS_GET_CAPABILITY:
        return this.getAutomationJobStatus(context, rawInput);
      case AUTOMATION_JOB_OUTPUT_GET_CAPABILITY:
        return this.getAutomationJobOutput(context, rawInput);
      case 'directory.user.context': {
        const provider = await this.providers.directory(context, providerKey(rawInput));
        return provider.getUserContext(context, { userIdOrEmail: stringField(rawInput, 'user_id_or_email') });
      }
      default:
        throw new NotFoundException('Unknown provider capability.');
    }
  }

  private async prepareInternalNoteAction(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
    execution: CapabilityExecutionContext,
  ): Promise<unknown> {
    const parsed = PrepareInternalNoteInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const providerKeyValue = parsed.data.provider_key ?? 'mock';
    const ticketId = parsed.data.ticket_id;
    const noteBody = normalizeInternalNoteBody(parsed.data.note_body);
    const provider = await this.providers.ticketing(context, providerKeyValue);
    const prepared = await provider.prepareInternalNote(context, { ticketId, noteBody });
    if (!prepared.ok) {
      return prepared;
    }

    const actionPayload = prepared.data.actionPayload;
    const idempotencyKey = this.actions.providerActionIdempotencyKey({
      tenantId: context.tenantId,
      providerKey: providerKeyValue,
      ticketId: actionPayload.ticketId,
      noteBody: actionPayload.body,
      capabilityVersion: PROVIDER_CAPABILITY_VERSION,
    });
    const action = await this.actions.createOrEnsureProviderAction(context, {
      runId: execution.runId ?? null,
      toolExecutionId: execution.toolExecutionId ?? null,
      capabilityName: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
      capabilityVersion: PROVIDER_CAPABILITY_VERSION,
      effect: 'write',
      providerKind: 'ticketing',
      providerKey: providerKeyValue,
      targetType: 'ticket',
      targetRef: actionPayload.ticketId,
      actionPayload: actionPayload as unknown as Record<string, unknown>,
      idempotencyKey,
      evidenceIds: parsed.data.evidence_ids ?? null,
      inputSummary: {
        provider_kind: 'ticketing',
        provider_key: providerKeyValue,
        target_type: 'ticket',
        target_ref: actionPayload.ticketId,
        action: 'add_internal_note',
        note_preview: actionPayload.body.slice(0, 240),
      },
      metadata: {
        observation_id: parsed.data.observation_id ?? null,
        recommendation_id: parsed.data.recommendation_id ?? null,
        decision_id: parsed.data.decision_id ?? null,
        evaluation_id: parsed.data.evaluation_id ?? null,
        visibility: 'internal',
      },
    });

    return withActionRequestData(prepared, {
      action_request_id: action.id,
      action_request_status: action.status,
      capability_name: action.capability_name,
      capability_version: action.capability_version,
      idempotency_key: action.idempotency_key,
      target: {
        type: action.target_type,
        ref: action.target_ref,
      },
    });
  }

  private async addApprovedInternalNote(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = AddApprovedInternalNoteInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const action = await this.actions.findProviderActionForExecution(context, parsed.data.action_request_id);
    this.actions.verifyProviderActionIntegrity(action);
    if (!isTicketInternalNotePayload(action.action_payload_json)) {
      throw new BadRequestException('Action request does not contain a valid internal-note payload.');
    }
    const provider = await this.providers.ticketing(context, action.provider_key ?? 'mock');
    const result = await provider.addInternalNote(context, {
      actionPayload: action.action_payload_json,
      idempotencyKey: action.idempotency_key ?? '',
    });
    if (result.ok === false) {
      await this.actions.markExecuted(context, action, 'failed', result.message);
      return result;
    }
    await this.actions.markExecuted(context, action, 'executed', null);
    return result;
  }

  private async listAllowedAutomationJobs(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = AutomationListInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const providerKeyValue = parsed.data.provider_key ?? 'mock';
    const jobs = await this.automationCatalog.listAllowedJobs(context, providerKeyValue);
    const provider = await this.providers.automation(context, providerKeyValue);
    return provider.listAllowedJobs(context, { jobs });
  }

  private async getAutomationJobSchema(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = AutomationJobInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const providerKeyValue = parsed.data.provider_key ?? 'mock';
    const job = await this.automationCatalog.getCatalogJob(context, providerKeyValue, parsed.data.job_key);
    const provider = await this.providers.automation(context, providerKeyValue);
    return provider.getJobSchema(context, { job });
  }

  private async dryRunAutomationJob(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = AutomationDryRunInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const providerKeyValue = parsed.data.provider_key ?? 'mock';
    const job = await this.automationCatalog.getCatalogJob(context, providerKeyValue, parsed.data.job_key);
    this.automationCatalog.assertDryRunEligible(job);
    const variables = this.automationCatalog.validateVariables(job, parsed.data.variables ?? {});
    const target = this.automationCatalog.validateTarget(job, parsed.data.target);
    const provider = await this.providers.automation(context, providerKeyValue);
    return provider.dryRunJob(context, {
      job,
      target: { type: target.type, values: target.values },
      variables,
      dryRunFingerprint: this.automationCatalog.dryRunFingerprint({
        job,
        target: { type: target.type, values: target.values },
        variables,
      }),
    });
  }

  private async prepareAutomationLaunch(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
    execution: CapabilityExecutionContext,
  ): Promise<unknown> {
    const parsed = AutomationLaunchPrepareInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const providerKeyValue = parsed.data.provider_key ?? 'mock';
    const job = await this.automationCatalog.getCatalogJob(context, providerKeyValue, parsed.data.job_key);
    this.automationCatalog.assertLaunchEligible(job);
    const variables = this.automationCatalog.validateVariables(job, parsed.data.variables ?? {});
    const target = this.automationCatalog.validateTarget(job, parsed.data.target);
    const dryRunMatch = job.dryRunRequired
      ? await this.automationCatalog.findMatchingDryRunEvidence(context, job, { type: target.type, values: target.values }, variables)
      : null;
    const idempotencyKey = this.automationCatalog.launchIdempotencyKey({
      tenantId: context.tenantId,
      job,
      target: { type: target.type, values: target.values },
      variables,
      dryRunResultHash: dryRunMatch?.dryRunResultHash ?? null,
    });
    await this.automationCatalog.assertCooldownAllowsPreparation(context, {
      job,
      targetRef: target.targetRef,
      idempotencyKey,
    });
    const actionPayload = this.automationCatalog.buildLaunchPayload({
      job,
      target,
      variables,
      dryRunEvidenceId: dryRunMatch?.evidence.id ?? null,
      dryRunResultHash: dryRunMatch?.dryRunResultHash ?? null,
    });
    const evidenceIds = Array.from(new Set([
      ...(parsed.data.evidence_ids ?? []),
      ...(dryRunMatch ? [dryRunMatch.evidence.id] : []),
    ]));
    const action = await this.actions.createOrEnsureProviderAction(context, {
      runId: execution.runId ?? null,
      toolExecutionId: execution.toolExecutionId ?? null,
      capabilityName: AUTOMATION_JOB_LAUNCH_APPROVED_CAPABILITY,
      capabilityVersion: AUTOMATION_PROVIDER_CAPABILITY_VERSION,
      effect: 'remediate',
      providerKind: 'automation',
      providerKey: providerKeyValue,
      targetType: 'automation_target',
      targetRef: target.targetRef,
      actionPayload: actionPayload as unknown as Record<string, unknown>,
      idempotencyKey,
      evidenceIds,
      inputSummary: {
        provider_kind: 'automation',
        provider_key: providerKeyValue,
        job_key: job.jobKey,
        environment: job.environment,
        target_ref: target.targetRef,
        blast_radius: target.blastRadius,
        dry_run_required: job.dryRunRequired,
      },
      metadata: {
        recommendation_id: parsed.data.recommendation_id ?? null,
        decision_id: parsed.data.decision_id ?? null,
        evaluation_id: parsed.data.evaluation_id ?? null,
        automation: {
          provider_key: providerKeyValue,
          job_key: job.jobKey,
          catalog_version: job.catalogVersion,
          environment: job.environment,
          target_ref: target.targetRef,
          dry_run_evidence_id: dryRunMatch?.evidence.id ?? null,
          dry_run_result_hash: dryRunMatch?.dryRunResultHash ?? null,
          blast_radius: target.blastRadius,
        },
      },
    });

    return {
      ok: true,
      data: {
        action_request_id: action.id,
        action_request_status: action.status,
        capability_name: action.capability_name,
        capability_version: action.capability_version,
        provider_key: providerKeyValue,
        job_key: job.jobKey,
        environment: job.environment,
        target: {
          type: target.type,
          values: target.values,
          ref: target.targetRef,
          blast_radius: target.blastRadius,
        },
        idempotency_key: action.idempotency_key,
        dry_run_required: job.dryRunRequired,
        dry_run_evidence_id: dryRunMatch?.evidence.id ?? null,
      },
      evidence: [],
    };
  }

  private async launchApprovedAutomationJob(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const parsed = AutomationLaunchApprovedInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const action = await this.actions.findProviderActionForExecution(context, parsed.data.action_request_id);
    this.actions.verifyProviderActionIntegrity(action);
    if (!isAutomationLaunchPayload(action.action_payload_json)) {
      throw new BadRequestException('Action request does not contain a valid automation launch payload.');
    }
    const providerKeyValue = action.action_payload_json.providerKey;
    const job = await this.automationCatalog.getCatalogJob(context, providerKeyValue, action.action_payload_json.jobKey);
    this.automationCatalog.assertLaunchEligible(job);
    if (
      job.catalogVersion !== action.action_payload_json.catalogVersion
      || job.environment !== action.action_payload_json.environment
      || job.externalJobTemplateRef !== action.action_payload_json.externalJobTemplateRef
    ) {
      throw new ForbiddenException('Automation catalog entry changed since launch preparation.');
    }
    const variables = this.automationCatalog.validateVariables(job, action.action_payload_json.variables);
    const target = this.automationCatalog.validateTarget(job, action.action_payload_json.target);
    const dryRunMatch = job.dryRunRequired
      ? await this.automationCatalog.findMatchingDryRunEvidence(context, job, { type: target.type, values: target.values }, variables)
      : null;
    if (job.dryRunRequired && dryRunMatch?.dryRunResultHash !== action.action_payload_json.dryRunResultHash) {
      throw new ForbiddenException('Automation dry-run evidence no longer matches the approved launch payload.');
    }
    await this.automationCatalog.assertCooldownAllowsExecution(context, {
      job,
      targetRef: target.targetRef,
      idempotencyKey: action.idempotency_key ?? '',
      currentActionId: action.id,
    });
    const provider = await this.providers.automation(context, providerKeyValue);
    const approval = await this.approvals.resolveApprovedAction(context, action);
    const result = await provider.launchApprovedJob(context, {
      actionPayload: action.action_payload_json,
      approvalId: approval.id,
      idempotencyKey: action.idempotency_key ?? '',
    });
    if (result.ok === false) {
      action.metadata_json = {
        ...(action.metadata_json ?? {}),
        provider_result: {
          status: 'failed',
          error_code: result.errorCode,
          message: result.message,
        },
      };
      await this.actions.markExecuted(context, action, 'failed', result.message);
      return result;
    }
    action.metadata_json = {
      ...(action.metadata_json ?? {}),
      provider_result: {
        job_run_id: result.data.jobRunId,
        status: result.data.status,
        outcome: result.data.alreadyStarted ? 'provider_job_already_started' : 'provider_job_started',
      },
    };
    await this.actions.markExecuted(context, action, 'executed', null);
    return withActionRequestData(result, {
      action_request_id: action.id,
      approval_id: approval.id,
    });
  }

  private async resolveExecutedAutomationLaunch(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<{
    action: Awaited<ReturnType<AiActionRequestService['findProviderActionForExecution']>>;
    actionPayload: AutomationLaunchActionPayload;
    jobRunId: string;
  }> {
    const parsed = AutomationJobRunInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const action = await this.actions.findProviderActionForExecution(context, parsed.data.action_request_id);
    this.actions.verifyProviderActionIntegrity(action);
    if (
      action.capability_name !== AUTOMATION_JOB_LAUNCH_APPROVED_CAPABILITY
      || action.capability_version !== AUTOMATION_PROVIDER_CAPABILITY_VERSION
      || action.effect !== 'remediate'
      || action.provider_kind !== 'automation'
    ) {
      throw new ForbiddenException('Automation job run reads must reference an approved automation launch action.');
    }
    if (action.status !== 'executed') {
      throw new ForbiddenException('Automation job run reads require an executed launch action.');
    }
    if (!isAutomationLaunchPayload(action.action_payload_json)) {
      throw new BadRequestException('Action request does not contain a valid automation launch payload.');
    }
    if (action.provider_key !== action.action_payload_json.providerKey) {
      throw new ForbiddenException('Automation launch action provider scope does not match its payload.');
    }
    await this.automationCatalog.getCatalogJob(context, action.action_payload_json.providerKey, action.action_payload_json.jobKey);
    const providerResult = isRecord(action.metadata_json?.provider_result)
      ? action.metadata_json.provider_result
      : null;
    const jobRunId = stringMetadataField(providerResult, 'job_run_id');
    if (!jobRunId) {
      throw new ForbiddenException('Automation launch action has no recorded provider job run id.');
    }
    if (parsed.data.job_run_id && parsed.data.job_run_id !== jobRunId) {
      throw new ForbiddenException('Requested automation job run id does not match the executed action.');
    }
    return {
      action,
      actionPayload: action.action_payload_json,
      jobRunId,
    };
  }

  private async getAutomationJobStatus(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const resolved = await this.resolveExecutedAutomationLaunch(context, rawInput);
    const provider = await this.providers.automation(context, resolved.actionPayload.providerKey);
    return withActionRequestData(await provider.getJobStatus(context, {
      jobRunId: resolved.jobRunId,
      providerKey: resolved.actionPayload.providerKey,
      jobKey: resolved.actionPayload.jobKey,
    }), {
      action_request_id: resolved.action.id,
    });
  }

  private async getAutomationJobOutput(
    context: AiExecutionContextWithManager,
    rawInput: unknown,
  ): Promise<unknown> {
    const resolved = await this.resolveExecutedAutomationLaunch(context, rawInput);
    const provider = await this.providers.automation(context, resolved.actionPayload.providerKey);
    return withActionRequestData(await provider.getJobOutput(context, {
      jobRunId: resolved.jobRunId,
      providerKey: resolved.actionPayload.providerKey,
      jobKey: resolved.actionPayload.jobKey,
    }), {
      action_request_id: resolved.action.id,
    });
  }
}
