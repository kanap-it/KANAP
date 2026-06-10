import { Injectable, OnModuleInit } from '@nestjs/common';
import { ScheduledTasksService } from '../admin/scheduled-tasks/scheduled-tasks.service';
import { AiSearchIndexService } from '../ai/search-index/ai-search-index.service';

/**
 * Daily freshness backstop for the AI `search_index` table: related-entity
 * renames (user/company names embedded in indexed labels and vectors) are not
 * trigger-cascaded, so a full per-tenant reindex runs once a day.
 */
@Injectable()
export class SearchIndexReindexService implements OnModuleInit {
  constructor(
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly searchIndex: AiSearchIndexService,
  ) {}

  onModuleInit() {
    this.scheduledTasks.register({
      name: 'ai-search-index-reindex',
      description: 'Rebuilds the AI search index for every tenant (freshness backstop for related-entity renames)',
      defaultCron: '0 3 * * *',
      handler: () => this.searchIndex.reindexAllTenants(),
    });
  }
}
