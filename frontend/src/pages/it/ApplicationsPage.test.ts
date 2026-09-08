import { describe, expect, it } from 'vitest';
import { catalogRankComparator } from './ApplicationsPage';

describe('applications list helpers', () => {
  it('orders filter values by catalog rank, waves by restoration order, blanks and unknown codes last', () => {
    const levels = [{ code: 'low', rank: 1 }, { code: 'critical', rank: 4 }, { code: 'high', rank: 3 }];
    const sorted = [{ value: 'low' }, { value: null }, { value: 'zzz' }, { value: 'critical' }, { value: 'high' }].sort(catalogRankComparator(levels));
    expect(sorted.map((option) => option.value)).toEqual(['critical', 'high', 'low', 'zzz', null]);
    const waves = [{ code: 'normal', order: 3 }, { code: 'foundation', order: 0 }, { code: 'vital', order: 1 }];
    expect([{ value: 'normal' }, { value: 'vital' }, { value: 'foundation' }].sort(catalogRankComparator(waves, 'order')).map((option) => option.value)).toEqual(['foundation', 'vital', 'normal']);
  });
});
