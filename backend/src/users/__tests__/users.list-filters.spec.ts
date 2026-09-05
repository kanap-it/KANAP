import * as assert from 'node:assert/strict';
import { compileAgFilterCondition, createParamNameGenerator } from '../../common/ag-grid-filtering';
import {
  compileAccountTypeFilter,
  compileRolesFilter,
  compileStatusFilter,
  compileUserListFilters,
  USER_HAS_ACCESS_SQL,
  USER_LIST_FILTER_TARGETS,
} from '../users-list-filters';

function next() {
  return createParamNameGenerator('t');
}

function testStatusEnabledExcludesPendingAccess() {
  const cond = compileStatusFilter({ filterType: 'set', values: ['enabled'] }, next());
  assert.ok(cond);
  assert.match(cond.sql, /u\.status = 'enabled'/);
  assert.match(cond.sql, /AND/);
  assert.equal(cond.sql.includes('NOT'), false);
  assert.ok(cond.sql.includes(USER_HAS_ACCESS_SQL));
}

function testStatusPendingAccess() {
  const cond = compileStatusFilter({ filterType: 'set', values: ['pending_access'] }, next());
  assert.ok(cond);
  assert.match(cond.sql, /u\.status = 'enabled'/);
  assert.match(cond.sql, /NOT/);
  assert.ok(cond.sql.includes(USER_HAS_ACCESS_SQL));
}

function testStatusEnabledAndPendingIsAllEnabled() {
  const cond = compileStatusFilter(
    { filterType: 'set', values: ['enabled', 'pending_access'] },
    next(),
  );
  assert.ok(cond);
  assert.equal(cond.sql, `(u.status = 'enabled')`);
  assert.deepEqual(cond.params, {});
}

function testStatusMixPendingAndInvited() {
  const cond = compileStatusFilter(
    { filterType: 'set', values: ['pending_access', 'invited'] },
    next(),
  );
  assert.ok(cond);
  assert.match(cond.sql, /NOT/);
  assert.match(cond.sql, /u\.status IN \(:\.\.\.t0\)/);
  assert.deepEqual(cond.params, { t0: ['invited'] });
}

function testStatusEmptySetMatchesNothing() {
  const cond = compileStatusFilter({ filterType: 'set', values: [] }, next());
  assert.deepEqual(cond, { sql: '1=0', params: {} });
}

function testRolesMatchesPrimaryAndUserRoles() {
  const cond = compileRolesFilter(
    { filterType: 'set', values: ['role-a', 'role-b'] },
    next(),
  );
  assert.ok(cond);
  assert.match(cond.sql, /u\.role_id IN \(:\.\.\.t0\)/);
  assert.match(cond.sql, /user_roles ur/);
  assert.match(cond.sql, /ur\.role_id IN \(:\.\.\.t0\)/);
  assert.deepEqual(cond.params, { t0: ['role-a', 'role-b'] });
}

function testAccountTypeLocalAndEntra() {
  const local = compileAccountTypeFilter({ filterType: 'set', values: ['local'] }, next());
  assert.deepEqual(local, { sql: 'u.external_auth_provider IS NULL', params: {} });

  const entra = compileAccountTypeFilter({ filterType: 'set', values: ['entra'] }, next());
  assert.ok(entra);
  assert.match(entra.sql, /u\.external_auth_provider = :t0/);
  assert.deepEqual(entra.params, { t0: 'entra' });

  const both = compileAccountTypeFilter({ filterType: 'set', values: ['local', 'entra'] }, next());
  assert.ok(both);
  assert.match(both.sql, /IS NULL/);
  assert.match(both.sql, /'entra'/);
}

function testDateBlankOnLastLogin() {
  const cond = compileAgFilterCondition(
    { filterType: 'date', type: 'blank' },
    USER_LIST_FILTER_TARGETS.last_login_at,
    next(),
  );
  assert.deepEqual(cond, { sql: 'u.last_login_at IS NULL', params: {} });

  const notBlank = compileAgFilterCondition(
    { filterType: 'date', type: 'notBlank' },
    USER_LIST_FILTER_TARGETS.last_login_at,
    next(),
  );
  assert.deepEqual(notBlank, { sql: 'u.last_login_at IS NOT NULL', params: {} });
}

function testDateGreaterThanOnLastLogin() {
  const cond = compileAgFilterCondition(
    { filterType: 'date', type: 'greaterThan', dateFrom: '2026-08-01' },
    USER_LIST_FILTER_TARGETS.last_login_at,
    next(),
  );
  assert.ok(cond);
  assert.match(cond.sql, /CAST\(u\.last_login_at AS DATE\) > CAST\(:t0 AS DATE\)/);
  assert.deepEqual(cond.params, { t0: '2026-08-01' });
}

function testCompanyNameContains() {
  const cond = compileAgFilterCondition(
    { filterType: 'text', type: 'contains', filter: 'Fromage' },
    USER_LIST_FILTER_TARGETS.company,
    next(),
  );
  assert.ok(cond);
  assert.match(cond.sql, /COALESCE\(company\.name, ''\) ILIKE :t0/);
  assert.deepEqual(cond.params, { t0: '%Fromage%' });
}

function testCompileUserListFiltersWiresSpecialAndGenericKeys() {
  const conditions = compileUserListFilters({
    status: { filterType: 'set', values: ['disabled'] },
    roles: { filterType: 'set', values: ['rid-1'] },
    account_type: { filterType: 'set', values: ['local'] },
    last_login_at: { filterType: 'date', type: 'blank' },
    company: { filterType: 'text', type: 'contains', filter: 'Acme' },
    unknown_col: { filterType: 'text', type: 'contains', filter: 'nope' },
  }, next());

  assert.equal(conditions.length, 5);
  assert.ok(conditions.some((c) => c.sql.includes("u.status IN (:...t0)")));
  assert.ok(conditions.some((c) => c.sql.includes('user_roles ur')));
  assert.ok(conditions.some((c) => c.sql === 'u.external_auth_provider IS NULL'));
  assert.ok(conditions.some((c) => c.sql === 'u.last_login_at IS NULL'));
  assert.ok(conditions.some((c) => c.sql.includes('company.name')));
  assert.equal(conditions.some((c) => c.sql.includes('nope')), false);
}

function testEmptyFilters() {
  assert.deepEqual(compileUserListFilters(undefined), []);
  assert.deepEqual(compileUserListFilters({}), []);
}

function run() {
  testStatusEnabledExcludesPendingAccess();
  testStatusPendingAccess();
  testStatusEnabledAndPendingIsAllEnabled();
  testStatusMixPendingAndInvited();
  testStatusEmptySetMatchesNothing();
  testRolesMatchesPrimaryAndUserRoles();
  testAccountTypeLocalAndEntra();
  testDateBlankOnLastLogin();
  testDateGreaterThanOnLastLogin();
  testCompanyNameContains();
  testCompileUserListFiltersWiresSpecialAndGenericKeys();
  testEmptyFilters();
}

run();
