import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTenantFromRequest } from '../src/lib/tenants.ts';

function makeRequest(path: string, host = 'example.com') {
  return new Request(`https://${host}${path}`);
}

test('tenant resolver uses host mapping', () => {
  const req = makeRequest('/pricing', 'maisoncortes.ch');
  const tenant = resolveTenantFromRequest(req);

  assert.equal(tenant.slug, 'maison-cortes');
  assert.equal(tenant.source, 'host');
  assert.equal(tenant.basePath, '/maison-cortes');
});

test('tenant resolver falls back to path prefix', () => {
  const req = makeRequest('/tonsiteweb/contact', 'localhost:4321');
  const tenant = resolveTenantFromRequest(req);

  assert.equal(tenant.slug, 'tonsiteweb');
  assert.equal(tenant.source, 'path');
  assert.equal(tenant.basePath, '/tonsiteweb');
});

test('tenant resolver defaults to pedro', () => {
  const tenant = resolveTenantFromRequest(makeRequest('/'));
  assert.equal(tenant.slug, 'pedro');
});
