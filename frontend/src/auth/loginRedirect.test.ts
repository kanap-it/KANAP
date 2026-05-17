import { describe, expect, it } from 'vitest';
import {
  getLoginRedirectFromState,
  getLoginRedirectPath,
  sanitizeLoginRedirect,
} from './loginRedirect';

describe('login redirect helpers', () => {
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

  it('extracts a redirect path from router state', () => {
    expect(
      getLoginRedirectFromState({
        from: {
          pathname: '/it/applications/app-1',
          search: '?tab=overview',
          hash: '#relations',
        },
      }),
    ).toBe('/it/applications/app-1?tab=overview#relations');
  });

  it('falls back to redirectTo query params when state has no destination', () => {
    const params = new URLSearchParams({
      redirectTo: '/knowledge/doc-1?mode=preview#summary',
    });

    expect(getLoginRedirectPath({}, params)).toBe('/knowledge/doc-1?mode=preview#summary');
  });
});
