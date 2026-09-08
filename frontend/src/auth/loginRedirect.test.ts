import { describe, expect, it } from 'vitest';
import { sanitizeLoginRedirect } from './loginRedirect';

describe('sanitizeLoginRedirect', () => {
  it('preserves internal paths with search params and hashes', () => {
    expect(sanitizeLoginRedirect('/portfolio/tasks/42?focus=activity#comments')).toBe(
      '/portfolio/tasks/42?focus=activity#comments',
    );
  });

  it('rejects external, protocol-relative, and auth redirects', () => {
    expect(sanitizeLoginRedirect('https://example.com/path')).toBe('/');
    expect(sanitizeLoginRedirect('//example.com/path')).toBe('/');
    expect(sanitizeLoginRedirect('/login?redirectTo=%2Fportfolio%2Ftasks')).toBe('/');
  });

  it('falls back to the home page for missing values', () => {
    expect(sanitizeLoginRedirect(undefined)).toBe('/');
    expect(sanitizeLoginRedirect('')).toBe('/');
  });
});
