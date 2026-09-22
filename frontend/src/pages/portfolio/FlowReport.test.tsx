import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { ThemeModeProvider, createAppTheme } from '../../config/ThemeContext';
import FlowReport from './FlowReport';

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

// jsdom has no canvas, so the real chart cannot paint. The specs are about the figures and the
// links around it; the chart keeps its own visual verification in the browser.
vi.mock('ag-charts-react', () => ({
  AgChartsReact: ({ options }: { options: any }) => (
    <div data-testid="chart" data-series={options.series.map((s: any) => s.yKey).join(',')} />
  ),
}));

const week = (weekStart: string, weekEnd: string, created: number, closed: number, openAtEnd: number) => ({
  weekStart,
  weekEnd,
  created,
  closed,
  openAtEnd,
});

const tasksWeeks = [
  week('2026-06-29', '2026-07-05', 4, 1, 10),
  week('2026-07-06', '2026-07-12', 2, 3, 9),
  week('2026-07-13', '2026-07-19', 5, 2, 12),
];

const report = (over: Record<string, unknown> = {}) => ({
  weeks: 13,
  startDate: '2026-06-29',
  endDate: '2026-07-19',
  timeZone: 'Europe/Paris',
  asOf: '2026-07-19T10:00:00.000Z',
  flow: {
    tasks: { weeks: tasksWeeks, openNow: 12 },
    requests: {
      weeks: [
        week('2026-06-29', '2026-07-05', 1, 0, 3),
        week('2026-07-06', '2026-07-12', 0, 1, 2),
        week('2026-07-13', '2026-07-19', 2, 0, 4),
      ],
      openNow: 4,
    },
    projects: {
      weeks: [
        week('2026-06-29', '2026-07-05', 0, 0, 6),
        week('2026-07-06', '2026-07-12', 1, 0, 7),
        week('2026-07-13', '2026-07-19', 0, 1, 6),
      ],
      openNow: 6,
    },
  },
  age: {
    rows: [
      {
        taskTypeId: 'type-bug',
        taskTypeName: 'Bug',
        buckets: { upTo7: 1, from8To30: 2, from31To90: 3, over90: 0 },
        total: 6,
      },
      {
        taskTypeId: null,
        taskTypeName: null,
        buckets: { upTo7: 0, from8To30: 1, from31To90: 0, over90: 5 },
        total: 6,
      },
    ],
    total: {
      taskTypeId: null,
      taskTypeName: null,
      buckets: { upTo7: 1, from8To30: 3, from31To90: 3, over90: 5 },
      total: 12,
    },
  },
  leadTime: {
    tasks: { closedCount: 6, medianDays: 12.4 },
    tasksByType: [{ taskTypeId: 'type-bug', taskTypeName: 'Bug', closedCount: 6, medianDays: 12.4 }],
    requests: { closedCount: 1, medianDays: 3 },
    projects: { closedCount: 0, medianDays: null },
  },
  ...over,
});

function mockApi(data: unknown) {
  get.mockImplementation(() => Promise.resolve({ data }));
}

function renderReport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeModeProvider>
        <ThemeProvider theme={createAppTheme('light')}>
          <MemoryRouter initialEntries={['/portfolio/reports/flow']}>
            <FlowReport />
          </MemoryRouter>
        </ThemeProvider>
      </ThemeModeProvider>
    </QueryClientProvider>,
  );
}

/** Every link reading exactly `text`, href decoded so the filter JSON stays readable. */
function hrefsFor(text: string): string[] {
  return screen
    .getAllByRole('link')
    .filter((node) => node.textContent?.trim() === text)
    .map((node) => decodeURIComponent(node.getAttribute('href') ?? ''));
}

/** The one distinct destination behind the links reading `text` and satisfying `match`. */
function linkHref(text: string, match: (href: string) => boolean = () => true): string {
  const found = [...new Set(hrefsFor(text).filter(match))];
  expect(found).toHaveLength(1);
  return found[0];
}

beforeEach(() => {
  get.mockReset();
  window.localStorage.clear();
});

describe('FlowReport', () => {
  it('leads with what is open today, its change over the window and a trend', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('+2 since 29 Jun')).toBeTruthy());

    // Tasks: 12 open today, 10 at the end of the first week of the window.
    expect(screen.getByText('Weekly flow')).toBeTruthy();
    expect(screen.getByText('+1 since 29 Jun')).toBeTruthy();
    expect(screen.getByText('No change since 29 Jun')).toBeTruthy();
    expect(screen.getAllByText('open today')).toHaveLength(3);
    // One small multiple per entity, each carrying the created and closed series.
    expect(screen.getAllByTestId('chart')).toHaveLength(3);
    expect(screen.getAllByTestId('chart')[0].getAttribute('data-series')).toBe('created,closed');

    // The open figure opens the matching list, narrowed to its open scope.
    // The age total opens the same unfiltered task list, so the two hrefs are one and the same.
    const tasksLink = [...new Set(hrefsFor('12'))];
    expect(tasksLink).toHaveLength(1);
    expect(tasksLink[0]).toContain('/portfolio/tasks?taskScope=all');
    expect(tasksLink[0]).toContain('"status":{"filterType":"set","values":["open","in_progress","pending","in_testing"]}');
    expect(linkHref('4')).toContain('/portfolio/requests?requestScope=all');
    expect(linkHref('6', (href) => href.startsWith('/portfolio/projects'))).toContain('projectScope=all');
  });

  it('asks the API for the stored period and remembers a new one', async () => {
    window.localStorage.setItem('kanap.portfolioReports.flowWeeks', '26');
    mockApi(report());
    renderReport();

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get.mock.calls[0][1].params.weeks).toBe(26);
    expect(typeof get.mock.calls[0][1].params.tz).toBe('string');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: '8 weeks' }));

    await waitFor(() =>
      expect(window.localStorage.getItem('kanap.portfolioReports.flowWeeks')).toBe('8'),
    );
    expect(get.mock.calls[get.mock.calls.length - 1][1].params.weeks).toBe(8);
  });

  it('opens the weekly figures as a table, where only the past stock is plain text', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('See the table')).toBeTruthy());
    expect(screen.queryByText('Tasks created')).toBeNull();

    fireEvent.click(screen.getByText('See the table'));

    await waitFor(() => expect(screen.getByText('Tasks created')).toBeTruthy());
    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent?.trim() ?? '');
    expect(headers.slice(0, 4)).toEqual(['Week', 'Tasks created', 'Tasks closed', 'Tasks open']);
    expect(headers).toContain('Projects open');

    // A created cell opens that week's weekly report; the stock at the end is not a link.
    expect(hrefsFor('4')).toContain('/portfolio/reports/weekly?startDate=2026-06-29&endDate=2026-07-05');
    const openCells = screen.getAllByRole('link').filter((node) => node.textContent?.trim() === '10');
    expect(openCells).toHaveLength(0);

    fireEvent.click(screen.getByText('Hide the table'));
    await waitFor(() => expect(screen.queryByText('Tasks created')).toBeNull());
  });

  it('links an age cell to the task list holding exactly that count', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('No type')).toBeTruthy());

    expect(screen.getByText('Age of open tasks')).toBeTruthy();
    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent?.trim() ?? '');
    expect(headers).toContain('0–7 d');
    expect(headers).toContain('Over 90 d');
    expect(screen.getAllByText('Bug').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0);

    // Bug, 31–90 days: today is 2026-07-19, so the bracket runs from 2026-04-20 to 2026-06-18.
    const cell = linkHref('3', (href) => href.includes('"values":["Bug"]') && href.includes('inRange'));
    expect(cell).toContain('/portfolio/tasks?taskScope=all');
    expect(cell).toContain('"task_type_name":{"filterType":"set","values":["Bug"]}');
    expect(cell).toContain(
      '"created_at":{"filterType":"date","type":"inRange","dateFrom":"2026-04-20","dateTo":"2026-06-18"}',
    );

    // The tasks with no type over 90 days: an open-ended bracket, and the blank set filter.
    const noType = linkHref('5', (href) => href.includes('lessThan') && href.includes('"values":[null]'));
    expect(noType).toContain('"task_type_name":{"filterType":"set","values":[null]}');
    expect(noType).toContain('"created_at":{"filterType":"date","type":"lessThan","dateFrom":"2026-04-20"}');

    // The same bracket on the total row carries no type filter at all.
    const totalOver90 = linkHref('5', (href) => href.includes('lessThan') && !href.includes('task_type_name'));
    expect(totalOver90).toContain('"created_at":{"filterType":"date","type":"lessThan","dateFrom":"2026-04-20"}');

    // A zero is never a link: the list would open on nothing.
    expect(screen.getAllByRole('link').some((node) => node.textContent?.trim() === '0')).toBe(false);
  });

  it('sends the closing count to the weekly report, and says nothing closed when nothing did', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('12.4 d').length).toBeGreaterThan(0));

    expect(screen.getByText('Median time to close')).toBeTruthy();
    expect(linkHref('over 6 closings')).toBe(
      '/portfolio/reports/weekly?startDate=2026-06-29&endDate=2026-07-19',
    );
    expect(linkHref('over 1 closing')).toBe(
      '/portfolio/reports/weekly?startDate=2026-06-29&endDate=2026-07-19',
    );

    // Projects closed nothing: an em dash, a plain sentence, and no link at all.
    expect(screen.getByText('No closing in this period')).toBeTruthy();
    expect(screen.getAllByRole('link').some((node) => node.textContent?.includes('closing in this period'))).toBe(false);
  });

  it('says so when no task is open and no task closed', async () => {
    mockApi(
      report({
        age: {
          rows: [],
          total: {
            taskTypeId: null,
            taskTypeName: null,
            buckets: { upTo7: 0, from8To30: 0, from31To90: 0, over90: 0 },
            total: 0,
          },
        },
        leadTime: {
          tasks: { closedCount: 0, medianDays: null },
          tasksByType: [],
          requests: { closedCount: 0, medianDays: null },
          projects: { closedCount: 0, medianDays: null },
        },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getByText('No open task to report.')).toBeTruthy());
    expect(screen.getByText('No task closed in this period.')).toBeTruthy();
    expect(screen.getAllByText('No closing in this period')).toHaveLength(3);
  });
});
