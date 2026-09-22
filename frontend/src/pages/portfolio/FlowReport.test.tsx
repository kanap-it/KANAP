import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    <div
      data-testid="chart"
      data-series={options.series.map((s: any) => s.yKey).join(',')}
      data-labels={options.data.map((row: any) => row.label).join('|')}
    />
  ),
}));

const period = (periodStart: string, periodEnd: string, created: number, closed: number, openAtEnd: number) => ({
  periodStart,
  periodEnd,
  created,
  closed,
  openAtEnd,
});

const tasksPeriods = [
  period('2026-06-29', '2026-07-05', 4, 1, 10),
  period('2026-07-06', '2026-07-12', 2, 3, 9),
  period('2026-07-13', '2026-07-19', 5, 2, 12),
];

const monthPeriods = (openAtEnd: number[]) => [
  period('2025-11-01', '2025-11-30', 1, 0, openAtEnd[0]),
  period('2025-12-01', '2025-12-31', 0, 1, openAtEnd[1]),
  period('2026-01-01', '2026-01-31', 2, 0, openAtEnd[2]),
];

const stageItem = (
  ref: string,
  status: string,
  bucket: string,
  over: Record<string, unknown> = {},
) => ({
  id: `id-${ref}`,
  ref,
  itemPath: `/portfolio/${ref.startsWith('REQ') ? 'requests' : 'projects'}/${ref}/summary`,
  name: `Item ${ref}`,
  status,
  statusSince: '2026-05-04',
  bucket,
  ...over,
});

const emptyBuckets = { underOneMonth: 0, oneToThreeMonths: 0, threeToSixMonths: 0, overSixMonths: 0 };

const stageRow = (status: string, buckets: Record<string, number>, over: Record<string, unknown> = {}) => ({
  status,
  buckets: { ...emptyBuckets, ...buckets },
  total: Object.values(buckets).reduce((sum, value) => sum + value, 0),
  ...over,
});

const report = (over: Record<string, unknown> = {}) => ({
  weeks: 13,
  months: 12,
  startDate: '2026-06-29',
  monthsStartDate: '2025-11-01',
  endDate: '2026-07-19',
  timeZone: 'Europe/Paris',
  asOf: '2026-07-19T10:00:00.000Z',
  flow: {
    tasks: { granularity: 'week', periods: tasksPeriods, openNow: 12 },
    requests: { granularity: 'month', periods: monthPeriods([3, 2, 4]), openNow: 4 },
    projects: { granularity: 'month', periods: monthPeriods([6, 7, 6]), openNow: 6 },
  },
  age: {
    tasks: {
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
    requests: {
      rows: [
        stageRow('pending_review', { underOneMonth: 2 }),
        stageRow('candidate', {}),
        stageRow('approved', { overSixMonths: 1 }),
        stageRow('on_hold', { oneToThreeMonths: 1 }),
      ],
      total: stageRow('total', { underOneMonth: 2, oneToThreeMonths: 1, overSixMonths: 1 }),
      items: [
        stageItem('REQ-1', 'pending_review', 'underOneMonth'),
        stageItem('REQ-2', 'pending_review', 'underOneMonth'),
        stageItem('REQ-3', 'approved', 'overSixMonths'),
        stageItem('REQ-4', 'on_hold', 'oneToThreeMonths'),
      ],
    },
    projects: {
      rows: [
        stageRow('waiting_list', { underOneMonth: 1 }, { plannedEndPassed: 0 }),
        stageRow('planned', { threeToSixMonths: 2 }, { plannedEndPassed: 2 }),
        stageRow('in_progress', { oneToThreeMonths: 3 }, { plannedEndPassed: 1 }),
        stageRow('in_testing', {}, { plannedEndPassed: 0 }),
        stageRow('on_hold', {}, { plannedEndPassed: 0 }),
      ],
      total: stageRow(
        'total',
        { underOneMonth: 1, oneToThreeMonths: 3, threeToSixMonths: 2 },
        { plannedEndPassed: 3 },
      ),
      items: [
        stageItem('PRJ-1', 'waiting_list', 'underOneMonth', { plannedEnd: null, plannedEndPassed: false }),
        stageItem('PRJ-2', 'planned', 'threeToSixMonths', { plannedEnd: '2026-03-31', plannedEndPassed: true }),
        stageItem('PRJ-3', 'planned', 'threeToSixMonths', { plannedEnd: '2026-04-30', plannedEndPassed: true }),
        stageItem('PRJ-4', 'in_progress', 'oneToThreeMonths', { plannedEnd: '2026-02-28', plannedEndPassed: true }),
        stageItem('PRJ-5', 'in_progress', 'oneToThreeMonths', { plannedEnd: '2027-01-31', plannedEndPassed: false }),
        stageItem('PRJ-6', 'in_progress', 'oneToThreeMonths', { plannedEnd: null, plannedEndPassed: false }),
      ],
    },
  },
  leadTime: {
    tasks: { closedCount: 6, medianDays: 12.4 },
    tasksByType: [{ taskTypeId: 'type-bug', taskTypeName: 'Bug', closedCount: 6, medianDays: 12.4 }],
    requests: {
      closedCount: 5,
      medianDays: 21,
      converted: { closedCount: 3, medianDays: 18.5 },
      rejected: { closedCount: 2, medianDays: 30 },
    },
    projects: {
      closedCount: 0,
      medianDays: null,
      done: { closedCount: 0, medianDays: null, withPlannedEnd: 0, medianOverrunDays: null },
    },
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

/** The clickable figures that open a list inside the report, not a page. */
function figureButtons(text: string, root: HTMLElement | null = null): HTMLElement[] {
  const scope = root ? within(root) : screen;
  return scope.getAllByRole('button').filter((node) => node.textContent?.trim() === text);
}

/** The grid sitting under one of the section subtitles. */
function gridUnder(title: string): HTMLElement {
  return screen.getByText(title).parentElement!.querySelector('.ag-root') as HTMLElement;
}

/** The list the report opens under the stage grids. */
function openPanel(): HTMLElement {
  return screen.getByText('Close').closest('div')!.parentElement as HTMLElement;
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
    expect(screen.getByText('Flow')).toBeTruthy();
    // Requests and projects count from the first month of their own window.
    expect(screen.getByText('+1 since Nov 2025')).toBeTruthy();
    expect(screen.getByText('No change since Nov 2025')).toBeTruthy();
    expect(screen.getAllByText('open today')).toHaveLength(3);

    // One small multiple per entity: the tasks chart reads in weeks, the other two in months.
    const charts = screen.getAllByTestId('chart');
    expect(charts).toHaveLength(3);
    expect(charts[0].getAttribute('data-series')).toBe('created,closed');
    expect(charts[0].getAttribute('data-labels')).toBe('29 Jun|6 Jul|13 Jul');
    // The year comes back on the column that changes year, and only there.
    expect(charts[1].getAttribute('data-labels')).toBe('Nov 2025|Dec|Jan 2026');
    expect(charts[2].getAttribute('data-labels')).toBe('Nov 2025|Dec|Jan 2026');

    // The open figure opens the matching list, narrowed to its open scope.
    const tasksLink = [...new Set(hrefsFor('12'))];
    expect(tasksLink).toHaveLength(1);
    expect(tasksLink[0]).toContain('/portfolio/tasks?taskScope=all');
    expect(tasksLink[0]).toContain('"status":{"filterType":"set","values":["open","in_progress","pending","in_testing"]}');
    expect(linkHref('4', (href) => href.startsWith('/portfolio/requests'))).toContain('requestScope=all');
    expect(linkHref('6', (href) => href.startsWith('/portfolio/projects') && !href.includes('planned_end'))).toContain(
      'projectScope=all',
    );
  });

  it('carries the two horizons in one request and remembers both', async () => {
    window.localStorage.setItem('kanap.portfolioReports.flowWeeks', '26');
    window.localStorage.setItem('kanap.portfolioReports.flowMonths', '24');
    mockApi(report());
    renderReport();

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get.mock.calls[0][1].params.weeks).toBe(26);
    expect(get.mock.calls[0][1].params.months).toBe(24);
    expect(typeof get.mock.calls[0][1].params.tz).toBe('string');

    const [tasksFilter, itemsFilter] = screen.getAllByRole('combobox');

    fireEvent.mouseDown(tasksFilter);
    fireEvent.click(await screen.findByRole('option', { name: '8 weeks' }));
    await waitFor(() =>
      expect(window.localStorage.getItem('kanap.portfolioReports.flowWeeks')).toBe('8'),
    );

    fireEvent.mouseDown(itemsFilter);
    fireEvent.click(await screen.findByRole('option', { name: '6 months' }));
    await waitFor(() =>
      expect(window.localStorage.getItem('kanap.portfolioReports.flowMonths')).toBe('6'),
    );

    const last = get.mock.calls[get.mock.calls.length - 1][1].params;
    expect(last.weeks).toBe(8);
    expect(last.months).toBe(6);
  });

  it('opens the figures as two tables, one per grain', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('See the table')).toBeTruthy());
    expect(screen.queryByText('Tasks created')).toBeNull();

    fireEvent.click(screen.getByText('See the table'));

    await waitFor(() => expect(screen.getByText('Tasks created')).toBeTruthy());
    expect(screen.getByText('Tasks by week')).toBeTruthy();
    expect(screen.getByText('Requests and projects by month')).toBeTruthy();
    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent?.trim() ?? '');
    expect(headers).toContain('Week');
    expect(headers).toContain('Month');
    expect(headers).toContain('Projects open');

    // A created cell opens that period's weekly report; the stock at the end is not a link.
    expect(hrefsFor('4')).toContain('/portfolio/reports/weekly?startDate=2026-06-29&endDate=2026-07-05');
    expect(screen.getAllByRole('link').filter((node) => node.textContent?.trim() === '10')).toHaveLength(0);

    fireEvent.click(screen.getByText('Hide the table'));
    await waitFor(() => expect(screen.queryByText('Tasks created')).toBeNull());
  });

  it('links an age cell to the task list holding exactly that count', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getByText('No type')).toBeTruthy());

    expect(screen.getByText('Age of open work')).toBeTruthy();
    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent?.trim() ?? '');
    expect(headers).toContain('0–7 d');
    expect(headers).toContain('Over 90 d');

    // Bug, 31–90 days: today is 2026-07-19, so the bracket runs from 2026-04-20 to 2026-06-18.
    const cell = linkHref('3', (href) => href.includes('"values":["Bug"]') && href.includes('inRange'));
    expect(cell).toContain('/portfolio/tasks?taskScope=all');
    expect(cell).toContain(
      '"created_at":{"filterType":"date","type":"inRange","dateFrom":"2026-04-20","dateTo":"2026-06-18"}',
    );

    // A zero is never a link nor a button: the list would open on nothing.
    expect(screen.getAllByRole('link').some((node) => node.textContent?.trim() === '0')).toBe(false);
    expect(figureButtons('0')).toHaveLength(0);
  });

  it('shows how long the open requests and projects have been in their stage', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Pending review').length).toBeGreaterThan(0));

    expect(screen.getByText('Requests by stage')).toBeTruthy();
    expect(screen.getByText('Projects by stage')).toBeTruthy();
    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent?.trim() ?? '');
    expect(headers).toContain('Stage');
    expect(headers).toContain('Under 1 month');
    expect(headers).toContain('Over 6 months');
    expect(headers).toContain('Planned end passed');

    // The stages read as the labels the lists use, never as a raw status value.
    expect(screen.getAllByText('Pending review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting list').length).toBeGreaterThan(0);
    expect(screen.queryByText('pending_review')).toBeNull();

    // A stage total opens the list narrowed to that single stage.
    const inProgress = linkHref(
      '3',
      (href) => href.startsWith('/portfolio/projects') && href.includes('"values":["in_progress"]'),
    );
    expect(inProgress).toContain('/portfolio/projects?projectScope=all');
    expect(inProgress).toContain('"status":{"filterType":"set","values":["in_progress"]}');
    expect(inProgress).not.toContain('planned_end');
  });

  it('sends a planned-end figure to the project list with the exact filter model', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Waiting list').length).toBeGreaterThan(0));

    // Planned, planned end passed: the stage plus "planned end before the report's today".
    const planned = linkHref('2', (href) => href.includes('planned_end') && href.includes('"values":["planned"]'));
    expect(planned).toBe(
      '/portfolio/projects?projectScope=all&filters=' +
        '{"status":{"filterType":"set","values":["planned"]},' +
        '"planned_end":{"filterType":"date","type":"lessThan","dateFrom":"2026-07-19"}}',
    );

    // On the total row the scope stays the whole open population, the date filter is the same.
    const total = linkHref(
      '3',
      (href) => href.includes('planned_end') && href.includes('"values":["waiting_list","planned"'),
    );
    expect(total).toContain(
      '"status":{"filterType":"set","values":["waiting_list","planned","in_progress","in_testing","on_hold"]}',
    );
    expect(total).toContain('"planned_end":{"filterType":"date","type":"lessThan","dateFrom":"2026-07-19"}');
  });

  it('opens a list inside the report for a bracket cell, and closes it again', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Waiting list').length).toBeGreaterThan(0));
    expect(screen.queryByText('Close')).toBeNull();

    // In progress, 1 to 3 months: three projects, and the header says so.
    const projects = gridUnder('Projects by stage');
    fireEvent.click(figureButtons('3', projects)[0]);

    await waitFor(() => expect(screen.getByText('In progress · 1 to 3 months · 3')).toBeTruthy());
    expect(screen.getByText('Item PRJ-4')).toBeTruthy();
    expect(screen.getByText('Item PRJ-5')).toBeTruthy();
    expect(screen.getByText('Item PRJ-6')).toBeTruthy();
    expect(screen.queryByText('Item PRJ-2')).toBeNull();
    expect(linkHref('PRJ-4')).toBe('/portfolio/projects/PRJ-4/summary');
    expect(screen.getAllByText('In this stage since 4 May').length).toBe(3);
    // A project past its planned end says so; one still inside its window does not.
    expect(screen.getByText('Planned end 28 Feb · past due')).toBeTruthy();
    expect(screen.getByText('Planned end 31 Jan 2027')).toBeTruthy();

    // Only one panel at a time: another cell replaces the open one.
    fireEvent.click(figureButtons('2', projects)[0]);
    await waitFor(() => expect(screen.getByText('Planned · 3 to 6 months · 2')).toBeTruthy());
    expect(screen.queryByText('In progress · 1 to 3 months · 3')).toBeNull();

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Planned · 3 to 6 months · 2')).toBeNull());
  });

  it('reads a request bracket and the total row of a stage grid', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Pending review').length).toBeGreaterThan(0));

    // Pending review, under 1 month: the two requests the figure counted.
    const requests = gridUnder('Requests by stage');
    fireEvent.click(figureButtons('2', requests)[0]);
    await waitFor(() => expect(screen.getByText('Pending review · Under 1 month · 2')).toBeTruthy());
    expect(screen.getByText('Item REQ-1')).toBeTruthy();
    // Requests carry no planned end, so the list never mentions one.
    expect(within(openPanel()).queryByText(/Planned end/)).toBeNull();

    // The total row of the same column gathers every stage of that bracket.
    fireEvent.click(figureButtons('2', requests)[1]);
    await waitFor(() => expect(screen.getByText('Requests · Under 1 month · 2')).toBeTruthy());
  });

  it('breaks the median time to close down by outcome and by completion', async () => {
    mockApi(report());
    renderReport();

    await waitFor(() => expect(screen.getAllByText('12.4 d').length).toBeGreaterThan(0));

    expect(screen.getByText('Median time to close')).toBeTruthy();
    expect(linkHref('over 6 closings')).toBe(
      '/portfolio/reports/weekly?startDate=2026-06-29&endDate=2026-07-19',
    );
    // A monthly tile carries its horizon and opens the whole month window.
    expect(linkHref('over 5 closings · 12 months')).toBe(
      '/portfolio/reports/weekly?startDate=2025-11-01&endDate=2026-07-19',
    );

    expect(screen.getByText('Requests by outcome')).toBeTruthy();
    expect(screen.getByText('Converted')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('18.5 d')).toBeTruthy();
    expect(screen.getByText('30 d')).toBeTruthy();

    // Projects closed nothing: an em dash, a plain sentence, and no link at all.
    expect(screen.getByText('Completed projects')).toBeTruthy();
    expect(screen.getByText('No closing in this period')).toBeTruthy();
    expect(screen.getAllByRole('link').some((node) => node.textContent?.includes('closing in this period'))).toBe(false);
  });

  it('shows the completed-project figures when projects did close', async () => {
    const base = report();
    mockApi({
      ...base,
      leadTime: {
        ...base.leadTime,
        projects: {
          closedCount: 4,
          medianDays: 180,
          done: { closedCount: 2, medianDays: 210.4, withPlannedEnd: 2, medianOverrunDays: 32 },
        },
      },
    });
    renderReport();

    await waitFor(() => expect(screen.getByText('210.4 d')).toBeTruthy());
    expect(screen.getByText('Completed projects')).toBeTruthy();
    const grid = screen.getByText('Median gap to planned end').closest('.ag-root') as HTMLElement;
    expect(within(grid).getByText('210.4 d')).toBeTruthy();
    expect(within(grid).getByText('32 d over 2 with a planned end')).toBeTruthy();
  });

  it('says so when nothing is open and nothing closed', async () => {
    const emptyStage = (statuses: string[], withPlannedEnd: boolean) => ({
      rows: statuses.map((status) => stageRow(status, {}, withPlannedEnd ? { plannedEndPassed: 0 } : {})),
      total: stageRow('total', {}, withPlannedEnd ? { plannedEndPassed: 0 } : {}),
      items: [],
    });

    mockApi(
      report({
        age: {
          tasks: {
            rows: [],
            total: {
              taskTypeId: null,
              taskTypeName: null,
              buckets: { upTo7: 0, from8To30: 0, from31To90: 0, over90: 0 },
              total: 0,
            },
          },
          requests: emptyStage(['pending_review', 'candidate', 'approved', 'on_hold'], false),
          projects: emptyStage(['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold'], true),
        },
        leadTime: {
          tasks: { closedCount: 0, medianDays: null },
          tasksByType: [],
          requests: {
            closedCount: 0,
            medianDays: null,
            converted: { closedCount: 0, medianDays: null },
            rejected: { closedCount: 0, medianDays: null },
          },
          projects: {
            closedCount: 0,
            medianDays: null,
            done: { closedCount: 0, medianDays: null, withPlannedEnd: 0, medianOverrunDays: null },
          },
        },
      }),
    );
    renderReport();

    await waitFor(() => expect(screen.getAllByText('Waiting list').length).toBeGreaterThan(0));
    expect(screen.getByText('No open task to report.')).toBeTruthy();
    expect(screen.getByText('No task closed in this period.')).toBeTruthy();
    expect(screen.getAllByText('No closing in this period')).toHaveLength(3);
    // Every figure of the stage grids is a zero, so none of them is clickable.
    expect(figureButtons('0')).toHaveLength(0);
    expect(screen.getAllByRole('link').some((node) => node.textContent?.trim() === '0')).toBe(false);
  });
});
