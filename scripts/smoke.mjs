// Simple smoke tests for Pedro Demenagement backend
// Usage: SITE_URL=https://pedrodemenagement.ch node scripts/smoke.mjs

const SITE = process.env.SITE_URL || 'http://localhost:4321';

async function postJSON(path, body) {
  const res = await fetch(`${SITE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function get(path) {
  const res = await fetch(`${SITE}${path}`, { method: 'GET', redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location') };
}

(async () => {
  const results = {};

  // Health
  try {
    const res = await fetch(`${SITE}/api/health`);
    results.health = { status: res.status, ok: res.ok };
  } catch (e) {
    results.health = { error: e.message };
  }

  // Contact (JSON)
  results.contact = await postJSON('/api/contact', {
    name: 'Smoke Test',
    email: 'contact@lausannedemenagement.ch',
    company: 'Pedro Demenagement',
    message: 'This is a test lead from smoke tests.'
  });

  // Demo (JSON)
  results.demo = await postJSON('/api/demo', {
    name: 'Smoke Demo',
    email: 'contact@lausannedemenagement.ch',
    company: 'Pedro Demenagement',
    details: 'Demo request.'
  });

  // Stripe redirect (should 303 when configured, else 501 or 400)
  results.checkoutEssential = await get('/api/payment/redirect?plan=essential');
  results.checkoutCare = await get('/api/payment/redirect?plan=care79');

  console.log('\nSmoke test results for', SITE);
  console.log(JSON.stringify(results, null, 2));
  const exitBad = [results.health, results.contact, results.demo].some((r) => !(r && (r.ok || r.status === 200)));
  process.exit(exitBad ? 1 : 0);
})();

