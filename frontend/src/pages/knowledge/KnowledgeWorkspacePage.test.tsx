import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api';
import { KanapDialogProvider } from '../../components/design';
import { createAppTheme } from '../../config/ThemeContext';
import KnowledgeWorkspacePage from './KnowledgeWorkspacePage';
import { classifyKnowledgeLoadError } from './knowledgeLoadError';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', resolvedLanguage: 'en' } }),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasLevel: () => true, profile: { id: 'user-1' } }),
}));

vi.mock('../../tenant/TenantContext', () => ({
  useTenant: () => ({ tenantSlug: 'acme' }),
}));

vi.mock('../workspace/hooks/useRecentKnowledgeDocuments', () => ({
  useRecentKnowledgeDocuments: () => ({ addDocument: vi.fn() }),
}));

const theme = createAppTheme('light');
const DOC_URL = '/knowledge/DOC-9';

// jsdom in this setup exposes no localStorage; the workspace persists its
// sidebar state there.
if (!window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(),
    },
    writable: true,
  });
}

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

function workspaceTree(queryClient: QueryClient, path = '/knowledge/DOC-9') {
  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <KanapDialogProvider>
          <MemoryRouter initialEntries={['/knowledge/DOC-9']}>
            {/* `location` drives the match, so the page keeps its instance and
                simply re-renders with the next document id — the situation the
                cache-drop effect has to get right. */}
            <Routes location={path}>
              <Route path="/knowledge/:id" element={<KnowledgeWorkspacePage />} />
            </Routes>
          </MemoryRouter>
        </KanapDialogProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function renderWorkspace(queryClient: QueryClient) {
  return render(workspaceTree(queryClient));
}

describe('classifyKnowledgeLoadError', () => {
  it('separates a lost/absent document from a transient failure', () => {
    expect(classifyKnowledgeLoadError(null)).toBeNull();
    expect(classifyKnowledgeLoadError(httpError(404))).toBe('access');
    expect(classifyKnowledgeLoadError(httpError(403))).toBe('access');
    expect(classifyKnowledgeLoadError(httpError(500))).toBe('failure');
    expect(classifyKnowledgeLoadError(new Error('Network Error'))).toBe('failure');
  });
});

describe('KnowledgeWorkspacePage — document load errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === DOC_URL) throw httpError(404);
      return { data: [] } as any;
    });
  });

  it('shows a not-found state, hides the cached document and drops it on the way out', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
    // A copy read before access was revoked must never be shown again.
    queryClient.setQueryData(['knowledge', 'DOC-9'], {
      id: 'doc-9',
      title: 'Confidential incident review',
      content_markdown: 'secret',
      item_number: 9,
    });

    renderWorkspace(queryClient);

    await screen.findByText('workspace.errors.notFoundTitle');
    expect(screen.queryByText('Confidential incident review')).not.toBeInTheDocument();
    expect(screen.queryByText('common:buttons.retry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('workspace.errors.backToLibrary'));
    expect(navigateMock).toHaveBeenCalledWith('/knowledge');
    expect(queryClient.getQueryData(['knowledge', 'DOC-9'])).toBeUndefined();
  });

  it('drops the refused document on the way to another one, and only that one', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === DOC_URL) throw httpError(404);
      if (url === '/knowledge/DOC-3') throw httpError(500);
      return { data: [] } as any;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
    for (const id of ['DOC-9', 'DOC-3']) {
      queryClient.setQueryData(['knowledge', id], { id, title: `${id} title`, item_number: 1 });
      queryClient.setQueryData(['knowledge-versions', id], [{ version_number: 1 }]);
      queryClient.setQueryData(['knowledge-activities', id], [{ id: 'a1' }]);
    }

    const view = render(workspaceTree(queryClient));
    await screen.findByText('workspace.errors.notFoundTitle');

    // Navigate DOC-9 (refused) → DOC-3 without unmounting the page.
    view.rerender(workspaceTree(queryClient, '/knowledge/DOC-3'));

    await waitFor(() => expect(queryClient.getQueryData(['knowledge', 'DOC-9'])).toBeUndefined());
    expect(queryClient.getQueryData(['knowledge-versions', 'DOC-9'])).toBeUndefined();
    expect(queryClient.getQueryData(['knowledge-activities', 'DOC-9'])).toBeUndefined();

    expect(queryClient.getQueryData(['knowledge-versions', 'DOC-3'])).toBeDefined();
    expect(queryClient.getQueryData(['knowledge-activities', 'DOC-3'])).toBeDefined();
  });

  it('offers a retry on a network or server failure', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === DOC_URL) throw httpError(500);
      return { data: [] } as any;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

    renderWorkspace(queryClient);

    await screen.findByText('workspace.errors.loadFailedTitle');
    const callsBeforeRetry = vi.mocked(api.get).mock.calls.filter(([url]) => url === DOC_URL).length;
    fireEvent.click(screen.getByText('common:buttons.retry'));
    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls.filter(([url]) => url === DOC_URL).length;
      expect(calls).toBeGreaterThan(callsBeforeRetry);
    });
  });
});
