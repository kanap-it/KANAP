import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../../config/ThemeContext';
import type { ItOpsSettings } from '../../../services/itOpsSettings';
import ClassificationCatalogSettings from './ClassificationCatalogSettings';

const serviceMocks = vi.hoisted(() => ({
  previewClassificationSettings: vi.fn(),
  updateItOpsSettings: vi.fn(),
}));

vi.mock('../../../services/itOpsSettings', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/itOpsSettings')>(),
  previewClassificationSettings: serviceMocks.previewClassificationSettings,
  updateItOpsSettings: serviceMocks.updateItOpsSettings,
}));

const settings = {
  businessCriticalityLevels: [
    { code: 'high', label: 'High', description: 'Up to one day', rank: 3, maxMtdMinutes: 1440 },
  ],
  businessMtdPresets: [240, 1440],
  cyberCriticalityLevels: [
    { code: 'critical', label: 'Critical', description: 'Catastrophic consequences', rank: 4 },
  ],
  dataClasses: [
    { code: 'restricted', label: 'Restricted', description: 'Strict disclosure controls', rank: 4 },
  ],
  recoveryWaves: [
    { code: 'vital', label: 'V1 — Vital activities', description: 'Restore vital activities', order: 1 },
  ],
  classificationVersions: { business: 1, cyber: 1, confidentiality: 1, recovery: 1 },
  classificationSettingsRevision: 7,
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
  return screen.getByRole('textbox', { name: 'Allowed MTD durations in minutes' });
}

describe('ClassificationCatalogSettings MTD presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.previewClassificationSettings.mockResolvedValue({
      affectedApplications: 0,
      transitions: [],
      classificationVersions: settings.classificationVersions,
      classificationSettingsRevision: 7,
    });
  });

  it('preserves an incomplete comma-separated draft and disables preview', () => {
    const input = renderSettings();

    fireEvent.change(input, { target: { value: '240, 1440, ' } });

    expect(input).toHaveValue('240, 1440, ');
    expect(screen.getByRole('button', { name: 'Preview impact' })).toBeDisabled();
    expect(serviceMocks.previewClassificationSettings).not.toHaveBeenCalled();
  });

  it('previews a complete draft as the exact numeric preset list', async () => {
    const input = renderSettings();
    fireEvent.change(input, { target: { value: '240, 1440, 4320' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview impact' }));

    await waitFor(() => expect(serviceMocks.previewClassificationSettings).toHaveBeenCalledOnce());
    expect(serviceMocks.previewClassificationSettings).toHaveBeenCalledWith(expect.objectContaining({
      businessMtdPresets: [240, 1440, 4320],
      expectedClassificationSettingsRevision: 7,
    }));
  });

  it.each(['240, 240', '240, 0', '240, -60'])('disallows invalid preset list %s', (value) => {
    const input = renderSettings();

    fireEvent.change(input, { target: { value } });

    expect(input).toHaveValue(value);
    expect(screen.getByRole('button', { name: 'Preview impact' })).toBeDisabled();
  });
});
