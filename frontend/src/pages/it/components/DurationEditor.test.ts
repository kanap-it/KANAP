import { describe, expect, it } from 'vitest';
import { bestDurationUnit, durationToMinutes, formatDuration, MAX_DURATION_MINUTES } from './DurationEditor';

describe('DurationEditor conversions', () => {
  it('converts exact minute values without rounding', () => {
    expect(durationToMinutes('1.5', 'hours')).toBe(90);
    expect(durationToMinutes('0.1', 'hours')).toBe(6);
    expect(durationToMinutes('0.01', 'hours')).toBeNull();
  });

  it('distinguishes RPO zero from an empty duration', () => {
    expect(durationToMinutes('0', 'minutes', true)).toBe(0);
    expect(durationToMinutes('0', 'minutes', false)).toBeNull();
    expect(durationToMinutes('', 'minutes', true)).toBeNull();
  });

  it('rejects invalid and overflowing values', () => {
    expect(durationToMinutes('-1', 'minutes', true)).toBeNull();
    expect(durationToMinutes('Infinity', 'minutes', true)).toBeNull();
    expect(durationToMinutes(String(MAX_DURATION_MINUTES + 1), 'minutes', true)).toBeNull();
  });

  it('uses the largest exact display unit', () => {
    expect(bestDurationUnit(10080)).toBe('weeks');
    expect(bestDurationUnit(4320)).toBe('days');
    expect(bestDurationUnit(90)).toBe('minutes');
    expect(formatDuration(1440)).toContain('1');
  });
});
