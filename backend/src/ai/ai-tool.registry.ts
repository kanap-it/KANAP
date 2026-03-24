import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { Features } from '../config/features';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AiEntityService } from './ai-entity.service';
import { AiPolicyService } from './ai-policy.service';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderToolDef } from './providers/ai-provider.types';
import { BraveSearchService } from './web-search/brave-search.service';
import { AiAggregateExecutor } from './query/ai-aggregate.executor';
import { AiQueryExecutor } from './query/ai-query.executor';
import {
  AiContextEntityTypeSchema,
  AiDocumentDto,
  AiEntitySummaryDto,
  AiExecutionContextWithManager,
  AiKnowledgeSearchResultDto,
  AiQueryEntityTypeSchema,
  AiQueryScopeSchema,
  AiSearchEntityTypeSchema,
  AiToolDefinition,
  AiToolListItemDto,
  AiToolName,
} from './ai.types';

const SearchAllInputSchema = z.object({
  query: z.string().trim().min(1),
  entity_types: z.array(AiSearchEntityTypeSchema).optional(),
  limit: z.number().int().min(1).max(100).default(100),
});

const GetEntityContextInputSchema = z.object({
  entity_type: AiContextEntityTypeSchema,
  entity_id: z.string().trim().min(1),
});

const SearchKnowledgeInputSchema = z.object({
  query: z.string().trim().min(1),
  offset: z.number().int().min(0).max(5000).default(0),
  limit: z.number().int().min(1).max(200).default(100),
});

const GetDocumentInputSchema = z.object({
  document_id: z.string().trim().min(1),
});

const AiFilterValueSchema = z.union([
  z.array(z.union([z.string(), z.null()])),
  z.string(),
  z.object({
    op: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'between']),
    value: z.number(),
    valueTo: z.number().optional(),
  }),
  z.object({
    op: z.enum(['eq', 'before', 'after', 'between']),
    value: z.string().trim().min(1),
    valueTo: z.string().trim().min(1).optional(),
  }),
]);

const QueryEntitiesInputSchema = z.object({
  entity_type: AiQueryEntityTypeSchema,
  scope: AiQueryScopeSchema.optional(),
  filters: z.record(z.string(), AiFilterValueSchema).optional(),
  q: z.string().trim().optional(),
  sort: z.object({
    field: z.string().trim().min(1),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
  page: z.number().int().min(1).max(100).default(1),
  limit: z.number().int().min(1).max(200).default(200),
});

const AggregateEntitiesInputSchema = z.object({
  entity_type: AiQueryEntityTypeSchema,
  scope: AiQueryScopeSchema.optional(),
  group_by: z.string().trim().min(1),
  filters: z.record(z.string(), AiFilterValueSchema).optional(),
  q: z.string().trim().optional(),
});

const GetFilterValuesInputSchema = z.object({
  entity_type: AiQueryEntityTypeSchema,
  fields: z.array(z.string().trim().min(1)).min(1).max(10),
});

const WebSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(256),
  count: z.number().int().min(1).max(10).optional(),
});

function toDocumentRelation(type: AiEntitySummaryDto['type'], row: any): AiEntitySummaryDto {
  return {
    type,
    id: row.id,
    ref: null,
    label: row.name,
    status: null,
    summary: null,
    updated_at: null,
  };
}

@Injectable()
export class AiToolRegistry {
  private readonly definitions: Map<AiToolName, AiToolDefinition<any, any>>;

  constructor(
    private readonly entityTools: AiEntityService,
    private readonly knowledge: KnowledgeService,
    private readonly policy: AiPolicyService,
    private readonly queryExecutor: AiQueryExecutor,
    private readonly aggregateExecutor: AiAggregateExecutor,
    private readonly settingsService: AiSettingsService,
    private readonly braveSearch: BraveSearchService,
  ) {
    this.definitions = new Map<AiToolName, AiToolDefinition<any, any>>([
      [
        'search_all',
        {
          name: 'search_all',
          description: 'Search across readable KANAP entity families using stable AI DTOs.',
          inputSchema: SearchAllInputSchema,
          inputSummary: {
            query: 'Search text or item reference such as PRJ-12, REQ-7, T-42, or DOC-3.',
            entity_types: 'Optional entity families to include.',
            limit: 'Maximum number of results to return (default 100). If the result says truncated=true, narrow the query or switch to a more specific tool.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: (context, input) => this.entityTools.searchAll(context, input),
        },
      ],
      [
        'query_entities',
        {
          name: 'query_entities',
          description: 'Query one readable entity family with server-side filters, pagination, and exact totals.',
          inputSchema: QueryEntitiesInputSchema,
          inputSummary: {
            entity_type: 'One of applications, assets, locations, projects, requests, tasks, or documents.',
            scope: 'Optional first-person scope. Use "me" or "my_team" for tasks, projects, and requests.',
            filters: 'Optional field filters keyed by AI field name.',
            q: 'Optional quick-search text.',
            sort: 'Optional sort field and direction.',
            page: 'Page number to fetch (default 1). Use later pages when total is greater than returned.',
            limit: 'Maximum number of items to return per page (default 200). Use the maximum unless you have a reason to limit.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (context, input) => {
            await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);
            return this.queryExecutor.execute(context, input);
          },
        },
      ],
      [
        'aggregate_entities',
        {
          name: 'aggregate_entities',
          description: 'Break down one readable entity family by a supported field with exact server-side counts.',
          inputSchema: AggregateEntitiesInputSchema,
          inputSummary: {
            entity_type: 'One of applications, assets, locations, projects, requests, tasks, or documents.',
            scope: 'Optional first-person scope. Use "me" or "my_team" for tasks, projects, and requests.',
            group_by: 'A supported group-by field from the query layer registry.',
            filters: 'Optional field filters keyed by AI field name.',
            q: 'Optional quick-search text.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (context, input) => {
            await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);
            return this.aggregateExecutor.execute(context, input);
          },
        },
      ],
      [
        'get_filter_values',
        {
          name: 'get_filter_values',
          description: 'Discover exact filter values for supported set-like AI query fields.',
          inputSchema: GetFilterValuesInputSchema,
          inputSummary: {
            entity_type: 'One of applications, assets, locations, projects, requests, tasks, or documents.',
            fields: 'AI field names to inspect.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (context, input) => {
            await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);
            return this.queryExecutor.executeFilterValues(context, input);
          },
        },
      ],
      [
        'get_entity_context',
        {
          name: 'get_entity_context',
          description: 'Return a stable relationship-focused context payload for one known entity.',
          inputSchema: GetEntityContextInputSchema,
          inputSummary: {
            entity_type: 'One of applications, assets, projects, requests, or tasks.',
            entity_id: 'The entity UUID to inspect.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: (context, input) => this.entityTools.getEntityContext(context, input),
        },
      ],
      [
        'search_knowledge',
        {
          name: 'search_knowledge',
          description: 'Search the knowledge base with existing PostgreSQL full-text retrieval.',
          inputSchema: SearchKnowledgeInputSchema,
          inputSummary: {
            query: 'Search text or document reference such as DOC-14.',
            offset: 'Zero-based result offset (default 0). Increase this to fetch the next batch when truncated=true.',
            limit: 'Maximum number of documents to return (default 100, max 200).',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (context, input) => {
            await this.policy.assertKnowledgeReadAccess(context, context.manager);
            const result = await this.knowledge.search(
              { q: input.query, offset: input.offset, limit: input.limit },
              { manager: context.manager },
            );
            return {
              items: (result.items || []).map((item: any): AiKnowledgeSearchResultDto => ({
                id: item.id,
                ref: `DOC-${item.item_number}`,
                title: item.title,
                summary: item.summary ?? null,
                status: item.status,
                snippet: item.snippet ?? null,
                library: {
                  id: item.library_id ?? null,
                  name: item.library_name ?? null,
                },
                updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null,
              })),
              total: result.total ?? 0,
              offset: result.offset ?? input.offset,
              limit: result.limit ?? input.limit,
              returned: Array.isArray(result.items) ? result.items.length : 0,
              truncated: result.truncated === true,
            };
          },
        },
      ],
      [
        'get_document',
        {
          name: 'get_document',
          description: 'Return one knowledge document using a stable AI-oriented DTO.',
          inputSchema: GetDocumentInputSchema,
          inputSummary: {
            document_id: 'The document UUID or DOC-123 reference.',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (context, input) => {
            await this.policy.assertKnowledgeReadAccess(context, context.manager);
            const document = await this.knowledge.get(input.document_id, { manager: context.manager });
            if (!document) {
              throw new NotFoundException('Document not found.');
            }
            const result: AiDocumentDto = {
              id: document.id,
              ref: document.item_ref ?? `DOC-${document.item_number}`,
              title: document.title,
              summary: document.summary ?? null,
              status: document.status,
              content_markdown: document.content_markdown ?? '',
              updated_at: document.updated_at ? new Date(document.updated_at).toISOString() : null,
              library: {
                id: document.library_id ?? null,
                name: document.library_name ?? null,
                slug: document.library_slug ?? null,
              },
              folder: {
                id: document.folder_id ?? null,
                name: document.folder_name ?? null,
              },
              document_type: {
                id: document.document_type_id ?? null,
                name: document.document_type_name ?? null,
              },
              relations: {
                applications: (document.relations?.applications || []).map((row: any) => toDocumentRelation('applications', row)),
                assets: (document.relations?.assets || []).map((row: any) => toDocumentRelation('assets', row)),
                projects: (document.relations?.projects || []).map((row: any) => toDocumentRelation('projects', row)),
                requests: (document.relations?.requests || []).map((row: any) => toDocumentRelation('requests', row)),
                tasks: (document.relations?.tasks || []).map((row: any) => toDocumentRelation('tasks', row)),
              },
              contributors: (document.contributors || []).map((row: any) => ({
                name: row.user_name ?? 'Unknown user',
                role: row.role,
                is_primary: row.is_primary === true,
              })),
            };
            return result;
          },
        },
      ],
      [
        'web_search',
        {
          name: 'web_search',
          description: 'Search the web for current information. Use when you need up-to-date facts, EOL dates, product details, or any information not available in the KANAP database.',
          inputSchema: WebSearchInputSchema,
          inputSummary: {
            query: 'Web search query using only generic, publicly meaningful terms.',
            count: 'Number of results to return (1–10, default 5).',
          },
          surfaces: ['chat', 'mcp'],
          readOnly: true,
          execute: async (_context, input) => {
            const results = await this.braveSearch.search(input.query, { count: input.count });
            return { items: results, total: results.length };
          },
        },
      ],
    ]);
  }

  private getRegisteredDefinitions(): AiToolDefinition<any, any>[] {
    return Array.from(this.definitions.values());
  }

  private getDefinition(toolName: string): AiToolDefinition<any, any> {
    const definition = this.definitions.get(toolName as AiToolName);
    if (!definition) {
      throw new NotFoundException('Unknown AI tool.');
    }
    return definition;
  }

  listRegisteredTools(): Array<{
    name: AiToolName;
    description: string;
    inputSummary: Record<string, string>;
    surfaces: string[];
    readOnly: boolean;
  }> {
    return this.getRegisteredDefinitions().map((definition) => ({
      name: definition.name,
      description: definition.description,
      inputSummary: definition.inputSummary,
      surfaces: [...definition.surfaces],
      readOnly: definition.readOnly,
    }));
  }

  private async isToolAvailable(
    toolName: AiToolName,
    context: AiExecutionContextWithManager,
    availability?: { readableEntityTypes: string[]; canReadKnowledge: boolean; webSearchEnabled: boolean },
  ): Promise<boolean> {
    // Lazy-load availability context if not pre-computed
    const avail = availability ?? await this.loadAvailabilityContext(context);

    switch (toolName) {
      case 'search_all':
      case 'query_entities':
      case 'aggregate_entities':
      case 'get_filter_values':
        return avail.readableEntityTypes.length > 0;
      case 'get_entity_context':
        return avail.readableEntityTypes.some((type) => type !== 'documents');
      case 'search_knowledge':
      case 'get_document':
        return avail.canReadKnowledge;
      case 'web_search':
        return Features.AI_WEB_SEARCH_READY && avail.webSearchEnabled;
      default:
        return false;
    }
  }

  private async loadAvailabilityContext(context: AiExecutionContextWithManager) {
    const readableEntityTypes = await this.policy.listReadableEntityTypes(
      context,
      ['applications', 'assets', 'projects', 'requests', 'tasks', 'documents'],
      context.manager,
    );
    const canReadKnowledge = await this.policy.canReadKnowledge(context, context.manager);
    const settings = await this.settingsService.find(context.tenantId, { manager: context.manager });
    const webSearchEnabled = settings?.web_search_enabled === true;
    return { readableEntityTypes, canReadKnowledge, webSearchEnabled };
  }

  async listAvailableTools(context: AiExecutionContextWithManager): Promise<AiToolListItemDto[]> {
    await this.policy.assertSurfaceAccess(context, context.manager);

    const availability = await this.loadAvailabilityContext(context);

    const results: AiToolListItemDto[] = [];
    for (const definition of this.getRegisteredDefinitions()) {
      if (!definition.surfaces.includes(context.surface)) continue;
      if (!await this.isToolAvailable(definition.name, context, availability)) continue;
      results.push({
        name: definition.name,
        description: definition.description,
        input_summary: definition.inputSummary,
        read_only: definition.readOnly,
        surfaces: definition.surfaces,
      });
    }
    return results;
  }

  async getToolJsonSchemas(context: AiExecutionContextWithManager): Promise<AiProviderToolDef[]> {
    const available = await this.listAvailableTools(context);
    return available.map((item) => {
      const definition = this.definitions.get(item.name)!;
      const jsonSchema = zodToJsonSchema(definition.inputSchema as any, { target: 'openApi3' });
      return {
        name: definition.name,
        description: definition.description,
        parameters: jsonSchema as Record<string, unknown>,
      };
    });
  }

  async execute(
    context: AiExecutionContextWithManager,
    toolName: string,
    rawInput: unknown,
  ): Promise<unknown> {
    await this.policy.assertSurfaceAccess(context, context.manager);
    const definition = this.getDefinition(toolName);
    if (!definition.surfaces.includes(context.surface)) {
      throw new BadRequestException('AI tool is not available on this surface.');
    }

    if (!await this.isToolAvailable(definition.name, context)) {
      throw new BadRequestException('AI tool is not available.');
    }

    const parsed = definition.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return definition.execute(context, parsed.data);
  }
}
