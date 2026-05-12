import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AiAttachmentService } from './ai-attachment.service';
import { AiConversationService } from './ai-conversation.service';
import { AiMutationPreviewService } from './ai-mutation-preview.service';
import { AiPolicyService } from './ai-policy.service';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettingsService } from './ai-settings.service';
import { AiSystemPromptService } from './ai-system-prompt.service';
import { AiToolRegistry } from './ai-tool.registry';
import {
  AiContextBudgetSectionBreakdown,
  estimateToolSchemaBreakdown,
  prepareAiProviderMessages,
  withToolSchemaBreakdown,
} from './ai-context-budget.helper';
import {
  filterToolListForProfile,
  selectAiContextProfileForTurn,
} from './ai-context-profile';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import {
  AiProviderAdapter,
  AiProviderImageAttachment,
  AiProviderMessage,
  AiProviderToolDef,
  AiProviderToolCall,
  AiStreamEvent,
} from './providers/ai-provider.types';
import { addUsage, cloneUsage, isAbortError, tryParseToolCallArguments } from './providers/streaming.util';
import { isOpenAiReasoningModel } from './providers/openai-stream.util';
import {
  AI_QUERY_ENTITY_TYPES,
  AiChatActivityPhase,
  AiChatContextItemDto,
  AiChatContextSummaryDto,
  AiBuiltinUsageDto,
  AiExecutionContext,
  AiExecutionContextWithManager,
  AiMutationPreviewDto,
  AiTokenUsage,
  ChatStreamEvent,
} from './ai.types';
import { buildStructuredToolResultValidation } from './ai-tool-result-validation.util';
import { PlatformAiConfigService } from './platform/platform-ai-config.service';
import { AiBuiltinUsageService } from './platform/ai-builtin-usage.service';

const MAX_TOOL_ITERATIONS = 20;
/**
 * Per-turn output cap. The previous 4096 was too tight: when a write tool such as
 * create_document or update_document_content streams its arguments (the document
 * body lives inside the tool_call JSON), the model would hit finish_reason='length'
 * mid-arguments and the orchestrator would surface "Model output was truncated
 * before the tool call completed.". 16K covers ~12k words of markdown, which is
 * enough for the documents Plaid produces in practice. Modern providers (Anthropic
 * Claude 3.5+, GPT-4o, qwen3-* with vLLM) all support at least this much output.
 * Operators can override via env if their model needs more or less.
 */
const DEFAULT_MAX_TOKENS = parsePositiveIntEnv(process.env.AI_CHAT_MAX_TOKENS, 16384);
const OPENAI_REASONING_MAX_TOKENS = parsePositiveIntEnv(
  process.env.AI_CHAT_REASONING_MAX_TOKENS,
  Math.max(DEFAULT_MAX_TOKENS, 16384),
);

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const DEFAULT_CHAT_PROVIDER_TIMEOUT_MS = 300_000;
const APPROVE_MARKER_RE = /^\[APPROVE:([0-9a-f-]{36})\]$/i;
const REJECT_MARKER_RE = /^\[REJECT:([0-9a-f-]{36})\]$/i;
/** Strip base64 data-URI images from text to avoid blowing up the LLM context. */
function stripBase64Images(text: string): string {
  // Markdown: ![alt](data:image/...;base64,...)
  text = text.replace(/!\[(?:\\.|[^\]\\])*\]\(data:image\/[^;]*;base64,[^)]+\)/gi, '[image removed]');
  // HTML: <img ... src="data:image/...;base64,..." ...>
  text = text.replace(/<img\b[^>]*\bsrc=(['"])data:image\/[^;]*;base64,[^'"]*\1[^>]*>/gi, '[image removed]');
  return text;
}

type ChatStreamParams = {
  context: AiExecutionContext;
  conversationId?: string | null;
  userMessage: string;
  /** Attachment ids that have already been uploaded for the current user message (multimodal). */
  attachmentIds?: string[] | null;
  /**
   * Edit/regenerate support: when set, the orchestrator deletes this message and every
   * message persisted after it in the same conversation BEFORE running the new turn.
   * - Edit  flow: client passes the user message id + a non-empty userMessage. The old
   *   user msg + all following are wiped, then the new userMessage is persisted as the
   *   replacement, then we stream a fresh assistant reply.
   * - Regen flow: client passes the assistant message id + an empty userMessage. The
   *   old assistant (and anything after) is wiped; no new user msg is persisted (the
   *   prior user msg already sits at the tail of the history); the LLM re-runs against
   *   that history.
   */
  truncateFromMessageId?: string | null;
  signal?: AbortSignal | null;
};

type CurrentUserPromptContext = {
  displayName: string;
  email: string | null;
  roleNames: string[];
  teamName: string | null;
};

type StreamUsage = {
  input_tokens: number;
  output_tokens: number;
};

type ApprovalAction =
  | { action: 'approve'; previewId: string }
  | { action: 'reject'; previewId: string };

type PreparedChatRequest = {
  context: AiExecutionContext;
  inputConversationId?: string | null;
  userMessage: string;
  attachmentIds?: string[] | null;
  truncateFromMessageId?: string | null;
  approvalAction: ApprovalAction | null;
  providerSource: 'builtin' | 'custom';
  provider: AiProviderAdapter;
  model: string;
  apiKey: string | null;
  endpointUrl: string | null;
  tenantName: string;
  builtinRateLimits?: {
    tenantPerMinute: number;
    userPerHour: number;
  };
};

type StreamPreparationResult = {
  conversationId: string;
  title: string;
  providerMessages: AiProviderMessage[];
  tools: AiProviderToolDef[];
  systemPromptText: string;
  systemPromptSections: AiContextBudgetSectionBreakdown[];
  preStreamEvents: ChatStreamEvent[];
  approvalAssistantText: string | null;
  contextSummary: AiChatContextSummaryDto;
};

function buildToolCallSignature(toolCalls: Array<{ name: string; arguments: string }>): string {
  return toolCalls
    .map((toolCall) => `${toolCall.name}\u0000${toolCall.arguments}`)
    .join('\u0001');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Frontend deep-link patterns keyed by the entity_type stored on a mutation preview's
 * target. When the user approves a mutation, the executed-state summary contains the
 * entity ref (e.g. "Created DOC-152.") and we rewrite that ref into a markdown link so
 * the assistant's confirmation is one click away from the artifact.
 *
 * Keep this in sync with frontend/src/App.tsx routes. Sub-entities of master-data
 * such as accounts/chart_of_accounts/analytics_categories don't have workspace pages
 * yet — leave them out so we don't surface dead links.
 */
const ENTITY_URL_BUILDERS: Record<string, (id: string) => string> = {
  documents: (id) => `/knowledge/${id}`,
  tasks: (id) => `/portfolio/tasks/${id}`,
  projects: (id) => `/portfolio/projects/${id}`,
  requests: (id) => `/portfolio/requests/${id}`,
  applications: (id) => `/it/applications/${id}`,
  assets: (id) => `/it/assets/${id}`,
  connections: (id) => `/it/connections/${id}`,
  interfaces: (id) => `/it/interfaces/${id}`,
  locations: (id) => `/it/locations/${id}`,
  contracts: (id) => `/ops/contracts/${id}`,
  capex_items: (id) => `/ops/capex/${id}`,
  companies: (id) => `/master-data/companies/${id}`,
  contacts: (id) => `/master-data/contacts/${id}`,
  departments: (id) => `/master-data/departments/${id}`,
  suppliers: (id) => `/master-data/suppliers/${id}`,
  business_processes: (id) => `/master-data/business-processes/${id}`,
};

const ENTITY_TYPE_FROM_URL_PREFIX: Array<{ prefix: string; entityType: string }> = [
  { prefix: '/knowledge/', entityType: 'documents' },
  { prefix: '/portfolio/tasks/', entityType: 'tasks' },
  { prefix: '/portfolio/projects/', entityType: 'projects' },
  { prefix: '/portfolio/requests/', entityType: 'requests' },
  { prefix: '/it/applications/', entityType: 'applications' },
  { prefix: '/it/assets/', entityType: 'assets' },
  { prefix: '/it/connections/', entityType: 'connections' },
  { prefix: '/it/interfaces/', entityType: 'interfaces' },
  { prefix: '/it/locations/', entityType: 'locations' },
  { prefix: '/ops/contracts/', entityType: 'contracts' },
  { prefix: '/ops/capex/', entityType: 'capex_items' },
  { prefix: '/master-data/companies/', entityType: 'companies' },
  { prefix: '/master-data/contacts/', entityType: 'contacts' },
  { prefix: '/master-data/departments/', entityType: 'departments' },
  { prefix: '/master-data/suppliers/', entityType: 'suppliers' },
  { prefix: '/master-data/business-processes/', entityType: 'business_processes' },
];

function normalizeContextLabel(value: unknown, fallback = 'Item'): string {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.slice(0, 120) || fallback;
}

function inferEntityTypeFromUrl(url: string): string | null {
  const match = ENTITY_TYPE_FROM_URL_PREFIX.find((entry) => url.startsWith(entry.prefix));
  return match?.entityType ?? null;
}

function extractMentionContextItems(text: string): AiChatContextItemDto[] {
  const items: AiChatContextItemDto[] = [];
  const seen = new Set<string>();
  const markdownLinkRe = /\[([^\]]{1,160})\]\((\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownLinkRe.exec(text)) != null) {
    const [, rawLabel, rawUrl] = match;
    const entityType = inferEntityTypeFromUrl(rawUrl);
    if (!entityType) {
      continue;
    }
    const label = normalizeContextLabel(rawLabel);
    const key = `${entityType}:${label}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    items.push({
      kind: 'mention',
      label,
      entity_type: entityType,
      ref: label.match(/^[A-Z]+-\d+$/) ? label : null,
    });
  }
  return items.slice(0, 12);
}

function formatAttachmentDetail(attachment: {
  kind?: string | null;
  mime_type?: string | null;
  size?: number | null;
}): string {
  const kind = normalizeContextLabel(attachment.kind || attachment.mime_type || 'attachment', 'attachment');
  const size = Number(attachment.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return kind;
  }
  if (size >= 1024 * 1024) {
    return `${kind}, ${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
  }
  if (size >= 1024) {
    return `${kind}, ${Math.round(size / 1024)} KB`;
  }
  return `${kind}, ${size} B`;
}

function attachmentContextItems(attachments: Array<{
  original_filename?: string | null;
  kind?: string | null;
  mime_type?: string | null;
  size?: number | null;
}>): AiChatContextItemDto[] {
  return attachments.slice(0, 8).map((attachment) => ({
    kind: 'attachment',
    label: normalizeContextLabel(attachment.original_filename, 'Image'),
    detail: formatAttachmentDetail(attachment),
  }));
}

function previewContextItems(previews: AiMutationPreviewDto[]): AiChatContextItemDto[] {
  return previews.slice(-8).map((preview) => {
    const label = normalizeContextLabel(
      preview.target?.ref || preview.target?.title || preview.summary || preview.tool_name,
      preview.tool_name,
    );
    return {
      kind: 'preview',
      label,
      detail: normalizeContextLabel(preview.tool_name.replace(/_/g, ' '), 'preview'),
      entity_type: preview.target?.entity_type ?? null,
      ref: preview.target?.ref ?? null,
      status: preview.status,
    };
  });
}

function toolActivityPhase(toolName: string): AiChatActivityPhase {
  if ([
    'search_all',
    'query_entities',
    'aggregate_entities',
    'describe_entity_filters',
    'get_filter_values',
  ].includes(toolName)) {
    return 'searching_entities';
  }
  if (['get_entity_detail', 'get_entity_context', 'get_entity_comments'].includes(toolName)) {
    return 'reading_context';
  }
  if (toolName === 'search_knowledge') {
    return 'searching_knowledge';
  }
  if (toolName === 'get_document') {
    return 'reading_document';
  }
  if (toolName === 'web_search') {
    return 'searching_web';
  }
  if (toolName === 'undo_preview' || toolName.startsWith('create_') || toolName.startsWith('update_') || toolName.startsWith('add_') || toolName.startsWith('import_') || toolName.startsWith('write_')) {
    return 'preparing_change';
  }
  return 'using_tool';
}

function resultEntityItem(item: any, fallbackKind: AiChatContextItemDto['kind']): AiChatContextItemDto | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const entityType = typeof item.type === 'string'
    ? item.type
    : typeof item.entity_type === 'string'
      ? item.entity_type
      : null;
  const label = normalizeContextLabel(item.ref || item.title || item.label || item.name || item.id, 'Item');
  const rawDetail = item.title || item.label || item.summary || entityType || fallbackKind;
  return {
    kind: entityType === 'documents' ? 'document' : fallbackKind,
    label,
    detail: rawDetail ? normalizeContextLabel(rawDetail) : null,
    entity_type: entityType,
    ref: typeof item.ref === 'string' ? item.ref : null,
    status: typeof item.status === 'string' ? item.status : null,
  };
}

function toolResultContextItems(toolName: string, result: unknown): AiChatContextItemDto[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const data = result as Record<string, unknown>;

  if (toolName === 'get_document') {
    const label = normalizeContextLabel((data.ref as string) || (data.title as string), 'Document');
    return [{
      kind: 'document',
      label,
      detail: typeof data.title === 'string' ? normalizeContextLabel(data.title) : null,
      entity_type: 'documents',
      ref: typeof data.ref === 'string' ? data.ref : null,
      status: typeof data.status === 'string' ? data.status : null,
    }];
  }

  const leadingItems = data.entity && typeof data.entity === 'object' ? [data.entity] : [];
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.groups)
      ? []
      : Array.isArray(data.related)
        ? (data.related as any[]).flatMap((group) => Array.isArray(group?.items) ? group.items : [])
        : [];

  const kind: AiChatContextItemDto['kind'] = toolName === 'search_knowledge' ? 'document' : 'entity';
  const items = [...leadingItems, ...rawItems]
    .map((item) => resultEntityItem(item, kind))
    .filter((item): item is AiChatContextItemDto => item != null)
    .slice(0, 8);

  const total = typeof data.total === 'number'
    ? data.total
    : rawItems.length;
  if (items.length > 0 && total > items.length) {
    items.push({
      kind,
      label: `${total - items.length} more`,
      count: total - items.length,
    });
  }

  return items;
}

export function resolveProviderMaxTokens(providerId: string, model: string): number {
  if (providerId === 'openai' && isOpenAiReasoningModel(model)) {
    return OPENAI_REASONING_MAX_TOKENS;
  }
  return DEFAULT_MAX_TOKENS;
}

export function resolveChatProviderTimeoutMs(rawValue = process.env.AI_CHAT_PROVIDER_TIMEOUT_MS): number {
  const normalized = String(rawValue ?? '').trim();
  if (!normalized) {
    return DEFAULT_CHAT_PROVIDER_TIMEOUT_MS;
  }
  if (!/^\d+$/.test(normalized)) {
    return DEFAULT_CHAT_PROVIDER_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(normalized, 10);
  return parsed > 0 ? parsed : DEFAULT_CHAT_PROVIDER_TIMEOUT_MS;
}

@Injectable()
export class AiChatOrchestratorService {
  private readonly logger = new Logger(AiChatOrchestratorService.name);

  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly settings: AiSettingsService,
    private readonly cipher: AiSecretCipherService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly platformAiConfig: PlatformAiConfigService,
    private readonly builtinUsage: AiBuiltinUsageService,
    private readonly conversations: AiConversationService,
    private readonly previews: AiMutationPreviewService,
    private readonly toolRegistry: AiToolRegistry,
    private readonly systemPrompt: AiSystemPromptService,
    private readonly attachments: AiAttachmentService,
  ) {}

  private parseApprovalAction(userMessage: string): ApprovalAction | null {
    const normalized = String(userMessage || '').trim();
    const approveMatch = normalized.match(APPROVE_MARKER_RE);
    if (approveMatch) {
      return { action: 'approve', previewId: approveMatch[1] };
    }
    const rejectMatch = normalized.match(REJECT_MARKER_RE);
    if (rejectMatch) {
      return { action: 'reject', previewId: rejectMatch[1] };
    }
    return null;
  }

  private toProviderUserContent(userMessage: string): string {
    const approvalAction = this.parseApprovalAction(userMessage);
    if (!approvalAction) {
      return stripBase64Images(userMessage);
    }
    if (approvalAction.action === 'approve') {
      return 'The user explicitly approved the pending AI preview.';
    }
    return 'The user explicitly rejected the pending AI preview.';
  }

  private isMutationPreviewDto(value: unknown): value is AiMutationPreviewDto {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return typeof candidate.preview_id === 'string'
      && typeof candidate.tool_name === 'string'
      && typeof candidate.status === 'string'
      && candidate.target != null
      && candidate.changes != null;
  }

  private buildPreviewResultAssistantText(preview: AiMutationPreviewDto): string {
    const summary = this.linkifyPreviewSummary(preview, String(preview.summary || '').trim());
    const errorMessage = String(preview.error_message || '').trim();

    switch (preview.status) {
      case 'executed':
        return summary || 'The approved change has been executed.';
      case 'rejected':
        return summary || 'The preview was rejected.';
      case 'failed':
        if (errorMessage) {
          return summary ? `${summary}\n\nError: ${errorMessage}` : `The approved change failed. Error: ${errorMessage}`;
        }
        return summary || 'The approved change failed.';
      case 'expired':
        return summary || 'The preview expired before approval.';
      default:
        if (errorMessage) {
          return summary ? `${summary}\n\nError: ${errorMessage}` : errorMessage;
        }
        return summary || 'The backend processed the preview action.';
    }
  }

  private linkifyPreviewSummary(preview: AiMutationPreviewDto, summary: string): string {
    const text = String(summary || '').trim();
    if (!text) return text;

    const targetEntityType = String(preview.target?.entity_type || '').trim().toLowerCase();
    const targetEntityId = String(preview.target?.entity_id || '').trim();
    const targetRef = String(preview.target?.ref || '').trim();
    if (!targetEntityType || !targetEntityId || !targetRef) return text;

    const builder = ENTITY_URL_BUILDERS[targetEntityType];
    if (!builder) return text;

    const url = builder(targetEntityId);
    // Replace every standalone occurrence of the ref with a markdown link, but skip refs
    // already inside `[ ]( )`. A negative lookbehind for `[`/`-`/word and a negative
    // lookahead for word/dash prevents partial matches like T-87 inside T-879 or
    // already-linked refs from being clobbered.
    const refPattern = new RegExp(
      `(?<![\\[\\w-])${escapeRegExp(targetRef)}(?![\\w-])`,
      'g',
    );
    return text.replace(refPattern, `[${targetRef}](${url})`);
  }

  private sanitizeReplayToolCalls(toolCalls: unknown): AiProviderToolCall[] | null {
    if (!Array.isArray(toolCalls)) {
      return null;
    }

    const sanitized: AiProviderToolCall[] = [];
    for (const rawToolCall of toolCalls) {
      if (!rawToolCall || typeof rawToolCall !== 'object') {
        continue;
      }
      const candidate = rawToolCall as Record<string, unknown>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const args = typeof candidate.arguments === 'string' ? candidate.arguments : '';
      const parsed = tryParseToolCallArguments(args || '{}');

      if (!id || !name || !parsed.ok) {
        this.logger.warn(
          `Skipping malformed persisted assistant tool call during replay: id=${id || 'missing'} tool=${name || 'missing'}.`,
        );
        continue;
      }

      sanitized.push({ id, name, arguments: args });
    }

    return sanitized.length > 0 ? sanitized : null;
  }

  private parsePersistedToolMessageId(content: string): string | null {
    try {
      const parsed = JSON.parse(content);
      return typeof parsed?.tool_call_id === 'string' && parsed.tool_call_id.trim()
        ? parsed.tool_call_id.trim()
        : null;
    } catch {
      return null;
    }
  }

  private buildSkippedToolCallAssistantText(
    assistantContent: string,
    toolCall: AiProviderToolCall,
    reason: string,
  ): string {
    const text = String(assistantContent || '').trim();
    const toolName = String(toolCall.name || '').trim() || 'unknown';
    const note = `Tool call ${toolName} was not executed because ${reason}`;
    return text ? `${text}\n\n${note}` : note;
  }

  private buildDisplayName(row: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }): string {
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    return name || row.email || 'Current user';
  }

  async prepareRequest(params: ChatStreamParams): Promise<PreparedChatRequest> {
    const approvalAction = this.parseApprovalAction(params.userMessage);
    this.logger.log(
      `prepareRequest: conversation_id=${params.conversationId || 'NONE'} `
      + `userMessage_len=${params.userMessage?.length ?? 0} `
      + `attachment_ids=${(params.attachmentIds || []).length} `
      + `truncate_from_message_id=${params.truncateFromMessageId || 'NONE'}`,
    );
    return this.tenantExecutor.runWithContext(params.context, async (ctx) => {
      await this.policy.assertSurfaceAccess(ctx, ctx.manager);

      if (approvalAction && !params.conversationId) {
        throw new BadRequestException('Preview approvals require an existing conversation.');
      }

      if (params.conversationId) {
        await this.conversations.getConversationForUser(
          params.conversationId,
          ctx.tenantId,
          ctx.userId,
          { manager: ctx.manager },
        );
      }

      const tenant = await ctx.manager.query(
        `SELECT name FROM tenants WHERE id = $1`,
        [ctx.tenantId],
      );
      const tenantName = tenant?.[0]?.name || 'KANAP';
      const settings = await this.settings.get(ctx.tenantId, { manager: ctx.manager });
      const providerSource = this.settings.getEffectiveProviderSource(settings);

      if (providerSource === 'builtin') {
        const runtime = await this.platformAiConfig.getRuntimeConfig();
        const adapter = this.providerRegistry.get(runtime.provider);
        if (!adapter) {
          throw new Error('Provider not configured.');
        }
        return {
          context: params.context,
          inputConversationId: params.conversationId ?? null,
          userMessage: params.userMessage,
          attachmentIds: params.attachmentIds ?? null,
          truncateFromMessageId: params.truncateFromMessageId ?? null,
          approvalAction,
          providerSource,
          provider: adapter,
          model: runtime.model,
          apiKey: runtime.apiKey,
          endpointUrl: runtime.endpoint_url,
          tenantName,
          builtinRateLimits: {
            tenantPerMinute: runtime.rate_limit_tenant_per_minute,
            userPerHour: runtime.rate_limit_user_per_hour,
          },
        };
      }

      const adapter = this.providerRegistry.get(settings.llm_provider);
      if (!adapter) {
        throw new Error('Provider not configured.');
      }

      return {
        context: params.context,
        inputConversationId: params.conversationId ?? null,
        userMessage: params.userMessage,
        attachmentIds: params.attachmentIds ?? null,
        truncateFromMessageId: params.truncateFromMessageId ?? null,
        approvalAction,
        providerSource,
        provider: adapter,
        model: settings.llm_model!,
        apiKey: settings.llm_api_key_encrypted ? this.cipher.decrypt(settings.llm_api_key_encrypted) : null,
        endpointUrl: settings.llm_endpoint_url,
        tenantName,
      };
    });
  }

  private async loadBuiltinUsage(prepared: PreparedChatRequest): Promise<AiBuiltinUsageDto | undefined> {
    if (prepared.providerSource !== 'builtin') {
      return undefined;
    }
    return this.tenantExecutor.runWithContext(prepared.context, async (ctx) => {
      return this.builtinUsage.getCurrentUsage(ctx.tenantId, ctx.manager);
    });
  }

  private async loadCurrentUserPromptContext(ctx: AiExecutionContext & { manager: any }): Promise<CurrentUserPromptContext> {
    const userRows = await ctx.manager.query(
      `SELECT u.email,
              u.first_name,
              u.last_name,
              r.role_name AS primary_role_name
       FROM users u
       LEFT JOIN roles r
         ON r.id = u.role_id
        AND r.tenant_id = u.tenant_id
       WHERE u.id = $1
         AND u.tenant_id = $2
       LIMIT 1`,
      [ctx.userId, ctx.tenantId],
    );
    const roleRows = await ctx.manager.query(
      `SELECT DISTINCT r.role_name
       FROM user_roles ur
       JOIN roles r
         ON r.id = ur.role_id
        AND r.tenant_id = ur.tenant_id
       WHERE ur.user_id = $1
         AND ur.tenant_id = $2
       ORDER BY r.role_name ASC`,
      [ctx.userId, ctx.tenantId],
    );
    const teamRows = await ctx.manager.query(
      `SELECT pt.name AS team_name
       FROM portfolio_team_member_configs tmc
       LEFT JOIN portfolio_teams pt
         ON pt.id = tmc.team_id
        AND pt.tenant_id = tmc.tenant_id
       WHERE tmc.user_id = $1
         AND tmc.tenant_id = $2
       LIMIT 1`,
      [ctx.userId, ctx.tenantId],
    );

    const user = userRows[0] ?? {};
    const roleNames = Array.from(new Set([
      user.primary_role_name,
      ...roleRows.map((row: any) => row.role_name),
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));

    return {
      displayName: this.buildDisplayName(user),
      email: typeof user.email === 'string' && user.email.trim() ? user.email.trim() : null,
      roleNames,
      teamName: teamRows[0]?.team_name ?? null,
    };
  }

  async *stream(params: ChatStreamParams): AsyncGenerator<ChatStreamEvent> {
    const requestStartedAt = Date.now();
    const prepared = await this.prepareRequest(params);
    yield* this.streamPrepared(prepared, { signal: params.signal ?? null, requestStartedAt });
  }

  async *streamPrepared(
    prepared: PreparedChatRequest,
    opts?: { signal?: AbortSignal | null; requestStartedAt?: number },
  ): AsyncGenerator<ChatStreamEvent> {
    const { context, userMessage, provider, model, apiKey, endpointUrl, tenantName, providerSource } = prepared;
    const abortSignal = opts?.signal ?? null;
    const requestStartedAt = opts?.requestStartedAt ?? Date.now();
    const requestStartedIso = new Date(requestStartedAt).toISOString();
    let preparationMs: number | undefined;
    let firstTokenMs: number | undefined;
    let providerStreamMs = 0;
    let toolExecutionMs = 0;
    let completedIterations = 0;
    const buildTimings = (completed = false) => {
      const now = Date.now();
      return {
        started_at: requestStartedIso,
        ...(completed ? { completed_at: new Date(now).toISOString() } : {}),
        preparation_ms: preparationMs ?? Math.max(0, now - requestStartedAt),
        ...(firstTokenMs != null ? { first_token_ms: firstTokenMs } : {}),
        ...(completed ? { total_ms: Math.max(0, now - requestStartedAt) } : {}),
        provider_stream_ms: providerStreamMs,
        tool_execution_ms: toolExecutionMs,
        iterations: completedIterations,
      };
    };

    if (abortSignal?.aborted) {
      return;
    }

    // Step 2: Load/create conversation, persist user message, build system prompt
    const approvalAction = prepared.approvalAction;
    const { conversationId, title, providerMessages, tools, systemPromptText, systemPromptSections, preStreamEvents, approvalAssistantText, contextSummary } =
      await this.tenantExecutor.runWithContext(context, async (ctx) => {
        let convId = prepared.inputConversationId;
        let convTitle: string;

        if (convId) {
          const conv = await this.conversations.getConversationForUser(
            convId,
            ctx.tenantId,
            ctx.userId,
            { manager: ctx.manager },
          );
          convTitle = conv.title || userMessage.slice(0, 100);
          // Auto-title pre-created conversations (e.g. created empty for an attachment-first
          // upload). Approval/rejection markers don't deserve to become titles.
          if (!conv.title && userMessage.trim() && !approvalAction) {
            await this.conversations.setTitleIfMissing(
              convId,
              ctx.tenantId,
              userMessage.slice(0, 100),
              { manager: ctx.manager },
            );
          }
        } else {
          convTitle = userMessage.slice(0, 100);
          const conv = await this.conversations.createConversation(
            {
              tenantId: ctx.tenantId,
              userId: ctx.userId,
              title: convTitle,
              provider: provider.descriptor.id,
              model,
              providerSource,
            },
            { manager: ctx.manager },
          );
          convId = conv.id;
        }

        // Edit/regen: wipe the conversation tail before we persist anything new, so the
        // history replay below sees only the pre-edit prefix.
        if (prepared.truncateFromMessageId && convId) {
          await this.conversations.deleteMessagesFromInclusive(
            convId,
            ctx.tenantId,
            prepared.truncateFromMessageId,
            { manager: ctx.manager },
          );
        }

        // Validate attachment ownership BEFORE persisting (fail fast)
        const requestedAttachmentIds = Array.isArray(prepared.attachmentIds) ? prepared.attachmentIds : [];
        let requestedAttachments: Array<{
          original_filename?: string | null;
          kind?: string | null;
          mime_type?: string | null;
          size?: number | null;
        }> = [];
        if (requestedAttachmentIds.length > 0) {
          requestedAttachments = await this.attachments.assertAndLoadAttachments(
            requestedAttachmentIds,
            { conversationId: convId!, tenantId: ctx.tenantId, userId: ctx.userId },
            ctx.manager,
          );
        }

        // Persist user message — skipped on regenerate (empty userMessage). In that case
        // the conversation already ends with the user msg the regen targets and we just
        // re-stream against the existing history.
        let persistedUserMessage: { id: string } | null = null;
        if (userMessage.trim().length > 0) {
          persistedUserMessage = await this.conversations.appendMessage(
            {
              conversationId: convId!,
              tenantId: ctx.tenantId,
              conversationUserId: ctx.userId,
              userId: ctx.userId,
              role: 'user',
              content: userMessage,
            },
            { manager: ctx.manager },
          );
        }

        // Link attachments to the persisted user message (idempotent — safe to retry).
        if (requestedAttachmentIds.length > 0 && persistedUserMessage) {
          await this.attachments.linkAttachmentsToMessage(
            requestedAttachmentIds,
            persistedUserMessage.id,
            ctx.tenantId,
            ctx.manager,
          );
        }

        const streamEvents: ChatStreamEvent[] = [];

        if (approvalAction) {
          const previewResult = approvalAction.action === 'approve'
            ? await this.previews.executePreview({ ...ctx, conversationId: convId! }, approvalAction.previewId)
            : await this.previews.rejectPreview({ ...ctx, conversationId: convId! }, approvalAction.previewId);

          streamEvents.push({
            type: 'preview_result',
            ...previewResult,
          });

          return {
            conversationId: convId!,
            title: convTitle,
            providerMessages: [],
            tools: [],
            systemPromptText: '',
            systemPromptSections: [],
            preStreamEvents: streamEvents,
            approvalAssistantText: this.buildPreviewResultAssistantText(previewResult),
            contextSummary: {
              previews: previewContextItems([previewResult]),
              artifacts: previewContextItems([previewResult]),
              history: {
                message_count: 1,
                attachment_count: 0,
                tool_result_count: 0,
              },
            },
          } satisfies StreamPreparationResult;
        }

        // Load history
        const history = await this.conversations.listMessagesForUser(
          convId!,
          ctx.tenantId,
          ctx.userId,
          { manager: ctx.manager },
        );

        // Pre-load image attachments for user messages so we can inject them into multimodal
        // content blocks. Only Anthropic currently honors images; other providers ignore them.
        // Performance: at most ~20MB per image x typically <10 attachments per conversation.
        const userMessageIds = history
          .filter((msg) => msg.role === 'user')
          .map((msg) => msg.id);
        const attachmentImagesByMessage = new Map<string, AiProviderImageAttachment[]>();
        if (userMessageIds.length > 0) {
          const attachmentRows = await this.attachments.listAttachmentsForMessages(
            userMessageIds,
            ctx.tenantId,
            ctx.manager,
          );
          await Promise.all(attachmentRows.map(async (row) => {
            if (!row.message_id) return;
            try {
              const { buffer } = await this.attachments.loadAttachmentBuffer(
                row.id,
                ctx.tenantId,
                ctx.manager,
              );
              const list = attachmentImagesByMessage.get(row.message_id) || [];
              list.push({
                mime_type: row.mime_type,
                base64_data: buffer.toString('base64'),
              });
              attachmentImagesByMessage.set(row.message_id, list);
            } catch (err) {
              this.logger.warn(`Failed to load attachment ${row.id} for replay: ${(err as Error).message}`);
            }
          }));
        }

        // Build provider messages from history (excluding the just-persisted user msg for reconstruction)
        const msgs: AiProviderMessage[] = [];
        let replayableToolCallIds = new Set<string>();
        for (const msg of history) {
          if (msg.role === 'user') {
            const images = attachmentImagesByMessage.get(msg.id);
            msgs.push({
              role: 'user',
              content: this.toProviderUserContent(msg.content),
              ...(images && images.length > 0 ? { images } : {}),
            });
            replayableToolCallIds = new Set<string>();
          } else if (msg.role === 'assistant') {
            const toolCalls = this.sanitizeReplayToolCalls(msg.tool_calls);
            msgs.push({
              role: 'assistant',
              content: stripBase64Images(msg.content),
              ...(toolCalls ? { tool_calls: toolCalls } : {}),
            });
            replayableToolCallIds = new Set((toolCalls ?? []).map((toolCall) => toolCall.id));
          } else if (msg.role === 'tool') {
            const toolCallId = this.parsePersistedToolMessageId(msg.content);
            if (!toolCallId || !replayableToolCallIds.has(toolCallId)) {
              this.logger.warn(
                `Skipping persisted tool message during replay because its assistant tool call is unavailable: id=${toolCallId || 'missing'}.`,
              );
              continue;
            }
            msgs.push({
              role: 'tool',
              content: msg.content,
              tool_call_id: toolCallId,
            });
            replayableToolCallIds.delete(toolCallId);
          }
        }
        // Get tools and system prompt
        const toolContext: AiExecutionContextWithManager = {
          ...ctx,
          conversationId: convId!,
        };
        const existingPreviews = await this.previews.listConversationPreviews(ctx, convId!);
        const latestUserMessage = [...history].reverse().find((msg) => msg.role === 'user')?.content ?? userMessage;
        const contextProfile = selectAiContextProfileForTurn(
          history
            .filter((msg) => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'tool')
            .map((msg) => ({
              role: msg.role as 'user' | 'assistant' | 'tool',
              content: msg.content,
            })),
        );
        const allAvailableTools = await this.toolRegistry.listAvailableTools(toolContext);
        const availableTools = filterToolListForProfile(allAvailableTools, contextProfile);
        const toolSchemas = this.toolRegistry.toToolJsonSchemas(availableTools);
        const readableTypes = contextProfile.includeReadableEntityTypes
          ? await this.policy.listReadableEntityTypes(
            ctx,
            [...AI_QUERY_ENTITY_TYPES],
            ctx.manager,
          )
          : [];
        const currentUser = await this.loadCurrentUserPromptContext(ctx);

        const builtSystemPrompt = this.systemPrompt.buildWithMetadata({
          tenantName,
          availableTools,
          readableEntityTypes: readableTypes,
          currentUser,
          contextProfile,
        });
        const sysPrompt = builtSystemPrompt.text;

        return {
          conversationId: convId!,
          title: convTitle,
          providerMessages: msgs,
          tools: toolSchemas,
          systemPromptText: sysPrompt,
          systemPromptSections: builtSystemPrompt.sections,
          preStreamEvents: streamEvents,
          approvalAssistantText: null,
          contextSummary: {
            mentions: extractMentionContextItems(latestUserMessage),
            attachments: attachmentContextItems(requestedAttachments.length > 0
              ? requestedAttachments
              : Array.from(attachmentImagesByMessage.values()).flatMap((images) =>
                images.map((image) => ({
                  original_filename: 'Image',
                  kind: 'image',
                  mime_type: image.mime_type,
                  size: null,
                })),
              )),
            previews: previewContextItems(existingPreviews),
            artifacts: previewContextItems(existingPreviews.filter((preview) => preview.status === 'pending')),
            history: {
              message_count: history.length,
              attachment_count: Array.from(attachmentImagesByMessage.values()).reduce((count, images) => count + images.length, 0),
              tool_result_count: history.filter((msg) => msg.role === 'tool').length,
            },
            tools: {
              available_count: allAvailableTools.length,
              selected_count: availableTools.length,
              writable_count: availableTools.filter((tool) => tool.write_preview != null).length,
              readable_entity_types: readableTypes,
              context_profile: contextProfile.name,
            },
          },
        } satisfies StreamPreparationResult;
      });

    // Emit conversation event
    preparationMs = Math.max(0, Date.now() - requestStartedAt);
    yield { type: 'conversation', id: conversationId, title };
    yield { type: 'activity', phase: 'preparing_context', status: 'completed' };
    yield { type: 'context', context: { ...contextSummary, timings: buildTimings(false) } };
    for (const event of preStreamEvents) {
      yield event;
    }

    if (approvalAssistantText != null) {
      const conversationUsage = await this.tenantExecutor.runWithContext(context, async (ctx) => {
        await this.conversations.appendMessage(
          {
            conversationId,
            tenantId: ctx.tenantId,
            conversationUserId: ctx.userId,
            userId: null,
            role: 'assistant',
            content: approvalAssistantText,
            usage: null,
          },
          { manager: ctx.manager },
        );
        return this.conversations.getConversationUsage(conversationId, ctx.tenantId, {
          manager: ctx.manager,
        });
      });

      yield { type: 'text_delta', text: approvalAssistantText };
      yield { type: 'activity', phase: 'finalizing', status: 'completed' };
      yield { type: 'context', context: { timings: buildTimings(true) } };
      yield {
        type: 'done',
        usage: undefined,
        last_usage: undefined,
        conversation_usage: conversationUsage,
        builtin_usage: await this.loadBuiltinUsage(prepared),
      };
      return;
    }

    // Step 3: Provider streaming loop (NO DB transaction open)
    yield { type: 'activity', phase: 'analyzing', status: 'running' };
    let messages = [...providerMessages];
    let totalUsage: StreamUsage | undefined;
    let lastUsage: StreamUsage | undefined;
    let previousToolCallSignature: string | null = null;
    const toolSchemaBudget = estimateToolSchemaBreakdown(tools);
    const loadConversationUsage = async (): Promise<AiTokenUsage> => {
      return this.tenantExecutor.runWithContext(context, async (ctx) => {
        return this.conversations.getConversationUsage(conversationId, ctx.tenantId, {
          manager: ctx.manager,
        });
      });
    };

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (abortSignal?.aborted) {
        return;
      }
      completedIterations = iteration + 1;

      const requestMaxTokens = resolveProviderMaxTokens(provider.descriptor.id, model);

      const budgetedMessages = prepareAiProviderMessages({
        systemPrompt: systemPromptText,
        systemPromptSections,
        messages,
        contextWindow: provider.descriptor.capabilities.contextWindow ?? null,
      });
      messages = budgetedMessages.messages;
      const requestBreakdown = withToolSchemaBreakdown(budgetedMessages.breakdown, toolSchemaBudget);
      const estimatedRequestSize = requestBreakdown.total_with_tools ?? budgetedMessages.estimatedRequestSize;
      yield {
        type: 'context',
        context: {
          budget: {
            estimated_request_size: estimatedRequestSize,
            budget: budgetedMessages.budget,
            compacted: budgetedMessages.compacted,
            over_budget_after_compaction: budgetedMessages.overBudgetAfterCompaction,
            breakdown: requestBreakdown,
          },
        },
      };

      this.logger.log(
        [
          `provider=${provider.descriptor.id}`,
          `model=${model}`,
          `estimated_request_size=${estimatedRequestSize}`,
          `max_tokens=${requestMaxTokens}`,
          `budget=${budgetedMessages.budget ?? 'none'}`,
          `compacted=${budgetedMessages.compacted}`,
          `tool_results_compacted=${budgetedMessages.compactedToolResults}`,
          `assistant_messages_compacted=${budgetedMessages.compactedAssistantMessages}`,
          `over_budget_after_compaction=${budgetedMessages.overBudgetAfterCompaction}`,
        ].join(' '),
      );

      let accumulatedText = '';
      const pendingToolCalls: Array<{ id: string; name: string; arguments: string }> = [];
      let iterationUsage: StreamUsage | undefined;
      let responseActivityEmitted = false;

      const providerCallStartedAt = Date.now();
      const providerStream = provider.createStream({
        model,
        apiKey,
        endpointUrl,
        systemPrompt: systemPromptText,
        messages,
        tools,
        maxTokens: requestMaxTokens,
        signal: abortSignal,
        timeoutMs: resolveChatProviderTimeoutMs(),
      });

      try {
        for await (const event of providerStream) {
          switch (event.type) {
            case 'text_delta':
              if (firstTokenMs == null) {
                firstTokenMs = Math.max(0, Date.now() - requestStartedAt);
                yield { type: 'context', context: { timings: buildTimings(false) } };
              }
              if (!responseActivityEmitted) {
                yield { type: 'activity', phase: 'generating_response', status: 'running' };
                responseActivityEmitted = true;
              }
              accumulatedText += event.text;
              yield { type: 'text_delta', text: event.text };
              break;

            case 'tool_call_start':
              pendingToolCalls.push({ id: event.id, name: event.name, arguments: '' });
              break;

            case 'tool_call_delta': {
              const tc = pendingToolCalls.find((t) => t.id === event.id);
              if (tc) tc.arguments += event.arguments;
              break;
            }

            case 'tool_call_end':
              break;

            case 'done':
              iterationUsage = cloneUsage(event.usage);
              totalUsage = addUsage(totalUsage, iterationUsage);
              lastUsage = iterationUsage;
              break;

            case 'error': {
              providerStreamMs += Math.max(0, Date.now() - providerCallStartedAt);
              const conversationUsage = await loadConversationUsage();
              yield { type: 'activity', phase: 'finalizing', status: 'failed' };
              yield { type: 'context', context: { timings: buildTimings(true) } };
              yield {
                type: 'error',
                message: event.message,
                last_usage: iterationUsage,
                conversation_usage: conversationUsage,
                builtin_usage: await this.loadBuiltinUsage(prepared),
              };
              return;
            }
          }
        }
        providerStreamMs += Math.max(0, Date.now() - providerCallStartedAt);
      } catch (error) {
        providerStreamMs += Math.max(0, Date.now() - providerCallStartedAt);
        if (abortSignal?.aborted || isAbortError(error)) {
          return;
        }
        const conversationUsage = await loadConversationUsage();
        yield { type: 'activity', phase: 'finalizing', status: 'failed' };
        yield { type: 'context', context: { timings: buildTimings(true) } };
        yield {
          type: 'error',
          message: error instanceof Error && error.message.trim() ? error.message : 'Stream failed.',
          last_usage: iterationUsage,
          conversation_usage: conversationUsage,
          builtin_usage: await this.loadBuiltinUsage(prepared),
        };
        return;
      }

      if (abortSignal?.aborted) {
        return;
      }

      this.logger.log(
        `Iteration ${iteration + 1}: text=${accumulatedText.length} chars, tool_calls=${pendingToolCalls.length}`,
      );

      // If there are tool calls, execute them
      if (pendingToolCalls.length > 0) {
        const assistantToolCalls: AiProviderToolCall[] = pendingToolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        }));
        const toolCallSignature = buildToolCallSignature(assistantToolCalls);

        if (previousToolCallSignature === toolCallSignature) {
          const conversationUsage = await loadConversationUsage();
          yield { type: 'activity', phase: 'finalizing', status: 'failed' };
          yield { type: 'context', context: { timings: buildTimings(true) } };
          yield {
            type: 'error',
            message: 'Maximum tool call iterations reached without progress.',
            last_usage: lastUsage,
            conversation_usage: conversationUsage,
            builtin_usage: await this.loadBuiltinUsage(prepared),
          };
          return;
        }
        previousToolCallSignature = toolCallSignature;

        // Execute each tool call
        for (let toolCallIndex = 0; toolCallIndex < assistantToolCalls.length; toolCallIndex++) {
          const tc = assistantToolCalls[toolCallIndex];
          const assistantContent = toolCallIndex === 0 ? accumulatedText : '';
          const assistantUsage = toolCallIndex === 0 ? (iterationUsage ?? null) : null;
          const parsedArgsResult = tryParseToolCallArguments(tc.arguments || '{}');
          const parseErrorMessage = 'message' in parsedArgsResult ? parsedArgsResult.message : null;
          const parsedArgs = 'value' in parsedArgsResult ? parsedArgsResult.value : {};
          const activityPhase = toolActivityPhase(tc.name);

          yield {
            type: 'activity',
            phase: activityPhase,
            status: 'running',
            tool_name: tc.name,
          };
          yield {
            type: 'tool_call',
            id: tc.id,
            name: tc.name,
            arguments: parsedArgs,
          };

          let result: unknown;
          if (!tc.name?.trim()) {
            this.logger.warn(`Skipping tool execution for tool_call_id=${tc.id} because the tool name was empty.`);
            result = { error: 'Tool call was missing a tool name. Ask the model to retry.' };
            const skippedAssistantText = this.buildSkippedToolCallAssistantText(
              assistantContent,
              tc,
              'the tool name was missing.',
            );
            messages.push({ role: 'assistant', content: skippedAssistantText });
            await this.tenantExecutor.runWithContext(context, async (ctx) => {
              await this.conversations.appendMessage(
                {
                  conversationId,
                  tenantId: ctx.tenantId,
                  conversationUserId: ctx.userId,
                  userId: null,
                  role: 'assistant',
                  content: skippedAssistantText,
                  usage: assistantUsage,
                },
                { manager: ctx.manager },
              );
            });
          } else if (parseErrorMessage) {
            this.logger.warn(
              `Skipping tool execution for tool_call_id=${tc.id} tool=${tc.name} because arguments were invalid JSON.`,
            );
            result = { error: `${parseErrorMessage} Ask the model to retry with valid JSON arguments.` };
            const skippedAssistantText = this.buildSkippedToolCallAssistantText(
              assistantContent,
              tc,
              'the arguments were invalid JSON.',
            );
            messages.push({ role: 'assistant', content: skippedAssistantText });
            await this.tenantExecutor.runWithContext(context, async (ctx) => {
              await this.conversations.appendMessage(
                {
                  conversationId,
                  tenantId: ctx.tenantId,
                  conversationUserId: ctx.userId,
                  userId: null,
                  role: 'assistant',
                  content: skippedAssistantText,
                  usage: assistantUsage,
                },
                { manager: ctx.manager },
              );
            });
          } else {
            messages.push({
              role: 'assistant',
              content: assistantContent,
              tool_calls: [tc],
            });

            // Persist the assistant turn before tool execution so usage survives interrupted loops.
            // Multiple parallel tool calls are stored as sequential one-call turns for stricter
            // OpenAI-compatible backends such as Qwen tool parsers.
            await this.tenantExecutor.runWithContext(context, async (ctx) => {
              await this.conversations.appendMessage(
                {
                  conversationId,
                  tenantId: ctx.tenantId,
                  conversationUserId: ctx.userId,
                  userId: null,
                  role: 'assistant',
                  content: assistantContent,
                  toolCalls: [tc],
                  usage: assistantUsage,
                },
                { manager: ctx.manager },
              );
            });

            const toolStartedAt = Date.now();
            try {
              result = await this.tenantExecutor.runWithContext({ ...context, conversationId }, async (ctx) => {
                return this.toolRegistry.execute(ctx, tc.name, parsedArgs);
              });
            } catch (err: any) {
              result = { error: err.message || 'Tool execution failed.' };
            } finally {
              toolExecutionMs += Math.max(0, Date.now() - toolStartedAt);
            }

            yield {
              type: 'tool_result',
              id: tc.id,
              name: tc.name,
              result,
            };
            yield {
              type: 'activity',
              phase: activityPhase,
              status: 'completed',
              tool_name: tc.name,
            };
            const injectedContext = toolResultContextItems(tc.name, result);
            if (injectedContext.length > 0) {
              yield {
                type: 'context',
                context: {
                  injected: injectedContext,
                },
              };
            }

            if (this.isMutationPreviewDto(result)) {
              yield {
                type: 'preview',
                ...result,
              };
            }

            const validation = buildStructuredToolResultValidation(tc.name, result);
            const toolContent = JSON.stringify({
              tool_call_id: tc.id,
              tool_name: tc.name,
              result,
              ...(validation ? { validation } : {}),
            });

            messages.push({
              role: 'tool',
              content: toolContent,
              tool_call_id: tc.id,
            });

            await this.tenantExecutor.runWithContext(context, async (ctx) => {
              await this.conversations.appendMessage(
                {
                  conversationId,
                  tenantId: ctx.tenantId,
                  conversationUserId: ctx.userId,
                  userId: null,
                  role: 'tool',
                  content: toolContent,
                },
                { manager: ctx.manager },
              );
            });
            continue;
          }

          yield {
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            result,
          };
          yield {
            type: 'activity',
            phase: activityPhase,
            status: 'completed',
            tool_name: tc.name,
          };
        }

        // Continue loop for next iteration
        continue;
      }

      // No tool calls - this is the final assistant response
      const conversationUsage = await this.tenantExecutor.runWithContext(context, async (ctx) => {
        await this.conversations.appendMessage(
          {
            conversationId,
            tenantId: ctx.tenantId,
            conversationUserId: ctx.userId,
            userId: null,
            role: 'assistant',
            content: accumulatedText,
            usage: iterationUsage ?? null,
          },
          { manager: ctx.manager },
        );
        return this.conversations.getConversationUsage(conversationId, ctx.tenantId, {
          manager: ctx.manager,
        });
      });

      yield { type: 'activity', phase: 'finalizing', status: 'completed' };
      yield { type: 'context', context: { timings: buildTimings(true) } };
      yield {
        type: 'done',
        usage: totalUsage,
        last_usage: lastUsage,
        conversation_usage: conversationUsage,
        builtin_usage: await this.loadBuiltinUsage(prepared),
      };
      return;
    }

    // Max iterations reached
    const conversationUsage = await loadConversationUsage();
    yield { type: 'activity', phase: 'finalizing', status: 'failed' };
    yield { type: 'context', context: { timings: buildTimings(true) } };
    yield {
      type: 'error',
      message: 'Maximum tool call iterations reached.',
      last_usage: lastUsage,
      conversation_usage: conversationUsage,
      builtin_usage: await this.loadBuiltinUsage(prepared),
    };
  }
}
