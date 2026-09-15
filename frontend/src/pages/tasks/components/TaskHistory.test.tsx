import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../api';
import { createAppTheme } from '../../../config/ThemeContext';
import portfolioEn from '../../../locales/en/portfolio.json';
import TaskHistory from './TaskHistory';

vi.mock('../../../api', () => ({ default: { get: vi.fn() } }));

function resolveKey(key: string): string | undefined {
  return key
    .replace(/^portfolio:/, '')
    .split('.')
    .reduce<any>((node, part) => (node == null ? undefined : node[part]), portfolioEn);
}

const translate = (key: string, opts?: Record<string, unknown>) => {
  const template = resolveKey(key);
  if (typeof template !== 'string') return key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'en', resolvedLanguage: 'en' } }),
}));

vi.mock('../../../i18n/useLocale', () => ({ useLocale: () => 'en' }));

const theme = createAppTheme('light');

const changeActivity = {
  id: 'a-1',
  type: 'change',
  content: null,
  context: null,
  author_id: null,
  first_name: 'Clara',
  last_name: 'Dupont',
  created_at: '2026-08-22T11:06:49Z',
  changed_fields: { status: ['open', 'in_progress'] },
};

function renderHistory(props: { createdAt?: string; createdByName?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <TaskHistory
          taskId="t-1"
          createdAt={props.createdAt ?? '2026-08-22T11:06:40Z'}
          createdByName={props.createdByName ?? 'Thomas Berger'}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('TaskHistory', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  // Regression: the creation entry used to be memoised *after* the loading
  // return, so a render that started while activities were still loading called
  // one hook fewer than the next one. React then threw "Rendered more hooks than
  // during the previous render" and, with no error boundary, the app went blank.
  // Hence a real useQuery here: a mocked one would hide the hook mismatch.
  it('survives a loading render followed by a loaded one', async () => {
    let resolveGet: ((value: unknown) => void) | undefined;
    vi.mocked(api.get).mockImplementation(
      () => new Promise((resolve) => { resolveGet = resolve; }) as any,
    );

    renderHistory();
    expect(screen.getByText(portfolioEn.activity.messages.loadingHistory)).toBeInTheDocument();

    await act(async () => {
      resolveGet?.({ data: [changeActivity] });
    });

    await waitFor(() => {
      expect(screen.getByText(portfolioEn.activity.labels.created)).toBeInTheDocument();
    });
    expect(screen.getByText(/Changed Status:/)).toBeInTheDocument();
  });

  it('shows the creation entry even when the task has no change yet', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] } as any);
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText(portfolioEn.activity.labels.created)).toBeInTheDocument();
    });
    expect(screen.queryByText(portfolioEn.activity.messages.noHistory)).not.toBeInTheDocument();
  });

  it('places the creation after every recorded change', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [changeActivity] } as any);
    renderHistory();
    const created = await screen.findByText(portfolioEn.activity.labels.created);
    const change = screen.getByText(/Changed Status:/);
    expect(created.compareDocumentPosition(change) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('shows the empty message when there is no change and no creation date', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] } as any);
    renderHistory({ createdAt: '' });
    await waitFor(() => {
      expect(screen.getByText(portfolioEn.activity.messages.noHistory)).toBeInTheDocument();
    });
  });
});
