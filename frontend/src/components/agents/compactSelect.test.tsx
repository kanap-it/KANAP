import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../config/ThemeContext';
import {
  COMPACT_SELECT_MAX_WIDTH,
  COMPACT_SELECT_MIN_WIDTH,
} from '../../theme/formSx';
import { HelpdeskTargetingFilterBuilder, buildFilter } from './helpdeskTargeting';

/**
 * Round-3 UAT regression: the agent dropdowns were reported as "half the screen
 * wide" and round 2's fix — bounding the *menu* paper — changed nothing the user
 * could see.
 *
 * Measured in a real browser on the Targeting builder (1600px viewport):
 *
 *   | element        | round-2 code | baseline (no MenuProps) |
 *   |----------------|--------------|-------------------------|
 *   | closed control | 1276px       | 1276px                  |
 *   | open menu      | 240px        | 1276px                  |
 *
 * So the menu bound worked and the *control* — what the user looks at whenever
 * the menu is shut, which is nearly always — was never touched. The real fix is
 * `pageSelectSx`, which caps the control at the same width as its menu.
 *
 * jsdom does no layout, but both bounds are assertable: the menu paper carries
 * its width as an inline style (MUI writes the anchor width there, so the
 * override has to be inline too), and the control's cap arrives as an emotion
 * class that `getComputedStyle` resolves.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'pending', label: 'Pending' },
];

vi.mock('../../ai/aiApi', () => ({
  aiAgentControlApi: {
    getAgentTargetingOptions: vi.fn(async (_agentId: string, field: string) => ({
      options: field === 'status' ? statusOptions : [],
    })),
  },
}));

function renderTargetingBuilder() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <HelpdeskTargetingFilterBuilder
          agentId="agent-1"
          filters={[buildFilter('status', ['new'])]}
          onChange={() => {}}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** The multi-select showing the status values, i.e. the picker fried called out. */
function statusControl(): HTMLElement {
  const controls = [...document.querySelectorAll('.MuiInputBase-root')] as HTMLElement[];
  const found = controls.find((control) => control.textContent?.includes('New'));
  if (!found) throw new Error('status picker not found');
  return found;
}

describe('page-level agent dropdowns are width-bounded', () => {
  it('caps the closed Targeting status control instead of letting it fill the row', async () => {
    renderTargetingBuilder();
    await waitFor(() => expect(statusControl()).toBeTruthy());

    // The round-3 fix. Fails against round-2 code, where the control inherited
    // `drawerSelectSx`'s bare `width: 100%` and stretched the whole grid cell.
    expect(getComputedStyle(statusControl()).maxWidth).toBe(`${COMPACT_SELECT_MAX_WIDTH}px`);
  });

  it('bounds the menu paper when the status picker is opened', async () => {
    renderTargetingBuilder();
    await waitFor(() => expect(statusControl()).toBeTruthy());

    fireEvent.mouseDown(statusControl().querySelector('.MuiSelect-select')!);
    await screen.findByRole('listbox');

    const paper = document.querySelector('.MuiMenu-paper') as HTMLElement;
    expect(paper).toBeTruthy();
    // Inline, because MUI writes the anchor width inline and nothing else can win.
    expect(paper.style.minWidth).toBe(`${COMPACT_SELECT_MIN_WIDTH}px`);
    expect(paper.style.maxWidth).toBe(`${COMPACT_SELECT_MAX_WIDTH}px`);
  });
});
