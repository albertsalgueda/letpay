import { type Context } from 'hono';
import { DomainError } from '@letpay/core';

export function errorResponse(c: Context, err: unknown) {
  if (err instanceof DomainError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.statusCode as any);
  }

  console.error('Unhandled error:', err);
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
}
