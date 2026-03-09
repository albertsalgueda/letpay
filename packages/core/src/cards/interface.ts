export interface CreateCardParams {
  externalId: string; // our wallet ID
  holderName: string;
  currency?: string;
}

export interface CardDetails {
  cardId: string;
  pan: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderName: string;
  status: 'active' | 'frozen' | 'cancelled';
}

export interface CardInfo {
  cardId: string;
  last4: string;
  expMonth: string;
  expYear: string;
  status: 'active' | 'frozen' | 'cancelled';
}

export interface SpendingLimit {
  perTransactionCents: number;
  monthlyCents: number;
}

export interface AuthorizationEvent {
  authorizationId: string;
  cardId: string;
  amountCents: number;
  currency: string;
  merchantName: string;
  merchantCategory: string;
  merchantMcc: string;
}

export interface TransactionEvent {
  transactionId: string;
  authorizationId: string;
  cardId: string;
  amountCents: number;
  currency: string;
  merchantName: string;
  merchantMcc: string;
  status: 'completed' | 'refunded';
}

export interface CardWebhookEvent {
  type: 'authorization.request' | 'authorization.created' | 'transaction.created';
  data: AuthorizationEvent | TransactionEvent;
}

export interface CardIssuingService {
  createVirtualCard(params: CreateCardParams): Promise<CardInfo>;
  getCardDetails(cardId: string): Promise<CardDetails>;
  getCardInfo(cardId: string): Promise<CardInfo>;
  freezeCard(cardId: string): Promise<void>;
  unfreezeCard(cardId: string): Promise<void>;
  cancelCard(cardId: string): Promise<void>;
  setSpendingLimits(cardId: string, limits: SpendingLimit): Promise<void>;
  approveAuthorization(authorizationId: string): Promise<void>;
  declineAuthorization(authorizationId: string, reason: string): Promise<void>;
  constructWebhookEvent(body: string, signature: string): CardWebhookEvent;
}
