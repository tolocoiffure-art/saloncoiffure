import test from 'node:test';
import assert from 'node:assert/strict';
import { determineStripePriceId, ALLOWED_PLANS, isSubscriptionPlan } from '../src/lib/pricing.js';

test('ALLOWED_PLANS contains expected keys', () => {
  for (const p of ['essential','advanced','care79','care149','care249','essential999','essential1249','essential1500']) {
    assert.ok(ALLOWED_PLANS.includes(p));
  }
});

test('determineStripePriceId maps by env', () => {
  const ENV = { PRICE_ESSENTIAL: 'price_ess', PRICE_ADVANCED: 'price_adv', PRICE_CARE_79: 'price_c79' };
  assert.equal(determineStripePriceId('essential', ENV), 'price_ess');
  assert.equal(determineStripePriceId('advanced', ENV), 'price_adv');
  assert.equal(determineStripePriceId('care79', ENV), 'price_c79');
  assert.equal(determineStripePriceId('unknown', ENV), null);
});

test('isSubscriptionPlan detects subscriptions', () => {
  assert.equal(isSubscriptionPlan('care79'), true);
  assert.equal(isSubscriptionPlan('essential'), false);
});

