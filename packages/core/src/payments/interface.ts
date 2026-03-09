export interface CheckoutSessionParams {
  userId: string;
  walletId: string;
  amountCents: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  paymentIntentId: string | null;
  status: 'open' | 'complete' | 'expired';
  amountCents: number;
}

export interface PaymentWebhookEvent {
  type: 'checkout.session.completed' | 'payment_intent.succeeded' | 'payment_intent.payment_failed';
  data: {
    sessionId?: string;
    paymentIntentId?: string;
    amountCents: number;
    metadata: Record<string, string>;
  };
}

export interface PaymentService {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSession>;
  constructWebhookEvent(body: string, signature: string): PaymentWebhookEvent;
}
