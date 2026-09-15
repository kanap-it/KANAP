import { describe, expect, it } from 'vitest';
import { formatUserName, getInitials, getUserInitials } from './userDisplay';

describe('formatUserName', () => {
  it('prefers the explicit full name', () => {
    expect(formatUserName({ full_name: 'Thomas Berger', first_name: 'T', last_name: 'B', email: 't@x.fr' }))
      .toBe('Thomas Berger');
  });

  it('joins the first and last name', () => {
    expect(formatUserName({ first_name: 'Clara', last_name: 'Dupont' })).toBe('Clara Dupont');
  });

  it('keeps a partial name', () => {
    expect(formatUserName({ last_name: 'Dupont', email: 'd@x.fr' })).toBe('Dupont');
    expect(formatUserName({ first_name: 'Clara', email: 'c@x.fr' })).toBe('Clara');
  });

  it('falls back to the email when the account has no name', () => {
    expect(formatUserName({ first_name: null, last_name: null, email: 'admin@kanap.net' }))
      .toBe('admin@kanap.net');
    expect(formatUserName({ first_name: '  ', last_name: '', email: 'admin@kanap.net' }))
      .toBe('admin@kanap.net');
  });

  it('returns null when nothing is available', () => {
    expect(formatUserName(null)).toBeNull();
    expect(formatUserName({ first_name: null, last_name: null, email: null })).toBeNull();
  });
});

describe('getInitials', () => {
  it('uses the first letter of the first and of the last word', () => {
    expect(getInitials('Thomas Berger')).toBe('TB');
    // A compound first name keeps its own initial for the first letter.
    expect(getInitials('Jean Pierre Dupont')).toBe('JD');
  });

  it('handles a single word and an email', () => {
    expect(getInitials('Dupont')).toBe('D');
    expect(getInitials('admin@kanap.net')).toBe('A');
  });

  it('never renders an empty avatar', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getUserInitials', () => {
  it('uses the account name', () => {
    expect(getUserInitials({ first_name: 'Clara', last_name: 'Dupont' })).toBe('CD');
  });

  it('falls back to the email for an account without a name', () => {
    expect(getUserInitials({ first_name: null, last_name: null, email: 'admin@kanap.net' })).toBe('A');
  });

  it('stays a question mark when there is nothing to show', () => {
    // Regression: the avatar used to take the initial of a translated
    // "Unknown"/"Inconnu" label, rendering "I" or "U" for a missing author.
    expect(getUserInitials(null)).toBe('?');
    expect(getUserInitials({ first_name: null, last_name: null, email: null })).toBe('?');
  });
});
