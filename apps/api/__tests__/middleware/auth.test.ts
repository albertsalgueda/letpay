import { describe, it, expect } from 'vitest';
import { createTestApp, mockJwt } from '../helpers/test-app.js';

describe('Auth middleware', () => {
  it('rejects requests without Authorization header', async () => {
    const { app } = createTestApp();
    const res = await app.request('/v1/wallets');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts valid JWT token', async () => {
    const { app } = createTestApp();
    const res = await app.request('/v1/wallets', {
      headers: { Authorization: `Bearer ${mockJwt('user-123')}` },
    });
    expect(res.status).toBe(200);
  });

  it('rejects invalid token', async () => {
    const { app } = createTestApp();
    // Non-API-key tokens that aren't valid JWTs are rejected
    const res = await app.request('/v1/wallets', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  }, 15000);

  it('accepts API key auth', async () => {
    const { app } = createTestApp();
    const res = await app.request('/v1/wallets', {
      headers: { Authorization: 'Bearer lp_sk_test123456789' },
    });
    // Mock apiKeyService.verify returns { userId: 'u1', scopes: ['read', 'pay'] }
    expect(res.status).toBe(200);
  });
});
