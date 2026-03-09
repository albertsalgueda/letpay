import type {
  CardIssuingService,
  CreateCardParams,
  CardDetails,
  CardInfo,
  SpendingLimit,
  CardWebhookEvent,
  AuthorizationEvent,
} from './interface';

let counter = 0;
function mockId(prefix: string) {
  return `${prefix}_mock_${++counter}_${Date.now().toString(36)}`;
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

interface MockCard {
  cardId: string;
  pan: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderName: string;
  status: 'active' | 'frozen' | 'cancelled';
  externalId: string;
  limits?: SpendingLimit;
}

export class MockCardIssuingService implements CardIssuingService {
  private cards = new Map<string, MockCard>();
  private authorizations = new Map<string, { approved?: boolean; reason?: string }>();
  private _nextFailure: string | null = null;

  async createVirtualCard(params: CreateCardParams): Promise<CardInfo> {
    if (this._nextFailure) {
      const msg = this._nextFailure;
      this._nextFailure = null;
      throw new Error(msg);
    }

    const cardId = mockId('card');
    const pan = `4000${randomDigits(12)}`;
    const now = new Date();
    const card: MockCard = {
      cardId,
      pan,
      expMonth: String(now.getMonth() + 1).padStart(2, '0'),
      expYear: String(now.getFullYear() + 3),
      cvv: randomDigits(3),
      holderName: params.holderName,
      status: 'active',
      externalId: params.externalId,
    };
    this.cards.set(cardId, card);

    return {
      cardId,
      last4: pan.slice(-4),
      expMonth: card.expMonth,
      expYear: card.expYear,
      status: 'active',
    };
  }

  async getCardDetails(cardId: string): Promise<CardDetails> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    return {
      cardId: card.cardId,
      pan: card.pan,
      expMonth: card.expMonth,
      expYear: card.expYear,
      cvv: card.cvv,
      holderName: card.holderName,
      status: card.status,
    };
  }

  async getCardInfo(cardId: string): Promise<CardInfo> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    return {
      cardId: card.cardId,
      last4: card.pan.slice(-4),
      expMonth: card.expMonth,
      expYear: card.expYear,
      status: card.status,
    };
  }

  async freezeCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    card.status = 'frozen';
  }

  async unfreezeCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    card.status = 'active';
  }

  async cancelCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    card.status = 'cancelled';
  }

  async setSpendingLimits(cardId: string, limits: SpendingLimit): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    card.limits = limits;
  }

  async approveAuthorization(authorizationId: string): Promise<void> {
    this.authorizations.set(authorizationId, { approved: true });
  }

  async declineAuthorization(authorizationId: string, reason: string): Promise<void> {
    this.authorizations.set(authorizationId, { approved: false, reason });
  }

  constructWebhookEvent(body: string, _signature: string): CardWebhookEvent {
    return JSON.parse(body) as CardWebhookEvent;
  }

  // Test helpers
  simulateAuthorization(cardId: string, amountCents: number, merchantName: string, merchantMcc: string): AuthorizationEvent {
    const authId = mockId('auth');
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    return {
      authorizationId: authId,
      cardId,
      amountCents,
      currency: 'eur',
      merchantName,
      merchantCategory: 'Retail',
      merchantMcc,
    };
  }

  getAuthorizationDecision(authorizationId: string) {
    return this.authorizations.get(authorizationId);
  }

  setNextFailure(message: string) {
    this._nextFailure = message;
  }

  reset() {
    this.cards.clear();
    this.authorizations.clear();
    this._nextFailure = null;
    counter = 0;
  }
}
