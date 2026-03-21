import * as assert from 'node:assert/strict';
import { AiSystemPromptService } from '../ai-system-prompt.service';

async function testStructuredReadGuidancePrefersQueryLayerTools() {
  const service = new AiSystemPromptService();

  const prompt = service.build({
    tenantName: 'Test Tenant',
    availableTools: [
      {
        name: 'query_entities',
        description: 'Query structured entity data.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat'],
      },
      {
        name: 'aggregate_entities',
        description: 'Aggregate structured entity data.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat'],
      },
      {
        name: 'get_filter_values',
        description: 'Discover exact filter values.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat'],
      },
      {
        name: 'search_all',
        description: 'Fuzzy cross-entity search.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat'],
      },
    ],
    readableEntityTypes: ['tasks', 'projects', 'documents'],
  });

  assert.match(prompt, /\bquery_entities\b/);
  assert.match(prompt, /\baggregate_entities\b/);
  assert.match(prompt, /\bget_filter_values\b/);
  assert.doesNotMatch(prompt, /\blist_entities\b/);
  assert.doesNotMatch(prompt, /always search first/i);
}

async function run() {
  await testStructuredReadGuidancePrefersQueryLayerTools();
}

void run();
