import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api';
import { createAppTheme } from '../../config/ThemeContext';
import { KanapDialogProvider } from '../../components/design';
import ContributorWorkspacePage from './ContributorWorkspacePage';

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    hasLevel: () => true,
    profile: { id: 'user-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.count !== undefined ? `${key}:${opts.count}` : key),
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

vi.mock('../../i18n/useLocale', () => ({ useLocale: () => 'en' }));
vi.mock('../../components/reports/ChartCard', () => ({ default: () => <div data-testid="chart" /> }));
vi.mock('./components/ContributorTimeLog', () => ({ default: () => <div data-testid="time-log" /> }));
vi.mock('../../components/fields/CompanySelect', () => ({ default: () => <div data-testid="company-select" /> }));

const theme = createAppTheme('light');
const CONTRIBUTOR_ID = '8c744aca-52d4-4404-8079-763c1ea9a2a7';

function contributor(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTRIBUTOR_ID,
    user_id: 'user-9',
    user_display_name: 'Antoine KANDEL',
    user_email: 'antoine@example.com',
    areas_of_expertise: [],
    skills: [{ skill_id: 'skill-1', proficiency: 2 }],
    project_availability: '0.0',
    notes: 'Initial notes',
    team_id: null,
    default_source_id: null,
    default_category_id: null,
    default_stream_id: null,
    default_company_id: null,
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <KanapDialogProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/portfolio/contributors/me" element={<ContributorWorkspacePage />} />
              <Route path="/portfolio/contributors/me/:tab" element={<ContributorWorkspacePage />} />
              <Route path="/portfolio/contributors/:id" element={<ContributorWorkspacePage />} />
              <Route path="/portfolio/contributors/:id/:tab" element={<ContributorWorkspacePage />} />
            </Routes>
            <LocationProbe />
          </MemoryRouter>
        </KanapDialogProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function mockGets(selfConfig: unknown | 'missing' = 'missing') {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === `/portfolio/team-members/${CONTRIBUTOR_ID}`) return { data: contributor() };
    if (url === '/portfolio/team-members/me') {
      if (selfConfig === 'missing') {
        const error: any = new Error('Not found');
        error.response = { status: 404 };
        throw error;
      }
      return { data: selfConfig };
    }
    if (url.endsWith('/time-stats')) return { data: { userId: 'user-9', averageProjectDays: 0, monthly: [] } };
    if (url === '/portfolio/teams') return { data: [] };
    if (url === '/portfolio/team-members') return { data: { items: [contributor()] } };
    if (url === '/portfolio/skills') {
      return { data: { items: [{ id: 'skill-1', category: 'Business applications', name: 'Office suite', enabled: true }] } };
    }
    if (url === '/portfolio/classification/all') return { data: { sources: [], categories: [], streams: [] } };
    if (url === '/companies') return { data: { items: [] } };
    return { data: null };
  });
}

function notesField() {
  return screen.getByPlaceholderText('portfolio:workspace.contributor.placeholders.notes') as HTMLTextAreaElement;
}

describe('ContributorWorkspacePage autosave', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    mockGets();
  });

  it('keeps a zero availability instead of falling back to the default', async () => {
    renderAt(`/portfolio/contributors/${CONTRIBUTOR_ID}`);
    const hits = await screen.findAllByText('portfolio:workspace.contributor.values.daysPerMonthShort:0');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('an edit made while a save is in flight survives that save', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    vi.mocked(api.patch)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { id: CONTRIBUTOR_ID } });

    renderAt(`/portfolio/contributors/${CONTRIBUTOR_ID}`);
    const field = await waitFor(() => notesField());
    fireEvent.change(field, { target: { value: 'first' } });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(api.patch).toHaveBeenLastCalledWith(`/portfolio/team-members/${CONTRIBUTOR_ID}`, { notes: 'first' });

    // Second edit while the first PATCH is still pending.
    fireEvent.change(notesField(), { target: { value: 'first second' } });
    await act(async () => { resolveFirst({ data: contributor({ notes: 'first' }) }); });

    expect(notesField().value).toBe('first second');
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(api.patch).toHaveBeenLastCalledWith(`/portfolio/team-members/${CONTRIBUTOR_ID}`, { notes: 'first second' });
    expect(notesField().value).toBe('first second');
  });

  it('a failed save shows the error, rolls the cache back and blocks the tab change', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('boom'));
    renderAt(`/portfolio/contributors/${CONTRIBUTOR_ID}`);
    const field = await waitFor(() => notesField());
    const getCallsBefore = vi.mocked(api.get).mock.calls.filter(([url]) => url === `/portfolio/team-members/${CONTRIBUTOR_ID}`).length;

    fireEvent.change(field, { target: { value: 'will fail' } });
    fireEvent.click(screen.getByRole('tab', { name: 'portfolio:workspace.contributor.tabs.skills' }));

    await screen.findByRole('alert');
    expect(screen.getByTestId('location').textContent).toBe(`/portfolio/contributors/${CONTRIBUTOR_ID}`);
    await waitFor(() => {
      const refetches = vi.mocked(api.get).mock.calls.filter(([url]) => url === `/portfolio/team-members/${CONTRIBUTOR_ID}`).length;
      expect(refetches).toBeGreaterThan(getCallsBefore);
    });
    await waitFor(() => expect(notesField().value).toBe('Initial notes'));
  });

  it('creates the self-service config on the first save and adopts its id', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'new-config' } });
    renderAt('/portfolio/contributors/me');
    const field = await waitFor(() => notesField());
    fireEvent.change(field, { target: { value: 'hello' } });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/portfolio/team-members/me', { notes: 'hello' }), { timeout: 2000 });
    await waitFor(() => {
      expect(vi.mocked(api.get).mock.calls.some(([url]) => url === '/portfolio/team-members/new-config/time-stats')).toBe(true);
    });
  });

  it('redirects legacy /defaults links to the general tab', async () => {
    renderAt(`/portfolio/contributors/${CONTRIBUTOR_ID}/defaults`);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(`/portfolio/contributors/${CONTRIBUTOR_ID}`));
  });
});
