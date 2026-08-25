import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAiPage from './AdminAiPage';
import { createAppTheme } from '../../config/ThemeContext';
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
        builtinAiProvider: false,
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
    <ThemeProvider theme={createAppTheme('light')}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminAiPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
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
                provider_source: 'custom',
                chat_model_config_id: 'model-1',
                llm_provider: 'openai',
                llm_endpoint_url: null,
                llm_model: 'gpt-4o',
                mcp_key_max_lifetime_days: 30,
                conversation_retention_days: 14,
                web_search_enabled: true,
                glpi_enabled: true,
                glpi_url: 'https://glpi.internal/',
                has_glpi_user_token: true,
                has_glpi_app_token: true,
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
        case '/ai/model-configs':
          return Promise.resolve({
            data: {
              model_configs: [
                {
                  id: 'model-1',
                  name: 'Claude production',
                  provider: 'anthropic',
                  model: 'claude-sonnet-5',
                  endpoint_url: null,
                  has_api_key: true,
                  supports_vision: true,
                  price_input_eur_per_mtok: 3,
                  price_output_eur_per_mtok: 15,
                  llm_timeout_ms: null,
                  status: 'active',
                  is_default: true,
                  used_by: { chat: true, agents: [] },
                  messages_this_month: 12,
                  validation_errors: [],
                  created_at: '2026-03-21T10:00:00.000Z',
                  updated_at: '2026-03-21T10:00:00.000Z',
                },
              ],
              secret_writable: true,
            },
          });
        case '/ai/admin/keys':
          return Promise.resolve({ data: [] });
        default:
          throw new Error(`Unexpected GET ${url}`);
      }
    });
  });

  it('renders the model selector with the assigned registry model and no usage overview', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Provider' });
    expect(await screen.findByText('Model used by Plaid')).toBeInTheDocument();
    expect(await screen.findByText('Claude production')).toBeInTheDocument();
    expect(await screen.findByText('No MCP API keys configured.')).toBeInTheDocument();
    // The token/usage overview moved to the dedicated Usage & costs page.
    expect(screen.queryByText('Usage Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Token usage')).not.toBeInTheDocument();
  });
});
