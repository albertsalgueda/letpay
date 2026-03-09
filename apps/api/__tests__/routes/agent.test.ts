import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, mockJwt } from '../helpers/test-app.js';

describe('Agent routes', () => {
  let app: ReturnType<typeof createTestApp>['app'];

  beforeEach(() => {
    const test = createTestApp();
    app = test.app;
  });

  it('GET /v1/agent/balance returns wallet balances', async () => {
    const res = await app.request('/v1/agent/balance', {
      headers: { Authorization: `Bearer ${mockJwt()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].balance_cents).toBe(10000);
  });

  it('POST /v1/agent/pay with valid request returns card details', async () => {
    const res = await app.request('/v1/agent/pay', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockJwt('u1')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_id: '00000000-0000-0000-0000-000000000001',
        amount_cents: 500,
        merchant: 'Coffee Shop',
        reason: 'Morning coffee',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approved).toBe(true);
    expect(body.card.pan).toBeDefined();
    expect(body.card.cvv).toBeDefined();
  });

  it('POST /v1/agent/pay requires auth', async () => {
    const res = await app.request('/v1/agent/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_id: '00000000-0000-0000-0000-000000000001',
        amount_cents: 500,
        merchant: 'Coffee Shop',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /v1/agent/history requires wallet_id', async () => {
    const res = await app.request('/v1/agent/history', {
      headers: { Authorization: `Bearer ${mockJwt()}` },
    });
    expect(res.status).toBe(400);
  });
});
