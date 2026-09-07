import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../../config/ThemeContext';
import type { ItOpsSettings } from '../../../services/itOpsSettings';
import ClassificationCatalogSettings from './ClassificationCatalogSettings';

const serviceMocks = vi.hoisted(() => ({
  updateItOpsSettings: vi.fn(),
}));

vi.mock('../../../services/itOpsSettings', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/itOpsSettings')>(),
  updateItOpsSettings: serviceMocks.updateItOpsSettings,
}));

const settings = {
  businessCriticalityLevels: [
    { code: 'critical', label: 'Critical', description: 'At most four hours', rank: 3, maxMtdMinutes: 240 },
    { code: 'high', label: 'High', description: 'Up to one day', rank: 2, maxMtdMinutes: 1440 },
    { code: 'low', label: 'Low', description: 'More than a day', rank: 1, maxMtdMinutes: null },
  ],
  cyberCriticalityLevels: [
    { code: 'critical', label: 'Critical', description: 'Catastrophic consequences', rank: 4 },
  ],
  dataClasses: [
    { code: 'restricted', label: 'Restricted', description: 'Strict disclosure controls', rank: 4 },
  ],
  recoveryWaves: [
    { code: 'vital', label: 'V1 — Vital activities', description: 'Restore vital activities', order: 1 },
  ],
} as unknown as ItOpsSettings;

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <ClassificationCatalogSettings settings={settings} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit catalog' }));
}

describe('ClassificationCatalogSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.updateItOpsSettings.mockResolvedValue(settings);
  });

  it('saves in one step, with the rows in their displayed order', async () => {
    renderSettings();
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(serviceMocks.updateItOpsSettings).toHaveBeenCalledTimes(1));
    const payload = serviceMocks.updateItOpsSettings.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(['businessCriticalityLevels', 'cyberCriticalityLevels', 'dataClasses', 'recoveryWaves']);
    expect(payload.businessCriticalityLevels.map((level: any) => level.code)).toEqual(['critical', 'high', 'low']);
  });

  it('reorders with the arrows and lets the server derive ranks from the new order', async () => {
    renderSettings();
    const moveUp = screen.getAllByRole('button', { name: 'Move up' });
    const moveDown = screen.getAllByRole('button', { name: 'Move down' });
    expect(moveUp[0]).toBeDisabled();
    expect(moveDown[2]).toBeDisabled();
    fireEvent.click(moveUp[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(serviceMocks.updateItOpsSettings).toHaveBeenCalledTimes(1));
    const payload = serviceMocks.updateItOpsSettings.mock.calls[0][0];
    expect(payload.businessCriticalityLevels.map((level: any) => level.code)).toEqual(['high', 'critical', 'low']);
  });

  it('keeps the downtime optional and disables saving while a level has no name', () => {
    renderSettings();
    const downtimes = screen.getAllByRole('spinbutton', { name: 'Maximum tolerable downtime (minutes)' });
    expect(downtimes[2]).toHaveValue(null);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Name' })[0], { target: { value: ' ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
