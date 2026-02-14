import * as assert from 'node:assert/strict';
import { normalizeBindingLifecycle } from '../interface-bindings.service';

async function testPassthroughLifecycle() {
  const values = ['proposed', 'approved', 'active', 'deprecated', 'retired'] as const;
  for (const v of values) {
    const out = normalizeBindingLifecycle(v);
    assert.equal(out, v);
  }
}

async function testLegacyStatusMapping() {
  assert.equal(normalizeBindingLifecycle('enabled'), 'active');
  assert.equal(normalizeBindingLifecycle('ENABLED'), 'active');
  assert.equal(normalizeBindingLifecycle('paused'), 'active');
  assert.equal(normalizeBindingLifecycle('PAUSED'), 'active');
}

(async () => {
  await testPassthroughLifecycle();
  await testLegacyStatusMapping();
  // eslint-disable-next-line no-console
  console.log('Interface binding lifecycle helpers pass unit checks.');
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
