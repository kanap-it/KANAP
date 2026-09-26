import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { createAppTheme } from '../../config/ThemeContext';
import { STATUS_DISABLED, STATUS_ENABLED, StatusValue } from '../../constants/status';
import StatusLifecycleField from './StatusLifecycleField';

function renderField(props: Partial<React.ComponentProps<typeof StatusLifecycleField>> & { status: StatusValue }) {
  const onStatusChange = vi.fn();
  const onDisabledAtChange = vi.fn();
  render(
    <ThemeProvider theme={createAppTheme('light')}>
      <StatusLifecycleField
        disabledAt={null}
        onStatusChange={onStatusChange}
        onDisabledAtChange={onDisabledAtChange}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onStatusChange, onDisabledAtChange };
}

describe('StatusLifecycleField', () => {
  it('shows the on label while enabled', () => {
    renderField({ status: STATUS_ENABLED });
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked();
  });

  it('shows the off label while disabled, keeping the control name stable', () => {
    renderField({ status: STATUS_DISABLED, disabledAt: '2026-06-30T21:59:00.000Z' });
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).not.toBeChecked();
  });

  it('uses custom on and off labels when given', () => {
    renderField({ status: STATUS_DISABLED, statusLabel: 'On', statusOffLabel: 'Off' });
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('clears the date and enables when switched on', () => {
    const { onStatusChange, onDisabledAtChange } = renderField({
      status: STATUS_DISABLED,
      disabledAt: '2026-06-30T21:59:00.000Z',
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onDisabledAtChange).toHaveBeenCalledWith(null);
    expect(onStatusChange).toHaveBeenCalledWith(STATUS_ENABLED);
  });

  it('stamps a date and disables when switched off without a date field', () => {
    const { onStatusChange, onDisabledAtChange } = renderField({ status: STATUS_ENABLED, hideDisabledAt: true });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onDisabledAtChange).toHaveBeenCalledWith(expect.any(String));
    expect(onStatusChange).toHaveBeenCalledWith(STATUS_DISABLED);
  });
});
