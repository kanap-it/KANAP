import { describe, expect, it } from 'vitest';
import { statusScopeParams } from './statusScopeParams';

/**
 * The grid and the prev/next navigation must build the same scope params, otherwise the
 * item page walks a different set from the one on screen. These assertions pin the mapping
 * the grid used to inline (enabled/disabled/invited as `status`, all as `includeDisabled`).
 */
describe('statusScopeParams', () => {
  it('maps the enabled scope onto a status value', () => {
    expect(statusScopeParams('enabled')).toEqual({ status: 'enabled' });
  });

  it('maps the disabled scope onto a status value', () => {
    expect(statusScopeParams('disabled')).toEqual({ status: 'disabled' });
  });

  it('maps the invited scope onto a status value', () => {
    expect(statusScopeParams('invited')).toEqual({ status: 'invited' });
  });

  it('maps "all" onto includeDisabled, not a status value', () => {
    // The list endpoints only accept the enabled/disabled status values, so "all" has to be
    // expressed this way; sending status=all would be discarded and silently fall back to
    // the enabled-only default.
    expect(statusScopeParams('all')).toEqual({ includeDisabled: '1' });
  });

  it('contributes nothing when there is no scope, leaving the endpoint default', () => {
    expect(statusScopeParams(null)).toEqual({});
    expect(statusScopeParams(undefined)).toEqual({});
    expect(statusScopeParams('')).toEqual({});
  });

  it('ignores an unknown scope rather than sending a bogus status', () => {
    expect(statusScopeParams('archived')).toEqual({});
  });
});
