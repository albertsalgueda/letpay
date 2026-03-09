import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentService } from '../../src/payments/mock';

describe('MockPaymentService', () => {
  let service: MockPaymentService;

  beforeEach(() => {
    service = new MockPaymentService();
  });

  it('creates a checkout session', async () => {
    const session = await service.createCheckoutSession({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountCents: 5000,
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    });

    expect(session.id).toContain('cs_mock');
    expect(session.url).toContain('checkout.mock.stripe.com');
    expect(session.paymentIntentId).toContain('pi_mock');
    expect(session.status).toBe('open');
    expect(session.amountCents).toBe(5000);
  });

  it('retrieves a created session', async () => {
    const session = await service.createCheckoutSession({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountCents: 5000,
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    });

    const retrieved = await service.getCheckoutSession(session.id);
    expect(retrieved.id).toBe(session.id);
  });

  it('throws for unknown session', async () => {
    await expect(service.getCheckoutSession('unknown')).rejects.toThrow('not found');
  });

  it('simulates checkout completion', async () => {
    const session = await service.createCheckoutSession({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountCents: 5000,
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    });

    const event = service.simulateCheckoutComplete(session.id);
    expect(event.type).toBe('checkout.session.completed');
    expect(event.data.amountCents).toBe(5000);
    expect(event.data.metadata.walletId).toBe('wallet-1');
  });

  it('supports configurable failures', async () => {
    service.setNextFailure('Stripe is down');
    await expect(service.createCheckoutSession({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountCents: 5000,
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    })).rejects.toThrow('Stripe is down');
  });
});
