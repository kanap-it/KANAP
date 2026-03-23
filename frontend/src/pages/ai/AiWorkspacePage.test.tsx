import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiWorkspacePage from './AiWorkspacePage';
import { aiConversationsApi } from '../../ai/aiApi';
import { ChatConversation } from '../../ai/aiTypes';

let featuresState = {
  config: {
    features: {
      billing: true,
      sso: true,
      email: true,
      aiChat: true,
      aiMcp: false,
      aiSettings: false,
      aiWebSearch: false,
    },
  },
};

let chatState = {
  messages: [] as Array<{ id: string; role: 'user' | 'assistant' | 'tool'; content: string }>,
  isStreaming: false,
  error: null as string | null,
  conversationId: null as string | null,
  sendMessage: vi.fn(async () => undefined),
  loadConversation: vi.fn(async () => undefined),
  newConversation: vi.fn(),
  cancelStream: vi.fn(),
};

vi.mock('../../config/FeaturesContext', () => ({
  useFeatures: () => featuresState,
}));

vi.mock('../../ai/useChat', () => ({
  useChat: () => chatState,
}));

vi.mock('../../components/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('../../ai/components/ChatMessageList', () => ({
  default: () => <div data-testid="chat-message-list" />,
}));

vi.mock('../../ai/components/ChatConversationList', () => ({
  default: ({ onSelect, onNew, onArchive }: any) => (
    <div>
      <button type="button" onClick={() => onNew()}>New chat</button>
      <button type="button" onClick={() => onSelect('conv-1')}>Select conversation</button>
      <button type="button" onClick={() => onArchive('conv-1')}>Archive conversation</button>
    </div>
  ),
}));

vi.mock('../../ai/components/ChatInput', () => ({
  default: React.forwardRef((_props: any, _ref) => (
    <button type="button" onClick={() => _props.onSend('hello from mock')} disabled={_props.disabled}>
      Send message
    </button>
  )),
}));

vi.mock('../../ai/aiApi', () => ({
  aiConversationsApi: {
    archive: vi.fn(async () => undefined),
  },
}));

function renderPage(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <AiWorkspacePage />
    </QueryClientProvider>,
  );
}

describe('AiWorkspacePage', () => {
  beforeEach(() => {
    featuresState = {
      config: {
        features: {
          billing: true,
          sso: true,
          email: true,
          aiChat: true,
          aiMcp: false,
          aiSettings: false,
          aiWebSearch: false,
        },
      },
    };
    chatState = {
      messages: [],
      isStreaming: false,
      error: null,
      conversationId: null,
      sendMessage: vi.fn(async () => undefined),
      loadConversation: vi.fn(async () => undefined),
      newConversation: vi.fn(),
      cancelStream: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('shows the feature-gated hidden state when native chat is disabled', () => {
    featuresState = {
      config: {
        features: {
          billing: true,
          sso: true,
          email: true,
          aiChat: false,
          aiMcp: false,
          aiSettings: false,
          aiWebSearch: false,
        },
      },
    };

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    renderPage(client);

    expect(screen.getByText('Plaid')).toBeInTheDocument();
    expect(screen.getByText('Native AI chat is disabled for this instance.')).toBeInTheDocument();
  });

  it('forwards conversation selection and sends messages from the page controls', () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    renderPage(client);

    fireEvent.click(screen.getByText('Select conversation'));
    fireEvent.click(screen.getByText('Send message'));

    expect(chatState.loadConversation).toHaveBeenCalledWith('conv-1');
    expect(chatState.sendMessage).toHaveBeenCalledWith('hello from mock');
  });

  it('optimistically archives the active conversation and clears it from the query cache', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const conversations: ChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Active conversation',
        provider: 'openai',
        model: 'gpt-4o',
        created_at: '2026-03-23T10:00:00.000Z',
        updated_at: '2026-03-23T10:00:00.000Z',
      },
      {
        id: 'conv-2',
        title: 'Other conversation',
        provider: 'openai',
        model: 'gpt-4o',
        created_at: '2026-03-23T11:00:00.000Z',
        updated_at: '2026-03-23T11:00:00.000Z',
      },
    ];

    client.setQueryData(['ai-conversations'], conversations);
    chatState.conversationId = 'conv-1';

    renderPage(client);

    fireEvent.click(screen.getByText('Archive conversation'));

    await waitFor(() => {
      expect(chatState.newConversation).toHaveBeenCalledTimes(1);
      expect(aiConversationsApi.archive).toHaveBeenCalledWith('conv-1');
    });

    expect(client.getQueryData<ChatConversation[]>(['ai-conversations'])).toEqual([
      conversations[1],
    ]);
  });
});
