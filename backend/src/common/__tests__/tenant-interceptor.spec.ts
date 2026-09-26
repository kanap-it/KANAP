import * as assert from 'node:assert/strict';
import { lastValueFrom, of, throwError } from 'rxjs';
import { TenantInterceptor } from '../tenant.interceptor';

// How TenantInterceptor finishes the request transaction, with mocked runners:
// commit on success, rollback before the error surfaces, and only for the
// runners it owns.

type Events = string[];

function createRunner(name: string, events: Events, active = true) {
  const runner = {
    isTransactionActive: active,
    isReleased: false,
    connect: async () => { events.push(`${name}:connect`); },
    startTransaction: async () => { runner.isTransactionActive = true; events.push(`${name}:start`); },
    query: async () => [],
    commitTransaction: async () => { runner.isTransactionActive = false; events.push(`${name}:commit`); },
    rollbackTransaction: async () => { runner.isTransactionActive = false; events.push(`${name}:rollback`); },
    release: async () => { runner.isReleased = true; events.push(`${name}:release`); },
  };
  return runner;
}

function createInterceptor(events: Events) {
  const dataSource = { createQueryRunner: () => createRunner('own', events, false) };
  const reflector = { getAllAndOverride: () => false };
  return new TenantInterceptor(dataSource as any, reflector as any);
}

function context(req: any) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

/** Run the interceptor and record when the caller sees the outcome. */
async function run(events: Events, req: any, handle: () => any) {
  const interceptor = createInterceptor(events);
  try {
    const value = await lastValueFrom(interceptor.intercept(context(req), { handle }));
    events.push('caller:value');
    return value;
  } catch (err) {
    events.push(`caller:error:${(err as Error).message}`);
    return undefined;
  } finally {
    // finalize() commits without being awaited; let it settle.
    await new Promise((resolve) => setImmediate(resolve));
  }
}

const fail = () => throwError(() => new Error('boom'));

async function testOwnRunnerRollsBackBeforeTheErrorSurfaces() {
  const events: Events = [];
  const req: any = { tenant: { id: 'tenant-1' } };
  await run(events, req, fail);
  assert.deepEqual(events, ['own:connect', 'own:start', 'own:rollback', 'own:release', 'caller:error:boom']);
  assert.equal(req._tenantRunnerReleased, true);
}

async function testOwnRunnerCommitsOnSuccess() {
  const events: Events = [];
  const req: any = { tenant: { id: 'tenant-1' } };
  await run(events, req, () => of('ok'));
  assert.deepEqual(events.filter((e) => e !== 'caller:value'), ['own:connect', 'own:start', 'own:commit', 'own:release']);
  assert.ok(events.includes('caller:value'));
}

async function testGuardOwnedRunnerRollsBack() {
  const events: Events = [];
  const guardRunner = createRunner('guard', events);
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: guardRunner, _tenantRunnerOwner: true };
  await run(events, req, fail);
  assert.deepEqual(events, ['guard:rollback', 'guard:release', 'caller:error:boom']);
  assert.equal(req._tenantRunnerReleased, true);
}

async function testGuardOwnedRunnerCommitsOnSuccess() {
  const events: Events = [];
  const guardRunner = createRunner('guard', events);
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: guardRunner, _tenantRunnerOwner: true };
  await run(events, req, () => of('ok'));
  assert.deepEqual(events.filter((e) => e !== 'caller:value'), ['guard:commit', 'guard:release']);
  assert.ok(events.includes('caller:value'));
}

async function testSwappedRunnerRollsBack() {
  const events: Events = [];
  const guardRunner = createRunner('guard', events);
  const swapped = createRunner('swapped', events);
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: guardRunner, _tenantRunnerOwner: true };
  await run(events, req, () => {
    req.queryRunner = swapped;
    return fail();
  });
  assert.deepEqual(events, ['swapped:rollback', 'swapped:release', 'caller:error:boom']);
}

async function testForeignRunnerIsLeftToItsOwner() {
  const events: Events = [];
  const foreign = createRunner('foreign', events);
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: foreign };
  await run(events, req, fail);
  assert.deepEqual(events, ['caller:error:boom']);
  assert.equal(foreign.isTransactionActive, true);
  assert.equal(req._tenantRunnerReleased, undefined);
}

async function testRollbackFailureStillReleasesAndSurfacesTheOriginalError() {
  const events: Events = [];
  const guardRunner = createRunner('guard', events);
  guardRunner.rollbackTransaction = async () => { events.push('guard:rollback-failed'); throw new Error('connection lost'); };
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: guardRunner, _tenantRunnerOwner: true };
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await run(events, req, fail);
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(events, ['guard:rollback-failed', 'guard:release', 'caller:error:boom']);
}

async function testFailedHandlerNeverCommitsEvenWhenCleanupFails() {
  const events: Events = [];
  const guardRunner = createRunner('guard', events);
  guardRunner.rollbackTransaction = async () => { events.push('guard:rollback-failed'); throw new Error('connection lost'); };
  guardRunner.release = async () => { events.push('guard:release-failed'); throw new Error('pool gone'); };
  const req: any = { tenant: { id: 'tenant-1' }, queryRunner: guardRunner, _tenantRunnerOwner: true };
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await run(events, req, fail);
  } finally {
    console.error = originalError;
  }
  // The transaction is still open and the runner not released: finalize must not commit it.
  assert.equal(guardRunner.isTransactionActive, true);
  assert.deepEqual(events, ['guard:rollback-failed', 'guard:release-failed', 'caller:error:boom']);
}

async function main() {
  await testOwnRunnerRollsBackBeforeTheErrorSurfaces();
  await testOwnRunnerCommitsOnSuccess();
  await testGuardOwnedRunnerRollsBack();
  await testGuardOwnedRunnerCommitsOnSuccess();
  await testSwappedRunnerRollsBack();
  await testForeignRunnerIsLeftToItsOwner();
  await testRollbackFailureStillReleasesAndSurfacesTheOriginalError();
  await testFailedHandlerNeverCommitsEvenWhenCleanupFails();
  console.log('tenant-interceptor.spec: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
