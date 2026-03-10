import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuccessUrl, buildCancelUrl } from '../src/lib/urls.js';

test('build urls trims trailing slash', () => {
  assert.equal(buildSuccessUrl('https://a/'), 'https://a/thank-you?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(buildCancelUrl('https://a/'), 'https://a/pricing');
});

