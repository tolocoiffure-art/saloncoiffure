import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedTemplate, ALLOWED_TEMPLATES } from '../src/lib/templates.js';

test('isAllowedTemplate validates known IDs', () => {
  for (const t of ALLOWED_TEMPLATES) {
    assert.equal(isAllowedTemplate(t), true);
  }
  assert.equal(isAllowedTemplate('unknown-template'), false);
});

