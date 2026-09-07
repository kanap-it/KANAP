import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { createAppTheme } from '../../config/ThemeContext';
import CatalogTranslationsDialog, { compactTranslations } from './CatalogTranslationsDialog';

describe('CatalogTranslationsDialog', () => {
  it('edits translations only, previews the fallback, and saves a compacted set', () => {
    const onSave = vi.fn();
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <CatalogTranslationsDialog target={{ item: { code: 'high', label: 'High', description: 'Up to one day.', translations: { de: { label: 'Hoch' } } }, withDescription: true, onSave }} onClose={() => undefined} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Translations of "High"')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('High')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name Deutsch' })).toHaveValue('Hoch');
    expect(screen.getByRole('textbox', { name: 'Name Français' })).toHaveAttribute('placeholder', 'Shown: High');
    fireEvent.change(screen.getByRole('textbox', { name: 'Name Français' }), { target: { value: ' Élevée ' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description Français' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Name Deutsch' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ fr: { label: 'Élevée' } });
  });

  it('compacts empty fields and locales to undefined', () => {
    expect(compactTranslations({ fr: { label: ' ', description: '' }, de: {} })).toBeUndefined();
    expect(compactTranslations({ es: { description: 'Solo' } })).toEqual({ es: { description: 'Solo' } });
  });
});
