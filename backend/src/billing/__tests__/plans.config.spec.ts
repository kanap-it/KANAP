import * as assert from 'node:assert/strict';
import {
  PLANS,
  isBankTransferEligible,
  resolvePlanKeyFromLegacyName,
  resolvePlanKeyFromPriceId,
  toPlanDisplayName,
} from '../plans.config';

function testSingleSellablePlan() {
  const keys = Object.keys(PLANS);
  assert.deepEqual(keys, ['max']);
  const plan = PLANS.max;
  assert.equal(plan.displayName, 'Hosted KANAP');
  assert.equal(plan.seatLimit, null);
  assert.equal(plan.invoiceEligible, true);
  assert.equal(plan.prices.monthly, 24900);
  assert.equal(plan.prices.annual, 249000);
}

function testLegacyNameResolution() {
  assert.equal(resolvePlanKeyFromLegacyName('Hosted KANAP'), 'max');
  assert.equal(resolvePlanKeyFromLegacyName('hosted kanap'), 'max');
  assert.equal(resolvePlanKeyFromLegacyName('max'), 'max');
  assert.equal(resolvePlanKeyFromLegacyName('Trial'), null);
  assert.equal(resolvePlanKeyFromLegacyName('Starter'), null);
  assert.equal(resolvePlanKeyFromLegacyName(null), null);
  assert.equal(toPlanDisplayName('max'), 'Hosted KANAP');
}

function testPriceIdResolution() {
  process.env.STRIPE_PRICE_MAX_MONTHLY = 'price_max_monthly_test';
  process.env.STRIPE_PRICE_MAX_ANNUAL = 'price_max_annual_test';
  assert.equal(resolvePlanKeyFromPriceId('price_max_monthly_test'), 'max');
  assert.equal(resolvePlanKeyFromPriceId('price_max_annual_test'), 'max');
  assert.equal(resolvePlanKeyFromPriceId('price_unknown'), null);
  delete process.env.STRIPE_PRICE_MAX_MONTHLY;
  delete process.env.STRIPE_PRICE_MAX_ANNUAL;
}

function testBankTransferEligibility() {
  // 249 EUR monthly is below the 1,000 EUR bank-transfer floor; 2,490 EUR annual is above.
  assert.equal(isBankTransferEligible('max', 'monthly'), false);
  assert.equal(isBankTransferEligible('max', 'annual'), true);
}

function run() {
  testSingleSellablePlan();
  testLegacyNameResolution();
  testPriceIdResolution();
  testBankTransferEligibility();
  // eslint-disable-next-line no-console
  console.log('plans.config.spec: all assertions passed');
}

run();
