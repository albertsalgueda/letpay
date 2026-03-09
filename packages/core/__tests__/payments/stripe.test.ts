import { describe, it, expect } from 'vitest';
import { StripePaymentService } from '../../src/payments/stripe';

describe('StripePaymentService', () => {
  it('can be instantiated with keys', () => {
    const service = new StripePaymentService('sk_test_fake', 'whsec_fake');
    expect(service).toBeDefined();
  });

  it('throws on invalid webhook event', () => {
    const service = new StripePaymentService('sk_test_fake', 'whsec_fake');
    expect(() => service.constructWebhookEvent('{}', 'invalid-sig')).toThrow();
  });
});
