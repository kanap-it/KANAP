import * as assert from 'node:assert/strict';
import { EntityManager } from 'typeorm';
import { formatRecordCreatorName, resolveRecordCreators } from '../record-creator.util';

// Display label of the creation author shown in the workspace history header:
// full name, then email, then no author. The audit row is the only source, and
// it is read through a LEFT JOIN, so "no audit row" and "audit row without a
// user" must both end up as "no author".

assert.equal(
  formatRecordCreatorName({ first_name: 'Thomas', last_name: 'Berger', email: 'thomas@fromage-co.com' }),
  'Thomas Berger',
  'full name wins over email',
);
assert.equal(
  formatRecordCreatorName({ first_name: 'Friedrich', last_name: 'EVA', email: null }),
  'Friedrich EVA',
  'name without email',
);
assert.equal(
  formatRecordCreatorName({ first_name: '  Thomas  ', last_name: ' Berger ', email: null }),
  'Thomas Berger',
  'name parts are trimmed',
);
assert.equal(
  formatRecordCreatorName({ first_name: null, last_name: 'Dupont', email: 'd@x.fr' }),
  'Dupont',
  'a last name alone is not lost',
);
assert.equal(
  formatRecordCreatorName({ first_name: 'Clara', last_name: null, email: 'c@x.fr' }),
  'Clara',
  'a first name alone is not lost',
);
assert.equal(
  formatRecordCreatorName({ first_name: null, last_name: null, email: 'admin@kanap.net' }),
  'admin@kanap.net',
  'email is the fallback when the account has no name',
);
assert.equal(
  formatRecordCreatorName({ first_name: '   ', last_name: '', email: 'admin@kanap.net' }),
  'admin@kanap.net',
  'blank name parts fall back to email',
);
assert.equal(
  formatRecordCreatorName({ first_name: null, last_name: null, email: null }),
  null,
  'no name and no email yields no author',
);
assert.equal(formatRecordCreatorName(null), null, 'a missing row yields no author');

async function run(): Promise<void> {
  let queryCalls = 0;
  const emptyManager = {
    query: async () => {
      queryCalls += 1;
      return [];
    },
  } as unknown as EntityManager;

  assert.equal((await resolveRecordCreators(emptyManager, 'tasks', [])).size, 0, 'empty id list returns an empty map');
  assert.equal(queryCalls, 0, 'empty id list does not query the database');

  const noRow = await resolveRecordCreators(emptyManager, 'tasks', ['11111111-1111-4111-8111-111111111111']);
  assert.equal(noRow.size, 0, 'a record with no create audit row has no author');
  assert.equal(queryCalls, 1, 'ids are resolved with a single batched query');

  // A create audit row whose user_id is NULL comes back with empty user
  // columns through the LEFT JOIN: same outcome as a missing row.
  const nullUserManager = {
    query: async () => [
      { record_id: '22222222-2222-4222-8222-222222222222', first_name: null, last_name: null, email: null },
      { record_id: '33333333-3333-4333-8333-333333333333', first_name: null, last_name: null, email: 'sys@kanap.net' },
    ],
  } as unknown as EntityManager;

  const nullUsers = await resolveRecordCreators(nullUserManager, 'tasks', [
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ]);
  assert.equal(
    nullUsers.has('22222222-2222-4222-8222-222222222222'),
    false,
    'an audit row with a NULL user_id is skipped',
  );
  assert.equal(
    nullUsers.get('33333333-3333-4333-8333-333333333333'),
    'sys@kanap.net',
    'an account without a name resolves to its email',
  );

  console.log('record-creator.util: all assertions passed');
}

void run();
