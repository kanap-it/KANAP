import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../../config/ThemeContext';

vi.mock('react-i18next', () => {
  const translation = { t: (key: string) => key, i18n: { language: 'en', resolvedLanguage: 'en' } };
  return { useTranslation: () => translation };
});
vi.mock('../../../i18n/useLocale', () => ({ useLocale: () => 'en' }));
vi.mock('../../../hooks/useCurrencySettings', () => ({ default: () => ({ data: null }) }));
// The pickers load their options from the API; they are not what this test is about.
vi.mock('../../../components/fields/SupplierSelect', () => ({ default: () => null }));
vi.mock('../../../components/fields/CompanySelect', () => ({ default: () => null }));
vi.mock('../../../components/fields/AccountSelect', () => ({ default: () => null }));
vi.mock('../../../components/fields/AnalyticsCategorySelect', () => ({ default: () => null }));
vi.mock('../../../components/fields/UserSelect', () => ({ default: () => null }));

import SpendPropertiesDrawer from './SpendPropertiesDrawer';

const noop = () => undefined;

function renderDrawer(props: Partial<React.ComponentProps<typeof SpendPropertiesDrawer>>) {
  return render(
    <ThemeProvider theme={createAppTheme('light')}>
      <SpendPropertiesDrawer
        supplierId=""
        payingCompanyId=""
        accountId=""
        currency="EUR"
        analyticsCategoryId=""
        effectiveStart="2026-01-01"
        onSupplierChange={noop}
        onPayingCompanyChange={noop}
        onAccountChange={noop}
        onCurrencyChange={noop}
        onAnalyticsCategoryChange={noop}
        onEffectiveStartChange={noop}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('SpendPropertiesDrawer end of validity', () => {
  it('offers one optional end date on create, as the local end of that day', () => {
    const onDisabledAtChange = vi.fn();
    renderDrawer({ mode: 'create', disabledAt: null, onDisabledAtChange });

    expect(screen.getByText('opex.fields.endOfValidity')).toBeTruthy();
    expect(screen.getByText('opex.fields.endOfValidityHint')).toBeTruthy();
    expect(screen.queryByText('opex.fields.effectiveEnd')).toBeNull();

    // Two date fields in the dates group: effective start, then end of validity.
    // The date placeholder is translated; the mocked `t` returns its key.
    const inputs = screen.getAllByPlaceholderText('labels.datePlaceholder');
    expect(inputs).toHaveLength(2);
    fireEvent.focus(inputs[1]);
    fireEvent.change(inputs[1], { target: { value: '31/12/2027' } });

    expect(onDisabledAtChange).toHaveBeenLastCalledWith(new Date(2027, 11, 31, 23, 59, 0, 0).toISOString());
  });

  it('keeps the end of validity inside the lifecycle group when editing', () => {
    renderDrawer({ mode: 'edit', disabledAt: null, onDisabledAtChange: noop, onStatusChange: noop });

    expect(screen.getAllByText('opex.fields.endOfValidity')).toHaveLength(1);
    expect(screen.queryByText('opex.fields.effectiveEnd')).toBeNull();
  });
});
