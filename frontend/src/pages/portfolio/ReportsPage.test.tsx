import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { createAppTheme } from '../../config/ThemeContext';
import ReportsPage from './ReportsPage';

// The two strips above the rows have their own specs; here they only take room.
vi.mock('./components/SteeringStrip', () => ({ default: () => null }));
vi.mock('./components/ClassificationGapsStrip', () => ({ default: () => null }));

const get = vi.fn();
vi.mock('../../api', () => ({ default: { get: (...args: any[]) => get(...args) } }));

function Landing() {
  const location = useLocation();
  return <div data-testid="landing">{`${location.pathname}${location.search}`}</div>;
}

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <MemoryRouter initialEntries={['/portfolio/reports']}>
          <Routes>
            <Route path="/portfolio/reports" element={<ReportsPage />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: null });
});

describe('ReportsPage', () => {
  it('reads by horizon: three titled rows, in order, with five cards', () => {
    renderHub();

    const rows = screen.getAllByRole('region');
    expect(rows.map((row) => within(row).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'What happened',
      'What is in progress',
      'What comes next',
    ]);

    const cardsOf = (index: number) =>
      within(rows[index]).getAllByRole('button').map((button) => button.querySelector('p')?.textContent);
    expect(cardsOf(0)).toEqual(['Period review', 'Activity by person']);
    expect(cardsOf(1)).toEqual(['Flow and age', 'Attention by contributor']);
    expect(cardsOf(2)).toEqual(['Capacity heatmap']);
    expect(screen.getAllByRole('button')).toHaveLength(5);

    expect(screen.queryByText(/status change/i)).toBeNull();
  });

  it('opens the period review on its by-person reading from the "Activity by person" card', () => {
    renderHub();

    fireEvent.click(screen.getByText('Activity by person'));

    expect(screen.getByTestId('landing').textContent).toBe('/portfolio/reports/weekly?groupBy=person');
  });
});
