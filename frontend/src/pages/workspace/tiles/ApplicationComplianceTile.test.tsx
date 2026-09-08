import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import '../../../i18n';
import { createAppTheme } from '../../../config/ThemeContext';
import ApplicationComplianceTile, { applicationsListPath, type ApplicationComplianceSummary } from './ApplicationComplianceTile';

const summaryRef: { current: ApplicationComplianceSummary } = {
  current: {
    total: 12, reviewed: 5, stale: 3, incomplete: 4,
    attention: { critical_without_recent_test: 2, critical_without_wave: 0, restricted_data_low_cyber: 1 },
    levels: { critical: ['critical'], restricted_data: ['restricted'], low_cyber: ['low'] },
  },
};

vi.mock('../../../api', () => ({
  default: { get: vi.fn(async () => ({ data: summaryRef.current })) },
}));

function Landing() {
  const location = useLocation();
  return <div data-testid="landing">{location.pathname}{location.search}</div>;
}

function renderTile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<ApplicationComplianceTile />} />
            <Route path="/it/applications" element={<Landing />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ApplicationComplianceTile', () => {
  it('shows progress, the three review states and only the attention points with a count', async () => {
    renderTile();
    expect(await screen.findByText('5 of 12 applications reviewed')).toBeTruthy();
    expect(screen.getByText('Reviewed')).toBeTruthy();
    expect(screen.getByText('To review')).toBeTruthy();
    expect(screen.getByText('To complete')).toBeTruthy();
    expect(screen.getByText(/2 most critical applications without a recovery test/)).toBeTruthy();
    expect(screen.getByText(/1 application with the most confidential data/)).toBeTruthy();
    expect(screen.queryByText(/without a recovery wave/)).toBeNull();
  });

  it('deep-links an attention point to the applications list with catalog codes as filter values', async () => {
    renderTile();
    fireEvent.click(await screen.findByText(/1 application with the most confidential data/));
    const landing = screen.getByTestId('landing').textContent || '';
    expect(landing.startsWith('/it/applications?')).toBe(true);
    const params = new URLSearchParams(landing.slice('/it/applications'.length));
    expect(params.get('appScope')).toBe('all');
    expect(JSON.parse(params.get('filters') || '{}')).toEqual({
      data_class: { filterType: 'set', values: ['restricted'] },
      cyber_criticality: { filterType: 'set', values: ['low'] },
    });
  });

  it('renders the empty state when the user sees no application', async () => {
    summaryRef.current = { ...summaryRef.current, total: 0, reviewed: 0, stale: 0, incomplete: 0 };
    renderTile();
    expect(await screen.findByText('No application to classify yet')).toBeTruthy();
  });

  it('encodes a null set-filter value for applications without a wave', () => {
    const path = applicationsListPath({ recovery_wave: { filterType: 'set', values: [null] } });
    const params = new URLSearchParams(path.split('?')[1]);
    expect(JSON.parse(params.get('filters') || '{}')).toEqual({ recovery_wave: { filterType: 'set', values: [null] } });
  });
});
