import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AiConversationService } from './ai-conversation.service';
import { AiMutationPreviewService } from './ai-mutation-preview.service';
import { AiPolicyService } from './ai-policy.service';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettingsService } from './ai-settings.service';
import { AiSystemPromptService } from './ai-system-prompt.service';
import { AiToolRegistry } from './ai-tool.registry';
import { prepareAiProviderMessages } from './ai-context-budget.helper';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import { AiProviderMessage, AiProviderToolCall, AiStreamEvent } from './providers/ai-provider.types';
import { addUsage, cloneUsage, isAbortError, tryParseToolCallArguments } from './providers/streaming.util';
import { isOpenAiReasoningModel } from './providers/openai-stream.util';
import {
  AiExecutionContext,
  AiExecutionContextWithManager,
  AiMutationPreviewDto,
  AiTokenUsage,
  ChatStreamEvent,
} from './ai.types';
import { buildStructuredToolResultValidation } from './ai-tool-result-validation.util';

const MAX_TOOL_ITERATIONS = 20;
const DEFAULT_MAX_TOKENS = 4096;
const OPENAI_REASONING_MAX_TOKENS = 8192;
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

function buildToolCallSignature(toolCalls: Array<{ name: string; arguments: string }>): string {
  return toolCalls
    .map((toolCall) => `${toolCall.name}\u0000${toolCall.arguments}`)
    .join('\u0001');
}

export function resolveProviderMaxTokens(providerId: string, model: string): number {
  if (providerId === 'openai' && isOpenAiReasoningModel(model)) {
    return OPENAI_REASONING_MAX_TOKENS;
  }
  return DEFAULT_MAX_TOKENS;
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
    private readonly conversations: AiConversationService,
    private readonly previews: AiMutationPreviewService,
    private readonly toolRegistry: AiToolRegistry,
    private readonly systemPrompt: AiSystemPromptService,
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

  private buildPreviewResultContextMessage(preview: AiMutationPreviewDto): AiProviderMessage {
    const summary = preview.error_message
      ? `${preview.summary} Error: ${preview.error_message}`
      : preview.summary;
    return {
      role: 'assistant',
      content: `Backend preview result: ${summary}`,
    };
  }

  private buildDisplayName(row: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }): string {
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    return name || row.email || 'Current user';
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
    const { context, userMessage } = params;
    const abortSignal = params.signal ?? null;

    if (abortSignal?.aborted) {
      return;
    }

    // Step 1: Validate access, load settings, decrypt API key
    const { provider, model, apiKey, endpointUrl, tenantName } = await this.tenantExecutor.runWithContext(
      context,
      async (ctx) => {
        await this.policy.assertSurfaceAccess(ctx, ctx.manager);
        const s = await this.settings.get(ctx.tenantId, { manager: ctx.manager });
        const adapter = this.providerRegistry.get(s.llm_provider);
        if (!adapter) throw new Error('Provider not configured.');

        const tenant = await ctx.manager.query(
          `SELECT name FROM tenants WHERE id = $1`,
          [ctx.tenantId],
        );

        return {
          provider: adapter,
          model: s.llm_model!,
          apiKey: s.llm_api_key_encrypted ? this.cipher.decrypt(s.llm_api_key_encrypted) : null,
          endpointUrl: s.llm_endpoint_url,
          tenantName: tenant?.[0]?.name || 'KANAP',
        };
      },
    );

    // Step 2: Load/create conversation, persist user message, build system prompt
    const approvalAction = this.parseApprovalAction(userMessage);
    const { conversationId, title, providerMessages, tools, systemPromptText, preStreamEvents } =
      await this.tenantExecutor.runWithContext(context, async (ctx) => {
        let convId = params.conversationId;
        let convTitle: string;

        if (approvalAction && !convId) {
          throw new BadRequestException('Preview approvals require an existing conversation.');
        }

        if (convId) {
          const conv = await this.conversations.getConversationForUser(
            convId,
            ctx.tenantId,
            ctx.userId,
            { manager: ctx.manager },
          );
          convTitle = conv.title || userMessage.slice(0, 100);
        } else {
          convTitle = userMessage.slice(0, 100);
          const conv = await this.conversations.createConversation(
            {
              tenantId: ctx.tenantId,
              userId: ctx.userId,
              title: convTitle,
              provider: provider.descriptor.id,
              model,
            },
            { manager: ctx.manager },
          );
          convId = conv.id;
        }

        // Persist user message
        await this.conversations.appendMessage(
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

        const streamEvents: ChatStreamEvent[] = [];
        let previewContextMessage: AiProviderMessage | null = null;

        if (approvalAction) {
          const previewResult = approvalAction.action === 'approve'
            ? await this.previews.executePreview({ ...ctx, conversationId: convId! }, approvalAction.previewId)
            : await this.previews.rejectPreview({ ...ctx, conversationId: convId! }, approvalAction.previewId);
          previewContextMessage = this.buildPreviewResultContextMessage(previewResult);

          streamEvents.push({
            type: 'preview_result',
            ...previewResult,
          });
        }

        // Load history
        const history = await this.conversations.listMessagesForUser(
          convId!,
          ctx.tenantId,
          ctx.userId,
          { manager: ctx.manager },
        );

        // Build provider messages from history (excluding the just-persisted user msg for reconstruction)
        const msgs: AiProviderMessage[] = [];
        for (const msg of history) {
          if (msg.role === 'user') {
            msgs.push({ role: 'user', content: this.toProviderUserContent(msg.content) });
          } else if (msg.role === 'assistant') {
            msgs.push({
              role: 'assistant',
              content: stripBase64Images(msg.content),
              tool_calls: msg.tool_calls as AiProviderToolCall[] | null,
            });
          } else if (msg.role === 'tool') {
            const parsed = JSON.parse(msg.content);
            msgs.push({
              role: 'tool',
              content: msg.content,
              tool_call_id: parsed.tool_call_id,
            });
          }
        }
        if (previewContextMessage) {
          msgs.push(previewContextMessage);
        }

        // Get tools and system prompt
        const toolContext: AiExecutionContextWithManager = {
          ...ctx,
          conversationId: convId!,
        };
        const toolSchemas = await this.toolRegistry.getToolJsonSchemas(toolContext);
        const availableTools = await this.toolRegistry.listAvailableTools(toolContext);
        const readableTypes = await this.policy.listReadableEntityTypes(
          ctx,
          ['applications', 'assets', 'projects', 'requests', 'tasks', 'documents'],
          ctx.manager,
        );
        const currentUser = await this.loadCurrentUserPromptContext(ctx);

        const sysPrompt = this.systemPrompt.build({
          tenantName,
          availableTools,
          readableEntityTypes: readableTypes,
          currentUser,
        });

        return {
          conversationId: convId!,
          title: convTitle,
          providerMessages: msgs,
          tools: toolSchemas,
          systemPromptText: sysPrompt,
          preStreamEvents: streamEvents,
        };
      });

    // Emit conversation event
    yield { type: 'conversation', id: conversationId, title };
    for (const event of preStreamEvents) {
      yield event;
    }

    // Step 3: Provider streaming loop (NO DB transaction open)
    let messages = [...providerMessages];
    let totalUsage: StreamUsage | undefined;
    let lastUsage: StreamUsage | undefined;
    let previousToolCallSignature: string | null = null;
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

      const requestMaxTokens = resolveProviderMaxTokens(provider.descriptor.id, model);

      const budgetedMessages = prepareAiProviderMessages({
        systemPrompt: systemPromptText,
        messages,
        contextWindow: provider.descriptor.capabilities.contextWindow ?? null,
      });
      messages = budgetedMessages.messages;

      this.logger.log(
        [
          `provider=${provider.descriptor.id}`,
          `model=${model}`,
          `estimated_request_size=${budgetedMessages.estimatedRequestSize}`,
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

      const providerStream = provider.createStream({
        model,
        apiKey,
        endpointUrl,
        systemPrompt: systemPromptText,
        messages,
        tools,
        maxTokens: requestMaxTokens,
        signal: abortSignal,
      });

      try {
        for await (const event of providerStream) {
          switch (event.type) {
            case 'text_delta':
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
              const conversationUsage = await loadConversationUsage();
              yield {
                type: 'error',
                message: event.message,
                last_usage: iterationUsage,
                conversation_usage: conversationUsage,
              };
              return;
            }
          }
        }
      } catch (error) {
        if (abortSignal?.aborted || isAbortError(error)) {
          return;
        }
        throw error;
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

        messages.push({
          role: 'assistant',
          content: accumulatedText,
          tool_calls: assistantToolCalls,
        });

        // Persist the assistant turn before tool execution so usage survives interrupted loops.
        await this.tenantExecutor.runWithContext(context, async (ctx) => {
          await this.conversations.appendMessage(
            {
              conversationId,
              tenantId: ctx.tenantId,
              conversationUserId: ctx.userId,
              userId: null,
              role: 'assistant',
              content: accumulatedText,
              toolCalls: assistantToolCalls,
              usage: iterationUsage ?? null,
            },
            { manager: ctx.manager },
          );
        });

        if (previousToolCallSignature === toolCallSignature) {
          const conversationUsage = await loadConversationUsage();
          yield {
            type: 'error',
            message: 'Maximum tool call iterations reached without progress.',
            last_usage: lastUsage,
            conversation_usage: conversationUsage,
          };
          return;
        }
        previousToolCallSignature = toolCallSignature;

        const messagesToPersist: Array<{
          role: 'tool';
          content: string;
        }> = [];

        // Execute each tool call
        for (const tc of pendingToolCalls) {
          const parsedArgsResult = tryParseToolCallArguments(tc.arguments || '{}');
          const parseErrorMessage = 'message' in parsedArgsResult ? parsedArgsResult.message : null;
          const parsedArgs = 'value' in parsedArgsResult ? parsedArgsResult.value : {};

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
          } else if (parseErrorMessage) {
            this.logger.warn(
              `Skipping tool execution for tool_call_id=${tc.id} tool=${tc.name} because arguments were invalid JSON.`,
            );
            result = { error: `${parseErrorMessage} Ask the model to retry with valid JSON arguments.` };
          } else {
            try {
              result = await this.tenantExecutor.runWithContext({ ...context, conversationId }, async (ctx) => {
                return this.toolRegistry.execute(ctx, tc.name, parsedArgs);
              });
            } catch (err: any) {
              result = { error: err.message || 'Tool execution failed.' };
            }
          }

          yield {
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            result,
          };

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

          messagesToPersist.push({
            role: 'tool',
            content: toolContent,
          });
        }

        await this.tenantExecutor.runWithContext(context, async (ctx) => {
          for (const msg of messagesToPersist) {
            await this.conversations.appendMessage(
              {
                conversationId,
                tenantId: ctx.tenantId,
                conversationUserId: ctx.userId,
                userId: null,
                role: msg.role,
                content: msg.content,
              },
              { manager: ctx.manager },
            );
          }
        });

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

      yield {
        type: 'done',
        usage: totalUsage,
        last_usage: lastUsage,
        conversation_usage: conversationUsage,
      };
      return;
    }

    // Max iterations reached
    const conversationUsage = await loadConversationUsage();
    yield {
      type: 'error',
      message: 'Maximum tool call iterations reached.',
      last_usage: lastUsage,
      conversation_usage: conversationUsage,
    };
  }
}
