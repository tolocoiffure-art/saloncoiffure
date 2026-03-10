import test from 'node:test';
import { logger } from '../src/lib/logger.js';

test('logger.info does not throw', () => {
  logger.info('hello', { a: 1 });
});

