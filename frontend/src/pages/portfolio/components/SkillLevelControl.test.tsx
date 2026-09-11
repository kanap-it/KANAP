import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../../config/ThemeContext';
import SkillLevelControl from './SkillLevelControl';

const theme = createAppTheme('light');
const labels = { 1: 'Basic', 2: 'Can execute with support', 3: 'Autonomous', 4: 'Expert' };

function renderControl(value: number, onChange = vi.fn(), disabled = false) {
  const utils = render(
    <ThemeProvider theme={theme}>
      <SkillLevelControl
        ariaLabel="Office level"
        labels={labels}
        optionLabel={(level, label) => `${level} – ${label}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </ThemeProvider>,
  );
  return { ...utils, onChange };
}

describe('SkillLevelControl', () => {
  it('renders one radio per level with the selected one checked', () => {
    renderControl(2);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios[2].getAttribute('aria-checked')).toBe('false');
    expect(radios[2].getAttribute('aria-label')).toBe('3 – Autonomous');
  });

  it('selects a level on click', () => {
    const { onChange } = renderControl(2);
    fireEvent.click(screen.getByRole('radio', { name: '4 – Expert' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('moves with arrow keys and does not let the keydown reach the window', () => {
    const { onChange } = renderControl(2);
    const windowHandler = vi.fn();
    window.addEventListener('keydown', windowHandler);
    const current = screen.getByRole('radio', { name: '2 – Can execute with support' });
    current.focus();
    fireEvent.keyDown(current, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(current, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(current, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(current, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(windowHandler).not.toHaveBeenCalled();
    window.removeEventListener('keydown', windowHandler);
  });

  it('is inert when disabled', () => {
    const { onChange } = renderControl(1, vi.fn(), true);
    fireEvent.click(screen.getByRole('radio', { name: '4 – Expert' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radiogroup').getAttribute('aria-disabled')).toBe('true');
  });
});
