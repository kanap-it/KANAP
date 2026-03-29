import React from 'react';
import { render } from '@testing-library/react';
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
});
