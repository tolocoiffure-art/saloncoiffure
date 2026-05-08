import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber } from '../src/lib/phone.js';

test('normalizePhoneNumber handles Swiss local', () => {
  assert.equal(normalizePhoneNumber('079 123 45 67'), '+41791234567');
});

test('normalizePhoneNumber leaves + intact', () => {
  assert.equal(normalizePhoneNumber('+41 79 123 45 67'), '+41791234567');
});

test('normalizePhoneNumber handles 00 prefix', () => {
  assert.equal(normalizePhoneNumber('0041 79 123 45 67'), '+41791234567');
});

