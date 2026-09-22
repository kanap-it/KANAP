import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../i18n';
import { createAppTheme } from '../../../config/ThemeContext';
import AssigneeAttentionBlock, { type AssigneeAttention } from './AssigneeAttentionBlock';

const get = vi.fn();
vi.mock('../../../api', () => ({ default: { get: (...args: any[]) => get(...args) } }));

const hasLevel = vi.fn();
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasLevel: (...args: any[]) => hasLevel(...args) }) }));

const TASK_SCOPE = {
  status: { filterType: 'set', values: ['open', 'in_progress', 'pending', 'in_testing'] },
  related_object_type: { filterType: 'set', values: [null, 'project'] },
};

const report = (overrides: Partial<AssigneeAttention> = {}): AssigneeAttention => ({
  staleDays: 14,
  asOf: '2026-09-22',
  staleBefore: '2026-09-08',
  teams: [
    {
      teamId: 'team-1',
      teamName: 'Business applications',
      open: 13,
      overdue: 8,
      stale: 10,
      members: [
        { userId: 'u1', name: 'Alice Martin', contributorRef: 'CTR-12', open: 9, overdue: 5, stale: 6 },
        { userId: 'u2', name: 'Bob Durand', contributorRef: null, open: 4, overdue: 3, stale: 4 },
      ],
    },
    {
      teamId: null,
      teamName: null,
      open: 1,
      overdue: 0,
      stale: 1,
      members: [{ userId: 'u3', name: 'Chloé Blanc', contributorRef: null, open: 1, overdue: 0, stale: 1 }],
    },
  ],
  unassigned: { open: 3, overdue: 0, stale: 3 },
  totals: { open: 17, overdue: 8, stale: 14 },
  ...overrides,
});

function renderBlock() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <MemoryRouter initialEntries={['/portfolio/reports']}>
          <AssigneeAttentionBlock />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** The filter model a figure links with, read back from its href. */
const filtersOf = (element: Element | null | undefined) => {
  const anchor = element?.closest('a') ?? element?.querySelector('a');
  const href = anchor?.getAttribute('href') ?? '';
  const [path, search] = href.split('?');
  const params = new URLSearchParams(search);
  return { path, scope: params.get('taskScope'), filters: JSON.parse(params.get('filters') ?? '{}') };
};

const rowOf = (label: string) => screen.getByText(label).closest('tr') as HTMLElement;

beforeEach(() => {
  get.mockReset();
  hasLevel.mockReset();
  hasLevel.mockReturnValue(true);
  try {
    window.localStorage.clear();
  } catch {
    // jsdom without storage still runs the specs on the default window.
  }
});

describe('AssigneeAttentionBlock', () => {
  it('renders nothing while the first load is in flight', () => {
    get.mockReturnValue(new Promise(() => {}));
    const { container } = renderBlock();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the teams, their members and the sums of each group', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();

    expect(await screen.findByText('By assignee')).toBeTruthy();
    expect(screen.getByText('Business applications')).toBeTruthy();
    // The people without a team come last, under a plain label.
    expect(screen.getByText('No team')).toBeTruthy();
    expect(screen.getByText('Alice Martin')).toBeTruthy();
    expect(screen.getByText('Unassigned')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();

    const team = rowOf('Business applications');
    expect(within(team).getByText('13')).toBeTruthy();
    expect(within(team).getByText('8')).toBeTruthy();
    expect(within(team).getByText('10')).toBeTruthy();

    // The header reads the same totals as the Total row.
    expect(screen.getByText('17 open')).toBeTruthy();
    expect(screen.getByText('8 overdue')).toBeTruthy();
    expect(screen.getByText('14 without movement')).toBeTruthy();
    expect(screen.getByText('3 unassigned')).toBeTruthy();
  });

  it('links each figure of a person to the list filtered on the same population', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();

    await screen.findByText('Alice Martin');
    const row = rowOf('Alice Martin');
    const open = filtersOf(within(row).getByText('9'));
    expect(open.path).toBe('/portfolio/tasks');
    expect(open.scope).toBe('all');
    expect(open.filters).toEqual({
      ...TASK_SCOPE,
      assignee_user_id: { filterType: 'set', values: ['u1'] },
    });

    expect(filtersOf(within(row).getByText('5')).filters).toEqual({
      ...TASK_SCOPE,
      assignee_user_id: { filterType: 'set', values: ['u1'] },
      due_date: { filterType: 'date', type: 'lessThan', dateFrom: '2026-09-22' },
    });

    expect(filtersOf(within(row).getByText('6')).filters).toEqual({
      ...TASK_SCOPE,
      assignee_user_id: { filterType: 'set', values: ['u1'] },
      updated_at: { filterType: 'date', type: 'lessThan', dateFrom: '2026-09-08' },
    });
  });

  it('links a team to every one of its members and the unassigned line to the empty value', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();

    await screen.findByText('Business applications');
    const team = rowOf('Business applications');
    expect(filtersOf(await within(team).findByText('13')).filters).toEqual({
      ...TASK_SCOPE,
      assignee_user_id: { filterType: 'set', values: ['u1', 'u2'] },
    });

    const unassigned = rowOf('Unassigned');
    // The open column, not the equally valued "no movement" one.
    expect(filtersOf(within(unassigned).getAllByRole('cell')[1]).filters).toEqual({
      ...TASK_SCOPE,
      assignee_user_id: { filterType: 'set', values: [null] },
    });
  });

  it('never links a zero', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();

    await screen.findByText('Unassigned');
    const unassigned = rowOf('Unassigned');
    expect(within(unassigned).getByText('0').closest('a')).toBeNull();
  });

  it('shows one line and nothing else when no task is open', async () => {
    get.mockResolvedValue({
      data: report({ teams: [], unassigned: { open: 0, overdue: 0, stale: 0 }, totals: { open: 0, overdue: 0, stale: 0 } }),
    });
    renderBlock();

    expect(await screen.findByText('No open task')).toBeTruthy();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('folds a team away and refetches with the window the user picks', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();

    await screen.findByText('Alice Martin');
    fireEvent.click(screen.getByText('Business applications'));
    await waitFor(() => expect(screen.queryByText('Alice Martin')).toBeNull());

    expect(get.mock.calls[0][1]).toMatchObject({ params: expect.objectContaining({ staleDays: 14 }) });
    fireEvent.click(screen.getByRole('tab', { name: '7 days' }));
    await waitFor(() => expect(get.mock.calls.some((call) => call[1]?.params?.staleDays === 7)).toBe(true));
  });

  it('opens the contributor page from the reference of a member', async () => {
    get.mockResolvedValue({ data: report() });
    renderBlock();
    expect((await screen.findByText('CTR-12')).getAttribute('href')).toBe('/portfolio/contributors/CTR-12');
  });

  it('drops the contributor reference for a reader of the reports alone', async () => {
    hasLevel.mockReturnValue(false);
    get.mockResolvedValue({ data: report() });
    renderBlock();
    await screen.findByText('Alice Martin');
    expect(screen.queryByText('CTR-12')).toBeNull();
  });
});
