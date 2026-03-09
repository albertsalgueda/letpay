import Stripe from 'stripe';
import type {
  PaymentService,
  CheckoutSessionParams,
  CheckoutSession,
  PaymentWebhookEvent,
} from './interface';

export class StripePaymentService implements PaymentService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: params.currency ?? 'eur',
          unit_amount: params.amountCents,
          product_data: { name: 'LetPay Wallet Top-Up' },
        },
        quantity: 1,
      }],
      metadata: {
        userId: params.userId,
        walletId: params.walletId,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      id: session.id,
      url: session.url!,
      paymentIntentId: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      status: session.status === 'complete' ? 'complete' : session.status === 'expired' ? 'expired' : 'open',
      amountCents: params.amountCents,
    };
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      url: session.url!,
      paymentIntentId: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      status: session.status === 'complete' ? 'complete' : session.status === 'expired' ? 'expired' : 'open',
      amountCents: session.amount_total ?? 0,
    };
  }

  constructWebhookEvent(body: string, signature: string): PaymentWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: 'checkout.session.completed',
          data: {
            sessionId: session.id,
            paymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
            amountCents: session.amount_total ?? 0,
            metadata: (session.metadata ?? {}) as Record<string, string>,
          },
        };
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment_intent.succeeded',
          data: {
            paymentIntentId: pi.id,
            amountCents: pi.amount,
            metadata: (pi.metadata ?? {}) as Record<string, string>,
          },
        };
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment_intent.payment_failed',
          data: {
            paymentIntentId: pi.id,
            amountCents: pi.amount,
            metadata: (pi.metadata ?? {}) as Record<string, string>,
          },
        };
      }
      default:
        throw new Error(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
