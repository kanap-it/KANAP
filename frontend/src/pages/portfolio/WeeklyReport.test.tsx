import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { ThemeModeProvider, createAppTheme } from '../../config/ThemeContext';
import WeeklyReport from './WeeklyReport';

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
  eventAt: '2026-09-14',
  changes: null,
  priority: 70,
  progress: 0,
  origin: null,
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

function renderReport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeModeProvider>
        <ThemeProvider theme={createAppTheme('light')}>
          <MemoryRouter initialEntries={['/portfolio/reports/weekly']}>
            <WeeklyReport />
          </MemoryRouter>
        </ThemeProvider>
      </ThemeModeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
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

  it('shows the origin of a project converted from a request, and "Created directly" otherwise', async () => {
    mockApi(
      report({
        projects: {
          created: [
            projectRow(),
            projectRow({
              projectId: 'p2',
              ref: 'PRJ-17',
              name: 'Smart packaging',
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
    expect(screen.getByText('Created directly')).toBeTruthy();
    expect(screen.getByText('REQ-2')).toBeTruthy();
    expect(screen.getByText('Smart packaging automation')).toBeTruthy();
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
