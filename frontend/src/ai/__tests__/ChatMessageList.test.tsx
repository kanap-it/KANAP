import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatMessageList from '../components/ChatMessageList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      resolvedLanguage: 'en',
    },
    ready: true,
  }),
}));

describe('ChatMessageList', () => {
  it('renders the assistant text before the preview card controls', () => {
    const preview = {
      preview_id: 'preview-1',
      tool_name: 'create_document' as const,
      status: 'pending' as const,
      target: {
        entity_type: 'documents',
        entity_id: null,
        ref: null,
        title: 'Disaster Recovery Runbook',
      },
      changes: {
        title: {
          label: 'Title',
          from: null,
          to: 'Disaster Recovery Runbook',
          format: 'text' as const,
        },
      },
      requires_confirmation: true,
      actions: ['approve', 'reject'] as Array<'approve' | 'reject'>,
      summary: 'Create draft document "Disaster Recovery Runbook".',
      error_message: null,
      conversation_id: 'conversation-1',
      created_at: '2026-03-28T17:00:00.000Z',
      expires_at: '2026-03-28T17:10:00.000Z',
      approved_at: null,
      rejected_at: null,
      executed_at: null,
    };

    const { container } = render(
      <ChatMessageList
        messages={[
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Assistant proposal body',
            toolResults: [
              {
                id: 'tool-1',
                name: 'create_document',
                result: preview,
              },
            ],
          },
        ]}
        previews={[preview]}
        onSend={() => undefined}
      />,
    );

    const text = container.textContent || '';
    expect(text.indexOf('Assistant proposal body')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Assistant proposal body')).toBeLessThan(text.indexOf('Disaster Recovery Runbook'));
  });

  it('does not render before labels for creation previews with no prior values', () => {
    const preview = {
      preview_id: 'preview-1',
      tool_name: 'create_task' as const,
      status: 'pending' as const,
      target: {
        entity_type: 'tasks',
        entity_id: null,
        ref: null,
        title: 'New task',
      },
      changes: {
        title: {
          label: 'Title',
          from: null,
          to: 'New task',
          format: 'text' as const,
        },
        description: {
          label: 'Description',
          from: null,
          to: 'Task body',
          format: 'markdown' as const,
        },
      },
      requires_confirmation: true,
      actions: ['approve', 'reject'] as Array<'approve' | 'reject'>,
      summary: 'Create task "New task".',
      error_message: null,
      conversation_id: 'conversation-1',
      created_at: '2026-03-28T17:00:00.000Z',
      expires_at: '2026-03-28T17:10:00.000Z',
      approved_at: null,
      rejected_at: null,
      executed_at: null,
    };

    render(
      <ChatMessageList
        messages={[
          {
            id: 'assistant-1',
            role: 'assistant',
            content: '',
            toolResults: [
              {
                id: 'tool-1',
                name: 'create_task',
                result: preview,
              },
            ],
          },
        ]}
        previews={[preview]}
        onSend={() => undefined}
      />,
    );

    expect(screen.queryByText('ai:previewCard.before')).toBeNull();
    expect(screen.queryByText('ai:previewCard.after')).toBeNull();
  });

  it('renders assistant markdown links to internal task pages', () => {
    render(
      <ChatMessageList
        messages={[
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Created [T-115](/portfolio/tasks/task-115) from GLPI ticket #59925.',
          },
        ]}
        previews={[]}
        onSend={() => undefined}
      />,
    );

    const link = screen.getByRole('link', { name: 'T-115' });
    expect(link.getAttribute('href')).toBe('/portfolio/tasks/task-115');
  });
});
