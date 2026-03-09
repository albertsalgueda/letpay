import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, mockJwt } from '../helpers/test-app.js';

describe('Wallet routes', () => {
  let app: ReturnType<typeof createTestApp>['app'];

  beforeEach(() => {
    const test = createTestApp();
    app = test.app;
  });

  it('GET /v1/wallets requires auth', async () => {
    const res = await app.request('/v1/wallets');
    expect(res.status).toBe(401);
  });

  it('GET /v1/wallets returns wallets with auth', async () => {
    const res = await app.request('/v1/wallets', {
      headers: { Authorization: `Bearer ${mockJwt()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('w1');
  });

  it('POST /v1/wallets creates a wallet', async () => {
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockJwt()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Agent Wallet' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('w1');
  });

  it('GET /v1/wallets/:id returns a wallet', async () => {
    const res = await app.request('/v1/wallets/00000000-0000-0000-0000-000000000001', {
      headers: { Authorization: `Bearer ${mockJwt()}` },
    });
    expect(res.status).toBe(200);
  });

  it('POST /v1/wallets/:id/freeze freezes wallet', async () => {
    const res = await app.request('/v1/wallets/00000000-0000-0000-0000-000000000001/freeze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mockJwt()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('frozen');
  });
});
