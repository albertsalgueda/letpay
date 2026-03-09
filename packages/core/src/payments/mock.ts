import type {
  PaymentService,
  CheckoutSessionParams,
  CheckoutSession,
  PaymentWebhookEvent,
} from './interface';

let counter = 0;
function mockId(prefix: string) {
  return `${prefix}_mock_${++counter}_${Date.now().toString(36)}`;
}

export class MockPaymentService implements PaymentService {
  private sessions = new Map<string, CheckoutSession & { metadata: Record<string, string> }>();
  private _nextFailure: string | null = null;

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
    if (this._nextFailure) {
      const msg = this._nextFailure;
      this._nextFailure = null;
      throw new Error(msg);
    }

    const id = mockId('cs');
    const paymentIntentId = mockId('pi');
    const session = {
      id,
      url: `https://checkout.mock.stripe.com/${id}`,
      paymentIntentId,
      status: 'open' as const,
      amountCents: params.amountCents,
      metadata: {
        userId: params.userId,
        walletId: params.walletId,
      },
    };
    this.sessions.set(id, session);
    return session;
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session;
  }

  constructWebhookEvent(body: string, _signature: string): PaymentWebhookEvent {
    const parsed = JSON.parse(body);
    return parsed as PaymentWebhookEvent;
  }

  // Test helpers
  simulateCheckoutComplete(sessionId: string): PaymentWebhookEvent {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.status = 'complete';
    return {
      type: 'checkout.session.completed',
      data: {
        sessionId: session.id,
        paymentIntentId: session.paymentIntentId!,
        amountCents: session.amountCents,
        metadata: session.metadata,
      },
    };
  }

  setNextFailure(message: string) {
    this._nextFailure = message;
  }

  reset() {
    this.sessions.clear();
    this._nextFailure = null;
  }
}
