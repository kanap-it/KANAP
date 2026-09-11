import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api';
import { downloadXlsxWorkbook } from '../../lib/simpleXlsx';
import { createAppTheme } from '../../config/ThemeContext';
import portfolioEn from '../../locales/en/portfolio.json';
import ContributorsPage from './ContributorsPage';

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../lib/simpleXlsx', () => ({ downloadXlsxWorkbook: vi.fn() }));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasLevel: () => true, profile: { id: 'user-1' } }),
}));

function resolveKey(key: string): string | undefined {
  return key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), portfolioEn);
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const template = resolveKey(key);
      if (typeof template !== 'string') return key;
      return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));
    },
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

if (!window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() { return store.size; },
    },
  });
}

const theme = createAppTheme('light');

const CONTRIBUTORS = [{
  id: 'c-1',
  item_number: 1,
  user_id: 'u-1',
  user_display_name: 'Ada Lovelace',
  user_email: 'ada@example.com',
  areas_of_expertise: [],
  skills: [{ skill_id: 's-aws', proficiency: 4 }],
  project_availability: 5,
  team_id: null,
}];

const SKILLS = [{ id: 's-aws', category: 'Cloud', name: 'AWS', enabled: true }];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/portfolio/contributors" element={<ContributorsPage />} />
            <Route path="*" element={<div />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/portfolio/team-members') return { data: { items: CONTRIBUTORS } } as any;
    if (url === '/portfolio/teams') return { data: [] } as any;
    if (url === '/portfolio/team-members/time-stats') return { data: { stats: {} } } as any;
    if (url === '/portfolio/skills') return { data: { items: SKILLS } } as any;
    return { data: {} } as any;
  });
});

const calledUrls = () => vi.mocked(api.get).mock.calls.map(([url]) => url);

describe('ContributorsPage view switch', () => {
  it('opens on the list and leaves the skills catalogue unfetched', async () => {
    renderAt('/portfolio/contributors');
    await screen.findByText('Ada Lovelace');
    expect(screen.queryByRole('table')).toBeNull();
    expect(calledUrls()).not.toContain('/portfolio/skills');
  });

  it('opens straight on the matrix when the address asks for it', async () => {
    renderAt('/portfolio/contributors?view=matrix');
    await screen.findByRole('table');
    // Contributors hold the columns by default, so the skill is a row header.
    expect(screen.getByRole('rowheader', { name: 'AWS' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ada Lovelace' })).toBeInTheDocument();
    await waitFor(() => expect(calledUrls()).toContain('/portfolio/skills'));
  });

  it('switches to the matrix from the tab and records it in the address', async () => {
    renderAt('/portfolio/contributors');
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('tab', { name: 'Skills matrix' }));
    await screen.findByRole('table');
    expect(screen.getByTestId('search').textContent).toBe('?view=matrix');

    fireEvent.click(screen.getByRole('tab', { name: 'List' }));
    await waitFor(() => expect(screen.queryByRole('table')).toBeNull());
    // Back to the plain address so the list stays the shareable default.
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('offers Export beside Add contributor, and only on the matrix', async () => {
    renderAt('/portfolio/contributors');
    await screen.findByText('Ada Lovelace');
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Skills matrix' }));
    const exportButton = await screen.findByRole('button', { name: 'Export' });
    expect(screen.getByRole('button', { name: /Add contributor/ })).toBeInTheDocument();

    fireEvent.click(exportButton);
    expect(downloadXlsxWorkbook).toHaveBeenCalledTimes(1);
  });

  it('remembers the last view for the next visit without a view in the address', async () => {
    const first = renderAt('/portfolio/contributors');
    await screen.findByText('Ada Lovelace');
    fireEvent.click(screen.getByRole('tab', { name: 'Skills matrix' }));
    await screen.findByRole('table');
    first.unmount();

    renderAt('/portfolio/contributors');
    await screen.findByRole('table');
  });
});
