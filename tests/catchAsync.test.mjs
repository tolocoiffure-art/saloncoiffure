import test from 'node:test';
import assert from 'node:assert/strict';
import { catchAsync } from '../src/lib/catchAsync.js';

test('catchAsync wraps errors into 500 Response', async () => {
  const handler = catchAsync(async () => { throw new Error('boom'); });
  const res = await handler();
  assert.equal(res.status, 500);
});

