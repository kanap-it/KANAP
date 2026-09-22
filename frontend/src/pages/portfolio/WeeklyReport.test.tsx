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

const hasLevel = vi.fn();
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ hasLevel: (...args: any[]) => hasLevel(...args) }) }));

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

const EMPTY_FILTER_VALUES = { sources: [], categories: [], streams: [], taskTypes: [] };

function mockApi(data: unknown, filterValues: unknown = EMPTY_FILTER_VALUES) {
  get.mockImplementation((url: string) => {
    if (url === '/portfolio/reports/weekly/filter-values') {
      return Promise.resolve({ data: filterValues });
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

const taskRow = (over: Record<string, unknown> = {}) => ({
  taskId: 't1',
  ref: 'T-1',
  itemPath: '/portfolio/tasks/T-1/overview',
  name: 'Tune the cellar probes',
  sourceId: null,
  sourceName: null,
  categoryId: null,
  categoryName: null,
  streamId: null,
  streamName: null,
  status: 'open',
  createdAt: '2026-09-15',
  eventAt: '2026-09-15',
  changes: null,
  taskTypeId: null,
  taskTypeName: null,
  priority: 70,
  ...over,
});

const emptyPersonLists = () => ({ created: [], modified: [], closed: [] });

const person = (over: Record<string, unknown> = {}) => ({
  userId: 'u-thomas',
  name: 'Thomas Berger',
  contributorRef: 'CTR-3',
  loggedDays: { project: 2, other: 1.5, total: 3.5 },
  ...emptyPersonLists(),
  ...over,
});

const byPersonPayload = () => ({
  teams: [
    {
      teamId: 'team-ops',
      teamName: 'Operations',
      totals: { created: 1, modified: 0, closed: 1, loggedDays: 3.5 },
      members: [
        person({
          created: [taskRow()],
          closed: [taskRow({ taskId: 't2', ref: 'T-2', name: 'Replace the ripening sensor', status: 'done' })],
        }),
      ],
    },
  ],
  unassigned: {
    created: [],
    modified: [],
    closed: [taskRow({ taskId: 't3', ref: 'T-3', name: 'Archive the old batches', status: 'done' })],
  },
});

beforeEach(() => {
  get.mockReset();
  hasLevel.mockReset();
  hasLevel.mockReturnValue(true);
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

  it('opens on the source and the category carried by the URL', async () => {
    // The flow report links here with the classification its figure was read under.
    mockApi(
      report({
        requests: {
          created: [requestRow({ sourceId: 'src-desk', sourceName: 'Service desk', categoryId: 'cat-run', categoryName: 'Run' })],
          modified: [],
          closed: [],
        },
      }),
      {
        sources: [{ id: 'src-desk', name: 'Service desk' }, { id: 'src-mail', name: 'Email' }],
        categories: [{ id: 'cat-run', name: 'Run' }, { id: 'cat-build', name: 'Build' }],
        streams: [],
        taskTypes: [],
      },
    );
    renderReport(
      '/portfolio/reports/weekly?startDate=2026-09-14&endDate=2026-09-20&sourceIds=src-desk&categoryIds=cat-run',
    );

    await waitFor(() => expect(get).toHaveBeenCalledWith('/portfolio/reports/weekly', expect.anything()));
    const call = get.mock.calls.find(([url]: any[]) => url === '/portfolio/reports/weekly');
    expect(call?.[1]?.params?.sourceIds).toBe('src-desk');
    expect(call?.[1]?.params?.categoryIds).toBe('cat-run');
    // The filter bar shows the narrowing rather than claiming the whole portfolio, and it
    // survives the first render, when neither the values nor the rows have arrived yet.
    await waitFor(() => expect(screen.getAllByText('1 selected').length).toBe(2));
    expect(screen.queryByText('All sources')).toBeNull();
    expect(screen.queryByText('All categories')).toBeNull();
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

describe('WeeklyReport by person', () => {
  const personReport = () =>
    report({
      tasks: {
        created: [taskRow()],
        modified: [],
        closed: [
          taskRow({ taskId: 't2', ref: 'T-2', name: 'Replace the ripening sensor', status: 'done' }),
          taskRow({ taskId: 't3', ref: 'T-3', name: 'Archive the old batches', status: 'done' }),
        ],
      },
      byPerson: byPersonPayload(),
    });

  it('asks the API for the by-person reading and remembers the choice', async () => {
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('By person')).toBeTruthy());
    fireEvent.click(screen.getByText('By person'));

    await waitFor(() => {
      const weeklyCalls = get.mock.calls.filter(([url]: any[]) => url === '/portfolio/reports/weekly');
      const call = weeklyCalls[weeklyCalls.length - 1];
      expect(call?.[1]?.params?.groupBy).toBe('person');
    });
    expect(window.localStorage.getItem('kanap.portfolioReports.weeklyGroupBy')).toBe('person');
  });

  it('opens on the by-person reading carried by the URL, over the remembered one', async () => {
    // The "Activity by person" card of the hub opens this same page with `groupBy=person`.
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'type');
    mockApi(personReport());
    renderReport('/portfolio/reports/weekly?groupBy=person');

    await waitFor(() => expect(screen.getByText('Operations')).toBeTruthy());
    const call = get.mock.calls.find(([url]: any[]) => url === '/portfolio/reports/weekly');
    expect(call?.[1]?.params?.groupBy).toBe('person');
    expect(screen.getAllByText('Period review').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('kanap.portfolioReports.weeklyGroupBy')).toBe('person');
  });

  it('opens on the remembered reading, team first, then person, with the counts and the time', async () => {
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('Operations')).toBeTruthy());

    expect(screen.getByText('Requests and projects stay in the by-type view.')).toBeTruthy();
    expect(screen.getByText('Thomas Berger')).toBeTruthy();
    expect(screen.getByText('CTR-3')).toBeTruthy();
    expect(screen.getByText('1 created · 0 modified · 1 closed · 3.5 days logged')).toBeTruthy();
    expect(
      screen.getByText('1 created · 0 modified · 1 closed · Time logged 3.5 d (project 2.0 · other 1.5)'),
    ).toBeTruthy();
    expect(screen.getByText('Tune the cellar probes')).toBeTruthy();
    expect(screen.getByText('Replace the ripening sensor')).toBeTruthy();
  });

  it('says nothing about time for a person who logged none', async () => {
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(
      report({
        byPerson: {
          teams: [
            {
              teamId: 'team-ops',
              teamName: 'Operations',
              totals: { created: 1, modified: 0, closed: 0, loggedDays: 0 },
              members: [
                person({
                  userId: 'u-isabelle',
                  name: 'Isabelle Moreau',
                  contributorRef: 'CTR-4',
                  loggedDays: { project: 0, other: 0, total: 0 },
                  created: [taskRow({ taskId: 't4', ref: 'T-4', name: 'Label the new cave' })],
                }),
              ],
            },
          ],
          unassigned: emptyPersonLists(),
        },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getByText('Isabelle Moreau')).toBeTruthy());
    expect(screen.getByText('1 created · 0 modified · 0 closed')).toBeTruthy();
    expect(screen.queryByText(/Time logged/)).toBeNull();
  });

  it('gathers what nobody carried under Unassigned', async () => {
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('Unassigned')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Archive the old batches')).toBeTruthy());
    expect(screen.getByText('0 created · 0 modified · 1 closed')).toBeTruthy();
  });

  it('folds a person and remembers it', async () => {
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('Thomas Berger')).toBeTruthy());

    const toggle = screen.getByText('Thomas Berger').closest('button') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    expect(window.localStorage.getItem('kanap.portfolioReports.weeklyCollapsedPeople')).toBe(
      JSON.stringify(['person:u-thomas']),
    );
  });

  it('hides the contributor reference from a reader without the portfolio settings right', async () => {
    hasLevel.mockReturnValue(false);
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('Thomas Berger')).toBeTruthy());
    expect(screen.queryByText('CTR-3')).toBeNull();
  });

  it('exports the reading shown on screen', async () => {
    window.localStorage.setItem('kanap.portfolioReports.weeklyGroupBy', 'person');
    mockApi(personReport());
    renderReport();

    await waitFor(() => expect(screen.getByText('Operations')).toBeTruthy());
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() =>
      expect(get.mock.calls.some(([url]: any[]) => url === '/portfolio/reports/weekly/export')).toBe(true),
    );
    const call = get.mock.calls.find(([url]: any[]) => url === '/portfolio/reports/weekly/export');
    expect(call?.[1]?.params?.groupBy).toBe('person');
    expect(call?.[1]?.params?.format).toBe('csv');
  });
});
