import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAiPage from './AdminAiPage';
import api from '../../api';

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../config/FeaturesContext', () => ({
  useFeatures: () => ({
    config: {
      features: {
        aiSettings: true,
        aiWebSearch: false,
      },
    },
  }),
}));

vi.mock('../../components/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={client}>
      <AdminAiPage />
    </QueryClientProvider>,
  );
}

describe('AdminAiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      switch (url) {
        case '/ai/settings':
          return Promise.resolve({
            data: {
              instance_features: { ai_chat: true, ai_mcp: true, ai_settings: true, ai_web_search: true },
              settings: {
                chat_enabled: true,
                mcp_enabled: true,
                llm_provider: 'openai',
                llm_endpoint_url: null,
                llm_model: 'gpt-4o',
                mcp_key_max_lifetime_days: 30,
                conversation_retention_days: 14,
                web_search_enabled: true,
                web_enrichment_enabled: true,
                has_llm_api_key: true,
                provider_secret_writable: true,
                provider_validation_errors: [],
                chat_ready: true,
                created_at: '2026-03-21T10:00:00.000Z',
                updated_at: '2026-03-21T10:00:00.000Z',
              },
              available_providers: [
                {
                  id: 'openai',
                  label: 'OpenAI',
                  description: 'OpenAI API',
                  capabilities: {
                    supportsStreaming: true,
                    supportsToolCalling: true,
                    requiresApiKey: true,
                    allowsCustomEndpoint: true,
                  },
                },
              ],
            },
          });
        case '/ai/admin/overview':
          return Promise.resolve({
            data: {
              totals: {
                conversations_all: 12,
                conversations_7d: 4,
                conversations_30d: 9,
                active_users_30d: 3,
              },
              usage: {
                current_month: {
                  input_tokens: 1200,
                  output_tokens: 800,
                  total_tokens: 2000,
                  message_count: 10,
                },
                last_30_days: {
                  input_tokens: 1500,
                  output_tokens: 1000,
                  total_tokens: 2500,
                  message_count: 14,
                },
              },
              recent_activity: [
                {
                  conversation_id: 'conv-1',
                  title: 'Quarterly planning',
                  user_id: 'user-1',
                  provider: 'openai',
                  model: 'gpt-4o',
                  updated_at: '2026-03-21T11:15:00.000Z',
                },
              ],
            },
          });
        case '/ai/admin/keys':
          return Promise.resolve({ data: [] });
        default:
          throw new Error(`Unexpected GET ${url}`);
      }
    });
  });

  it('renders settings and keys before the overview and hides recent activity', async () => {
    renderPage();

    const providerSettings = await screen.findByRole('heading', { name: 'Provider' });
    const mcpKeys = await screen.findByText('MCP API Keys');
    const usageOverview = await screen.findByText('Usage Overview');

    expect(await screen.findByText('Token usage')).toBeInTheDocument();
    expect(await screen.findByText('Test connection')).toBeInTheDocument();
    expect(await screen.findByText('No MCP API keys configured.')).toBeInTheDocument();
    expect(screen.queryByText('Recent activity')).not.toBeInTheDocument();
    expect(providerSettings.compareDocumentPosition(usageOverview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mcpKeys.compareDocumentPosition(usageOverview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
