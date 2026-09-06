import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../../config/ThemeContext';
import ApplicationClassificationPanel, { type ApplicationClassification } from './ApplicationClassificationPanel';
import ApplicationMtdMetadata from './ApplicationMtdMetadata';

const catalog = {
  businessCriticalityLevels: [
    { code: 'high', label: 'High', description: 'Up to one day', rank: 3, maxMtdMinutes: 1440 },
  ],
  businessMtdPresets: [240, 1440],
  cyberCriticalityLevels: [
    { code: 'critical', label: 'Critical', description: 'Catastrophic consequences', rank: 4 },
  ],
  dataClasses: [
    { code: 'restricted', label: 'Restricted', description: 'Strictly limited disclosure', rank: 4 },
  ],
  recoveryWaves: [
    { code: 'vital', label: 'V1 — Vital activities', description: 'Restore vital activities', order: 1 },
  ],
  classificationVersions: { business: 1, cyber: 1, confidentiality: 1, recovery: 1 },
  classificationSettingsRevision: 1,
};

vi.mock('../../../hooks/useApplicationClassificationCatalog', () => ({
  default: () => ({ data: catalog }),
}));

const theme = createAppTheme('light');

const completeApp: ApplicationClassification = {
  id: 'app-1',
  criticality: 'high',
  business_mtd_minutes: 1440,
  business_criticality_origin: 'derived',
  cyber_criticality: 'critical',
  recovery_wave: 'vital',
  rto_minutes: 240,
  rpo_minutes: 0,
  classification_justification: 'Customer operations require same-day recovery.',
  classification_revision: 4,
  classification_review_state: 'stale',
  classification_review_reason: 'data_changed',
  classification_reviewed_at: null,
  data_class: 'restricted',
  contains_pii: true,
  last_dr_test: null,
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof ApplicationClassificationPanel>> = {}) {
  const onPatch = overrides.onPatch ?? vi.fn().mockResolvedValue(undefined);
  const onReview = overrides.onReview ?? vi.fn().mockResolvedValue(undefined);
  render(
    <ThemeProvider theme={theme}>
      <ApplicationClassificationPanel
        app={completeApp}
        canManage
        onPatch={onPatch}
        onReview={onReview}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { onPatch, onReview };
}

describe('Application classification workspace surfaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the top-bar duration and Compliance duration on the same minute value', async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <ApplicationMtdMetadata criticality="high" minutes={1440} onCommit={onCommit} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /High.*1 day/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /4 hr/i }));
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(240));
    unmount();

    const onPatch = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onPatch });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Maximum tolerable downtime' }));
    fireEvent.click(screen.getByRole('option', { name: /4 hr/i }));
    await waitFor(() => expect(onPatch).toHaveBeenCalledWith({ business_mtd_minutes: 240 }));
    expect(screen.queryByRole('spinbutton', { name: 'Maximum tolerable downtime' })).not.toBeInTheDocument();
  });

  it.each([
    ['incomplete data', { app: { ...completeApp, cyber_criticality: null } }],
    ['an active save', { saving: true }],
    ['a server error', { error: 'The classification could not be saved.' }],
  ])('disables review during %s', (_label, props) => {
    renderPanel(props);

    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeDisabled();
  });

  it('marks a complete classification reviewed only after an explicit click', () => {
    const { onReview } = renderPanel();

    expect(onReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('blocks review while a duration draft is invalid even when the saved classification is complete', () => {
    const { onReview } = renderPanel();
    const reviewButton = screen.getByRole('button', { name: 'Mark as reviewed' });
    const mtd = screen.getByRole('spinbutton', { name: 'Recovery time objective' });

    expect(reviewButton).toBeEnabled();
    fireEvent.change(mtd, { target: { value: '0.01' } });

    expect(reviewButton).toBeDisabled();
    fireEvent.click(reviewButton);
    expect(onReview).not.toHaveBeenCalled();
  });

  it('blocks review while a valid duration change has not reached the saved application', () => {
    renderPanel();
    const reviewButton = screen.getByRole('button', { name: 'Mark as reviewed' });

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Recovery time objective' }), { target: { value: '5' } });

    expect(reviewButton).toBeDisabled();
  });


  it('does not render option descriptions in the closed classification controls', () => {
    renderPanel();
    expect(screen.queryByText('Catastrophic consequences')).not.toBeInTheDocument();
    expect(screen.queryByText('Strictly limited disclosure')).not.toBeInTheDocument();
    expect(screen.queryByText('Restore vital activities')).not.toBeInTheDocument();
  });

  it('explains missing review fields and displays the named reviewer', () => {
    renderPanel({ app: { ...completeApp, cyber_criticality: null, classification_reviewer_name: 'Jane Doe' } });
    expect(screen.getByText(/Before review, complete: Cyber criticality/)).toBeInTheDocument();
    expect(screen.getByText('Reviewed by Jane Doe')).toBeInTheDocument();
  });

  it('keeps a historical MTD visible but offers only configured durations and clearing', () => {
    renderPanel({ app: { ...completeApp, business_mtd_minutes: 30 } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Maximum tolerable downtime' }));
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: /30 min/i })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'Not set' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('shows save errors as an accessible alert', () => {
    renderPanel({ error: 'The classification could not be saved.' });

    expect(screen.getByRole('alert')).toHaveTextContent('The classification could not be saved.');
  });

  it('exposes classification guidance through labelled tooltip controls', async () => {
    renderPanel();

    const helpButton = screen.getByRole('button', { name: 'Cyber criticality' });
    fireEvent.mouseOver(helpButton);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Choose the highest level justified by a plausible consequence');
  });
});
