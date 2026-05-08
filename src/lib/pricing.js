export const ALLOWED_PLANS = [
  'essential',
  'advanced',
  'care79',
  'care149',
  'care249',
  'essential999',
  'essential1249',
  'essential1500',
];

export function isSubscriptionPlan(plan) {
  return String(plan || '').startsWith('care');
}

export function determineStripePriceId(plan, env) {
  const p = String(plan || '').toLowerCase();
  if (!ALLOWED_PLANS.includes(p)) return null;
  const E = env || {};
  const map = {
    essential: E.PRICE_ESSENTIAL,
    advanced: E.PRICE_ADVANCED,
    care79: E.PRICE_CARE_79,
    care149: E.PRICE_CARE_149,
    care249: E.PRICE_CARE_249,
    essential999: E.PRICE_ESSENTIAL_999,
    essential1249: E.PRICE_ESSENTIAL_1249,
    essential1500: E.PRICE_ESSENTIAL_1500,
  };
  return map[p] || null;
}

