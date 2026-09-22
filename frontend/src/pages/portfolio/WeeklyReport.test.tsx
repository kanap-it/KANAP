import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { ThemeModeProvider, createAppTheme } from '../../config/ThemeContext';
import WeeklyReport from './WeeklyReport';

/** This jsdom build ships no Storage. The page guards against that; the specs need one. */
if (!window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    },
  });
}

const get = vi.fn();
vi.mock('../../api', () => ({ default: { get: (...args: any[]) => get(...args) } }));

const emptyLists = () => ({ created: [], modified: [], closed: [] });

const requestRow = (over: Record<string, unknown> = {}) => ({
  requestId: 'r1',
  ref: 'REQ-5',
  itemPath: '/portfolio/requests/REQ-5/summary',
  name: 'Cave climate digital twin',
  sourceId: null,
  sourceName: null,
  categoryId: null,
  categoryName: null,
  streamId: null,
  streamName: null,
  status: 'converted',
  createdAt: '2026-09-10',
  eventAt: '2026-09-14',
  changes: null,
  ...over,
});

const projectRow = (over: Record<string, unknown> = {}) => ({
  projectId: 'p1',
  ref: 'PRJ-16',
  itemPath: '/portfolio/projects/PRJ-16/summary',
  name: 'Cheese grading rollout',
  sourceId: null,
  sourceName: null,
  categoryId: null,
  categoryName: null,
  streamId: null,
  streamName: null,
  status: 'planned',
  createdAt: '2026-09-14',
  eventAt: '2026-09-14',
  changes: null,
  priority: 70,
  progress: 0,
  origin: null,
  originValue: 'fast_track',
  ...over,
});

const report = (over: Record<string, unknown> = {}) => ({
  requests: emptyLists(),
  projects: emptyLists(),
  tasks: emptyLists(),
  ...over,
});

function mockApi(data: unknown) {
  get.mockImplementation((url: string) => {
    if (url === '/portfolio/reports/weekly/filter-values') {
      return Promise.resolve({ data: { sources: [], categories: [], streams: [], taskTypes: [] } });
    }
    return Promise.resolve({ data });
  });
}

function renderReport(entry = '/portfolio/reports/weekly') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeModeProvider>
        <ThemeProvider theme={createAppTheme('light')}>
          <MemoryRouter initialEntries={[entry]}>
            <WeeklyReport />
          </MemoryRouter>
        </ThemeProvider>
      </ThemeModeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  window.localStorage.clear();
});

describe('WeeklyReport', () => {
  it('shows the three sections in the owner order, each with created, modified and closed', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('No request created in this period.')).toBeTruthy());

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual(['Requests', 'Projects', 'Tasks']);

    expect(screen.getAllByText('Created (0)')).toHaveLength(3);
    expect(screen.getAllByText('Modified (0)')).toHaveLength(3);
    expect(screen.getAllByText('Closed (0)')).toHaveLength(3);
  });

  it('keeps an empty list on a single line and renders a grid only when there are rows', async () => {
    mockApi(report({ requests: { created: [requestRow()], modified: [], closed: [] } }));
    renderReport();

    await waitFor(() => expect(screen.getByText('Cave climate digital twin')).toBeTruthy());

    expect(screen.getByText('Created (1)')).toBeTruthy();
    expect(screen.getByText('REQ-5')).toBeTruthy();
    expect(screen.getByText('No request modified in this period.')).toBeTruthy();
    expect(screen.getByText('No request closed in this period.')).toBeTruthy();
  });

  it('summarises every entity as created, modified and closed', async () => {
    mockApi(
      report({
        requests: { created: [requestRow()], modified: [], closed: [requestRow()] },
        projects: { created: [projectRow()], modified: [], closed: [] },
      }),
    );
    renderReport();

    await waitFor(() =>
      expect(
        screen.getByText(/Requests 1 created · 0 modified · 1 closed/),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/Projects 1 created · 0 modified · 0 closed/)).toBeTruthy();
    expect(screen.getByText(/Tasks 0 created · 0 modified · 0 closed/)).toBeTruthy();
  });

  it('shows the source request of a converted project, and the KANAP origin label otherwise', async () => {
    mockApi(
      report({
        projects: {
          created: [
            projectRow(),
            projectRow({ projectId: 'p3', ref: 'PRJ-18', name: 'Old cellar mapping', originValue: 'legacy' }),
            projectRow({
              projectId: 'p2',
              ref: 'PRJ-17',
              name: 'Smart packaging',
              originValue: 'standard',
              origin: {
                ref: 'REQ-2',
                name: 'Smart packaging automation',
                itemPath: '/portfolio/requests/REQ-2/summary',
              },
            }),
          ],
          modified: [],
          closed: [],
        },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getByText('Smart packaging')).toBeTruthy());
    expect(screen.getByText('Fast-track')).toBeTruthy();
    expect(screen.getByText('Legacy')).toBeTruthy();
    expect(screen.getByText('REQ-2')).toBeTruthy();
    expect(screen.getByText('Smart packaging automation')).toBeTruthy();
    expect(screen.queryByText('Created directly')).toBeNull();
  });

  it('lists an item created and closed in the same period in both grids', async () => {
    mockApi(
      report({
        requests: {
          created: [requestRow({ eventAt: '2026-09-10' })],
          modified: [],
          closed: [requestRow({ eventAt: '2026-09-14' })],
        },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Cave climate digital twin')).toHaveLength(2));
    expect(screen.getByText('Created (1)')).toBeTruthy();
    expect(screen.getByText('Closed (1)')).toBeTruthy();
    expect(screen.getByText('No request modified in this period.')).toBeTruthy();
  });

  it('shows the creation day before the closing day in a closed list', async () => {
    mockApi(
      report({
        requests: { created: [], modified: [], closed: [requestRow({ eventAt: '2026-09-14' })] },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getByText('Cave climate digital twin')).toBeTruthy());

    const headers = screen
      .getAllByRole('columnheader')
      .map((node) => node.textContent?.trim() ?? '');
    expect(headers).toContain('Created on');
    expect(headers).toContain('Closed on');
    expect(headers.indexOf('Created on')).toBeLessThan(headers.indexOf('Closed on'));
    expect(screen.getByText('10 Sep')).toBeTruthy();
    expect(screen.getByText('14 Sep')).toBeTruthy();
  });

  it('folds a group, keeps its counts in the title row and remembers the choice', async () => {
    mockApi(report({ requests: { created: [requestRow()], modified: [], closed: [] } }));
    const view = renderReport();

    await waitFor(() => expect(screen.getByText('Cave climate digital twin')).toBeTruthy());

    const requestsHeading = screen.getAllByRole('heading', { level: 2 })[0];
    const toggle = within(requestsHeading).getByRole('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    expect(window.localStorage.getItem('kanap.portfolioReports.weekly.collapsed.requests')).toBe('1');
    expect(screen.getByText('1 created · 0 modified · 0 closed')).toBeTruthy();

    view.unmount();
    mockApi(report({ requests: { created: [requestRow()], modified: [], closed: [] } }));
    renderReport();

    await waitFor(() =>
      expect(
        screen.getAllByRole('heading', { level: 2 })[0].querySelector('button')?.getAttribute('aria-expanded'),
      ).toBe('false'),
    );
  });

  it('opens on the period carried by the URL, and ignores a day that does not exist', async () => {
    mockApi(report());
    renderReport('/portfolio/reports/weekly?startDate=2026-08-17&endDate=2026-08-23');

    await waitFor(() => expect(get).toHaveBeenCalledWith('/portfolio/reports/weekly', expect.anything()));
    const call = get.mock.calls.find(([url]: any[]) => url === '/portfolio/reports/weekly');
    expect(call?.[1]?.params?.startDate).toBe('2026-08-17');
    expect(call?.[1]?.params?.endDate).toBe('2026-08-23');

    get.mockReset();
    mockApi(report());
    renderReport('/portfolio/reports/weekly?startDate=2026-02-31&endDate=nope');

    await waitFor(() => expect(get).toHaveBeenCalledWith('/portfolio/reports/weekly', expect.anything()));
    const fallback = get.mock.calls.find(([url]: any[]) => url === '/portfolio/reports/weekly');
    expect(fallback?.[1]?.params?.startDate).not.toBe('2026-02-31');
    expect(fallback?.[1]?.params?.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('spells out what changed on a modified row', async () => {
    mockApi(
      report({
        requests: {
          created: [],
          modified: [
            requestRow({
              status: 'approved',
              eventAt: '2026-09-15',
              changes: {
                statusFrom: 'candidate',
                statusTo: 'approved',
                changedFields: ['priority_score', 'target_delivery_date'],
              },
            }),
          ],
          closed: [],
        },
      }),
    );
    renderReport();

    await waitFor(() =>
      expect(
        screen.getByText('Candidate → Approved, Priority score, Target delivery date'),
      ).toBeTruthy(),
    );
  });
});
