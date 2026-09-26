import { describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import { getMetricLabels, isMetricKey } from './reportMetrics';

describe('report metric labels', () => {
  it('uses the budget tab wording in English', () => {
    expect(getMetricLabels(i18n.getFixedT('en', 'ops'))).toEqual({
      budget: 'Budget',
      follow_up: 'Actuals',
      landing: 'Expected landing',
      revision: 'Revision',
    });
  });

  it('uses the budget tab wording in French', () => {
    expect(getMetricLabels(i18n.getFixedT('fr', 'ops'))).toEqual({
      budget: 'Budget',
      follow_up: 'Réalisé',
      landing: 'Atterrissage prévu',
      revision: 'Révision',
    });
  });

  it('resolves the labels from another namespace too', () => {
    expect(getMetricLabels(i18n.getFixedT('de', 'common')).landing).toBe('Erwarteter Endwert');
  });

  it('recognises report metric keys only', () => {
    expect(isMetricKey('follow_up')).toBe(true);
    expect(isMetricKey('forecast')).toBe(false);
  });
});
