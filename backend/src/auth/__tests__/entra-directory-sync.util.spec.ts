import * as assert from 'node:assert/strict';
import {
  decideDirectoryAction,
  mergeScalarFields,
  normalizeDirectoryLocale,
  resolveDirectoryNames,
  DirectoryScalarTarget,
} from '../entra-directory-sync.util';

function target(overrides: Partial<DirectoryScalarTarget> = {}): DirectoryScalarTarget {
  return {
    first_name: null,
    last_name: null,
    job_title: null,
    business_phone: null,
    mobile_phone: null,
    locale: null,
    ...overrides,
  };
}

// --- decideDirectoryAction -------------------------------------------------
assert.equal(decideDirectoryAction(undefined), 'disable_removed', 'missing in directory → removed');
assert.equal(decideDirectoryAction(null), 'disable_removed');
assert.equal(decideDirectoryAction({ id: 'x', accountEnabled: false }), 'disable_deactivated');
assert.equal(decideDirectoryAction({ id: 'x', accountEnabled: true }), 'sync');
assert.equal(decideDirectoryAction({ id: 'x' }), 'sync', 'unknown accountEnabled never disables');

// --- normalizeDirectoryLocale ---------------------------------------------
assert.equal(normalizeDirectoryLocale('fr-FR'), 'fr');
assert.equal(normalizeDirectoryLocale('en-US'), 'en');
assert.equal(normalizeDirectoryLocale('DE'), 'de');
assert.equal(normalizeDirectoryLocale('pt-BR'), null, 'unsupported language → null');
assert.equal(normalizeDirectoryLocale(''), null);
assert.equal(normalizeDirectoryLocale(undefined), null);

// --- resolveDirectoryNames --------------------------------------------------
assert.deepEqual(resolveDirectoryNames({ givenName: 'Ada', surname: 'Lovelace' }), { firstName: 'Ada', lastName: 'Lovelace' });
assert.deepEqual(resolveDirectoryNames({ displayName: 'Ada Augusta Lovelace' }), { firstName: 'Ada', lastName: 'Augusta Lovelace' });
assert.deepEqual(resolveDirectoryNames({}, { name: 'Grace Hopper' }), { firstName: 'Grace', lastName: 'Hopper' });
assert.deepEqual(resolveDirectoryNames({ givenName: 'Solo' }), { firstName: 'Solo', lastName: '' });
assert.deepEqual(resolveDirectoryNames({}), { firstName: '', lastName: '' });

// --- mergeScalarFields ------------------------------------------------------
{
  const t = target({ job_title: 'Local title', mobile_phone: '+33 6' });
  const changed = mergeScalarFields(t, { jobTitle: 'Directory title', businessPhones: ['+33 1'], mobilePhone: '' }, { firstName: 'Ada', lastName: 'Lovelace' });
  assert.equal(changed, true);
  assert.equal(t.job_title, 'Directory title', 'non-empty directory value wins');
  assert.equal(t.business_phone, '+33 1');
  assert.equal(t.mobile_phone, '+33 6', 'empty directory value never clears local data');
  assert.equal(t.first_name, 'Ada');
  assert.equal(t.last_name, 'Lovelace');
}
{
  const t = target({ locale: 'de' });
  mergeScalarFields(t, { preferredLanguage: 'fr-FR' }, { firstName: '', lastName: '' });
  assert.equal(t.locale, 'de', 'locale is never overridden once set');
}
{
  const t = target();
  const changed = mergeScalarFields(t, { preferredLanguage: 'es-ES' }, { firstName: '', lastName: '' });
  assert.equal(changed, true);
  assert.equal(t.locale, 'es', 'locale set from directory when unset');
}
{
  const t = target({ first_name: 'Ada', last_name: 'Lovelace', job_title: 'CTO' });
  const changed = mergeScalarFields(t, { jobTitle: 'CTO' }, { firstName: 'Ada', lastName: 'Lovelace' });
  assert.equal(changed, false, 'identical values report no change');
}

console.log('entra-directory-sync.util.spec: all assertions passed');
