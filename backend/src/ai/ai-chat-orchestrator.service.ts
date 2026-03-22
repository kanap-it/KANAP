import { Injectable, Logger } from '@nestjs/common';
import { AiConversationService } from './ai-conversation.service';
import { AiPolicyService } from './ai-policy.service';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettingsService } from './ai-settings.service';
import { AiSystemPromptService } from './ai-system-prompt.service';
import { AiToolRegistry } from './ai-tool.registry';
import { prepareAiProviderMessages } from './ai-context-budget.helper';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import { AiProviderMessage, AiProviderToolCall, AiStreamEvent } from './providers/ai-provider.types';
import { AiExecutionContext, ChatStreamEvent } from './ai.types';

const MAX_TOOL_ITERATIONS = 20;
const MAX_TOKENS = 4096;

/** Strip base64 data-URI images from text to avoid blowing up the LLM context. */
function stripBase64Images(text: string): string {
  // Markdown: ![alt](data:image/...;base64,...)
  text = text.replace(/!\[[^\]]*\]\(data:image\/[^;]*;base64,[^)]*\)/g, '[image removed]');
  // HTML: <img ... src="data:image/...;base64,..." ...>
  text = text.replace(/<img\s[^>]*src="data:image\/[^;]*;base64,[^"]*"[^>]*>/gi, '[image removed]');
  return text;
}

type ChatStreamParams = {
  context: AiExecutionContext;
  conversationId?: string | null;
  userMessage: string;
};

type CurrentUserPromptContext = {
  displayName: string;
  email: string | null;
  roleNames: string[];
  teamName: string | null;
};

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
    private readonly toolRegistry: AiToolRegistry,
    private readonly systemPrompt: AiSystemPromptService,
  ) {}

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
    const { conversationId, title, providerMessages, tools, systemPromptText } =
      await this.tenantExecutor.runWithContext(context, async (ctx) => {
        let convId = params.conversationId;
        let convTitle: string;

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
            msgs.push({ role: 'user', content: stripBase64Images(msg.content) });
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

        // Get tools and system prompt
        const toolSchemas = await this.toolRegistry.getToolJsonSchemas(ctx);
        const availableTools = await this.toolRegistry.listAvailableTools(ctx);
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
        };
      });

    // Emit conversation event
    yield { type: 'conversation', id: conversationId, title };

    // Step 3: Provider streaming loop (NO DB transaction open)
    let messages = [...providerMessages];
    let totalUsage: { input_tokens: number; output_tokens: number } | undefined;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
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
          `budget=${budgetedMessages.budget ?? 'none'}`,
          `compacted=${budgetedMessages.compacted}`,
          `tool_results_compacted=${budgetedMessages.compactedToolResults}`,
          `assistant_messages_compacted=${budgetedMessages.compactedAssistantMessages}`,
          `over_budget_after_compaction=${budgetedMessages.overBudgetAfterCompaction}`,
        ].join(' '),
      );

      let accumulatedText = '';
      const pendingToolCalls: Array<{ id: string; name: string; arguments: string }> = [];
      let gotDone = false;

      const providerStream = provider.createStream({
        model,
        apiKey,
        endpointUrl,
        systemPrompt: systemPromptText,
        messages,
        tools,
        maxTokens: MAX_TOKENS,
      });

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
            totalUsage = event.usage;
            gotDone = true;
            break;

          case 'error':
            yield { type: 'error', message: event.message };
            return;
        }
      }

      this.logger.log(
        `Iteration ${iteration + 1}: text=${accumulatedText.length} chars, tool_calls=${pendingToolCalls.length}`,
      );

      // If there are tool calls, execute them
      if (pendingToolCalls.length > 0) {
        // Add assistant message with tool calls to history
        const assistantToolCalls: AiProviderToolCall[] = pendingToolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        }));

        messages.push({
          role: 'assistant',
          content: accumulatedText,
          tool_calls: assistantToolCalls,
        });

        // Persist assistant message with tool calls
        const messagesToPersist: Array<{
          role: string;
          content: string;
          toolCalls?: any;
          usage?: any;
          userId?: string | null;
        }> = [];

        messagesToPersist.push({
          role: 'assistant',
          content: accumulatedText,
          toolCalls: assistantToolCalls,
        });

        // Execute each tool call
        for (const tc of pendingToolCalls) {
          let parsedArgs: Record<string, unknown>;
          try {
            parsedArgs = JSON.parse(tc.arguments || '{}');
          } catch {
            parsedArgs = {};
          }

          yield {
            type: 'tool_call',
            id: tc.id,
            name: tc.name,
            arguments: parsedArgs,
          };

          let result: unknown;
          try {
            result = await this.tenantExecutor.runWithContext(context, async (ctx) => {
              return this.toolRegistry.execute(ctx, tc.name, parsedArgs);
            });
          } catch (err: any) {
            result = { error: err.message || 'Tool execution failed.' };
          }

          yield {
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            result,
          };

          const toolContent = JSON.stringify({
            tool_call_id: tc.id,
            tool_name: tc.name,
            result,
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

        // Persist assistant + tool messages
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
                toolCalls: msg.toolCalls,
                usage: msg.usage,
              },
              { manager: ctx.manager },
            );
          }
        });

        // Continue loop for next iteration
        continue;
      }

      // No tool calls - this is the final assistant response
      // Persist final assistant message with usage
      await this.tenantExecutor.runWithContext(context, async (ctx) => {
        await this.conversations.appendMessage(
          {
            conversationId,
            tenantId: ctx.tenantId,
            conversationUserId: ctx.userId,
            userId: null,
            role: 'assistant',
            content: accumulatedText,
            usage: totalUsage ?? null,
          },
          { manager: ctx.manager },
        );
      });

      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Max iterations reached
    yield { type: 'error', message: 'Maximum tool call iterations reached.' };
  }
}
