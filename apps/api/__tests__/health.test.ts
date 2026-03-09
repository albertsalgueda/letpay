import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';

describe('Health check', () => {
  it('GET / returns ok status', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /health returns ok with timestamp', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
