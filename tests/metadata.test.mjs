import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeMetadata } from '../src/lib/metadata.js';

test('serializeMetadata normalizes fields', () => {
  const md = serializeMetadata({
    name: '  Alice ',
    email: 'contact@lausannedemenagement.ch',
    company: ' ACME ',
    phone: '079 123 45 67',
    template: 'classic',
    plan: 'Essential',
    agencyId: ' 1234-abc ',
  });
  assert.equal(md.name, 'Alice');
  assert.equal(md.email, 'contact@lausannedemenagement.ch');
  assert.equal(md.company, 'ACME');
  assert.equal(md.phone.startsWith('+'), true);
  assert.equal(md.template, 'classic');
  assert.equal(md.plan, 'essential');
  assert.ok(md.clientSlug.length > 0);
  assert.equal(md.agencyId, '1234-abc');
});

