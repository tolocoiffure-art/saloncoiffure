import test from 'node:test';
import assert from 'node:assert/strict';
import { generateClientSlug } from '../src/lib/slug.js';

test('generateClientSlug combines name and company', () => {
  assert.equal(generateClientSlug('Alice', 'ACME SA'), 'alice-acme-sa');
});

test('generateClientSlug fallback', () => {
  assert.equal(generateClientSlug('', ''), 'client');
});

