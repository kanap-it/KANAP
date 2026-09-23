import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../i18n';
import { createAppTheme } from '../../../config/ThemeContext';
import SteeringStrip, { type SteeringSummary } from './SteeringStrip';

const get = vi.fn();
vi.mock('../../../api', () => ({ default: { get: (...args: any[]) => get(...args) } }));

const flow = (overrides: Partial<SteeringSummary['tasks']> = {}) => ({
  created: 0,
  closed: 0,
  reopened: 0,
  openNow: 0,
  netChange: 0,
  ...overrides,
});

const summary = (overrides: Partial<SteeringSummary> = {}): SteeringSummary => ({
  days: 30,
  startDate: '2026-08-23',
  endDate: '2026-09-21',
  tasks: flow(),
  requests: flow(),
  projects: flow(),
  attention: { overdueTasks: 0, unassignedTasks: 0, staleProjects: [] },
  ...overrides,
});

function renderStrip() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <MemoryRouter initialEntries={['/portfolio/reports']}>
          <SteeringStrip />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  try {
    window.localStorage.clear();
  } catch {
    // jsdom without storage still runs the specs on the default period.
  }
});

describe('SteeringStrip', () => {
  it('renders nothing while the first load is in flight', () => {
    get.mockReturnValue(new Promise(() => {}));
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the summary cannot be loaded', async () => {
    get.mockRejectedValue(new Error('nope'));
    const { container } = renderStrip();
    await waitFor(() => expect(get).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows one flow line per entity and hides a net change of zero', async () => {
    get.mockResolvedValue({
      data: summary({
        tasks: flow({ created: 14, closed: 9, openNow: 52, netChange: 5 }),
        requests: flow({ created: 2, closed: 2, openNow: 7, netChange: 0 }),
      }),
    });
    renderStrip();

    expect(await screen.findByText('14 created')).toBeTruthy();
    expect(screen.getByText('9 closed')).toBeTruthy();
    expect(screen.getByText('52 open')).toBeTruthy();
    expect(screen.getByText('(+5)')).toBeTruthy();
    // Requests moved as much as they closed: no parenthesis at all.
    expect(screen.queryByText('(0)')).toBeNull();
    expect(screen.getByText('Last 30 days')).toBeTruthy();
  });

  it('links created and closed to the period review on the same days and object', async () => {
    get.mockResolvedValue({
      data: summary({
        tasks: flow({ created: 14, closed: 9, openNow: 52, netChange: 5 }),
        requests: flow({ created: 2, closed: 0, openNow: 7, netChange: 2 }),
        projects: flow({ created: 0, closed: 1, openNow: 4, netChange: -1 }),
      }),
    });
    renderStrip();

    const review = (label: string) => {
      const href = screen.getByText(label).closest('a')?.getAttribute('href') ?? '';
      const [path, search] = href.split('?');
      const params = new URLSearchParams(search);
      return { path, startDate: params.get('startDate'), endDate: params.get('endDate'), entities: params.get('entities') };
    };
    await screen.findByText('14 created');
    const period = { path: '/portfolio/reports/weekly', startDate: '2026-08-23', endDate: '2026-09-21' };
    expect(review('14 created')).toEqual({ ...period, entities: 'task' });
    expect(review('9 closed')).toEqual({ ...period, entities: 'task' });
    expect(review('2 created')).toEqual({ ...period, entities: 'request' });
    expect(review('1 closed')).toEqual({ ...period, entities: 'project' });
    // A zero opens nothing.
    expect(screen.getByText('0 closed').closest('a')).toBeNull();
    expect(screen.getByText('0 created').closest('a')).toBeNull();
  });

  it('leaves out the attention line when nothing needs attention', async () => {
    get.mockResolvedValue({ data: summary() });
    renderStrip();
    await screen.findByText('Tasks');
    expect(screen.queryByText('Needs attention')).toBeNull();
  });

  it('links the overdue figure to the task list filtered on the same population', async () => {
    get.mockResolvedValue({
      data: summary({ attention: { overdueTasks: 6, unassignedTasks: 3, staleProjects: [] } }),
    });
    renderStrip();

    const href = (await screen.findByText('6 overdue tasks')).closest('a')?.getAttribute('href') ?? '';
    const [path, search] = href.split('?');
    const params = new URLSearchParams(search);
    expect(path).toBe('/portfolio/tasks');
    expect(params.get('taskScope')).toBe('all');
    expect(JSON.parse(params.get('filters') ?? '{}')).toEqual({
      status: { filterType: 'set', values: ['open', 'in_progress', 'pending', 'in_testing'] },
      related_object_type: { filterType: 'set', values: [null, 'project'] },
      due_date: { filterType: 'date', type: 'lessThan', dateFrom: '2026-09-21' },
    });
  });

  it('links the unassigned figure to the task list filtered on an empty assignee', async () => {
    get.mockResolvedValue({
      data: summary({ attention: { overdueTasks: 0, unassignedTasks: 3, staleProjects: [] } }),
    });
    renderStrip();

    const href = (await screen.findByText('3 tasks without assignee')).closest('a')?.getAttribute('href') ?? '';
    const [path, search] = href.split('?');
    const params = new URLSearchParams(search);
    expect(path).toBe('/portfolio/tasks');
    expect(params.get('taskScope')).toBe('all');
    expect(JSON.parse(params.get('filters') ?? '{}')).toEqual({
      status: { filterType: 'set', values: ['open', 'in_progress', 'pending', 'in_testing'] },
      related_object_type: { filterType: 'set', values: [null, 'project'] },
      assignee_user_id: { filterType: 'set', values: [null] },
    });
  });

  it('leaves the attention figures as plain text when they sit at zero', async () => {
    get.mockResolvedValue({
      data: summary({
        attention: {
          overdueTasks: 0,
          unassignedTasks: 0,
          staleProjects: [
            { id: 'p1', ref: 'PRJ-12', name: 'Invoice archive', status: 'in_progress', lastActivityAt: '2026-07-02' },
          ],
        },
      }),
    });
    renderStrip();

    expect((await screen.findByText('0 tasks without assignee')).closest('a')).toBeNull();
    expect(screen.getByText('0 overdue tasks').closest('a')).toBeNull();
  });

  it('opens the stale projects in a dialog instead of a list', async () => {
    get.mockResolvedValue({
      data: summary({
        attention: {
          overdueTasks: 0,
          unassignedTasks: 0,
          staleProjects: [
            { id: 'p1', ref: 'PRJ-12', name: 'Invoice archive', status: 'in_progress', lastActivityAt: '2026-07-02' },
          ],
        },
      }),
    });
    renderStrip();

    fireEvent.click(await screen.findByText('1 project without activity for 30 days'));
    expect(await screen.findByText('Projects without activity')).toBeTruthy();
    expect(screen.getByText('PRJ-12')).toBeTruthy();
    expect(screen.getByText('Invoice archive').getAttribute('href')).toBe('/portfolio/projects/PRJ-12/summary');
    // Never an ISO string: the dialog shows the short display date.
    expect(screen.getByText(/^Last activity 2 Jul/)).toBeTruthy();
  });

  it('refetches with the period the user picks', async () => {
    get.mockResolvedValue({ data: summary() });
    renderStrip();
    await screen.findByText('Tasks');
    expect(get.mock.calls[0][1]).toMatchObject({ params: expect.objectContaining({ days: 30 }) });

    fireEvent.click(screen.getByRole('tab', { name: '7 days' }));
    await waitFor(() =>
      expect(get.mock.calls.some((call) => call[1]?.params?.days === 7)).toBe(true),
    );
  });
});
