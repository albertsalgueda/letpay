import { createHmac, generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import type {
  CardIssuingService,
  CreateCardParams,
  CardDetails,
  CardInfo,
  SpendingLimit,
  CardWebhookEvent,
  AuthorizationEvent,
  TransactionEvent,
} from './interface';

export interface WallesterConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  productCode: string;
  accountId: string;
  auditUserId?: string;
  webhookSecret?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

type WallesterCardStatus =
  | 'Active'
  | 'AwaitingRenewal'
  | 'Blocked'
  | 'Closed'
  | 'Closing'
  | 'Created'
  | 'Dispatched'
  | 'Expired'
  | 'Ordered'
  | 'Personalized';

function mapStatus(wallesterStatus: string): 'active' | 'frozen' | 'cancelled' {
  switch (wallesterStatus as WallesterCardStatus) {
    case 'Active':
    case 'AwaitingRenewal':
    case 'Created':
    case 'Dispatched':
    case 'Ordered':
    case 'Personalized':
      return 'active';
    case 'Blocked':
      return 'frozen';
    case 'Closed':
    case 'Closing':
    case 'Expired':
      return 'cancelled';
    default:
      return 'active';
  }
}

function parseExpiryDate(expiryDate: string): { expMonth: string; expYear: string } {
  const d = new Date(expiryDate);
  return {
    expMonth: String(d.getMonth() + 1).padStart(2, '0'),
    expYear: String(d.getFullYear()),
  };
}

export class WallesterCardIssuingService implements CardIssuingService {
  private config: WallesterConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config: WallesterConfig) {
    this.config = config;
  }

  // ── JWT Authentication ──

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 30_000) {
      return this.cachedToken.token;
    }

    const res = await fetch(`${this.config.baseUrl}/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new WallesterApiError(`Token request failed (${res.status}): ${text}`, res.status);
    }

    const data = (await res.json()) as { token: string; expires_in: number };
    this.cachedToken = {
      token: data.token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.cachedToken.token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Product-Code': this.config.productCode,
      'X-Audit-Source-Type': 'Backend',
    };
    if (this.config.auditUserId) {
      headers['X-Audit-User-Id'] = this.config.auditUserId;
    }

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new WallesterApiError(
        `Wallester ${method} ${path} failed (${res.status}): ${text}`,
        res.status,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // ── RSA helpers for encrypted card data ──

  private generateRsaKeyPair() {
    return generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  }

  private decryptWithPrivateKey(encryptedBase64: string, privateKeyPem: string): string {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    const decrypted = privateDecrypt(
      { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      buffer,
    );
    return decrypted.toString('utf-8');
  }

  // ── CardIssuingService implementation ──

  async createVirtualCard(params: CreateCardParams): Promise<CardInfo> {
    const data = await this.request<{ card: WallesterCard }>('POST', '/v1/cards', {
      type: 'Virtual',
      account_id: this.config.accountId,
      external_id: params.externalId,
      name: params.holderName,
      expiry_days: 365,
    });

    const card = data.card;
    const { expMonth, expYear } = parseExpiryDate(card.expiry_date);

    return {
      cardId: card.id,
      last4: card.masked_card_number.slice(-4),
      expMonth,
      expYear,
      status: mapStatus(card.status),
    };
  }

  async getCardDetails(cardId: string): Promise<CardDetails> {
    const { publicKey, privateKey } = this.generateRsaKeyPair();
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    const [cardData, panData, cvvData] = await Promise.all([
      this.request<{ card: WallesterCard }>('GET', `/v1/cards/${cardId}`),
      this.request<{ encrypted_card_number: string }>(
        'POST',
        `/v1/cards/${cardId}/encrypted-card-number`,
        { public_key: publicKeyBase64 },
      ),
      this.request<{ encrypted_cvv2: string }>(
        'POST',
        `/v1/cards/${cardId}/encrypted-cvv2`,
        { public_key: publicKeyBase64 },
      ),
    ]);

    const pan = this.decryptWithPrivateKey(panData.encrypted_card_number, privateKey);
    const cvv = this.decryptWithPrivateKey(cvvData.encrypted_cvv2, privateKey);
    const { expMonth, expYear } = parseExpiryDate(cardData.card.expiry_date);

    return {
      cardId: cardData.card.id,
      pan,
      expMonth,
      expYear,
      cvv,
      holderName: cardData.card.name ?? '',
      status: mapStatus(cardData.card.status),
    };
  }

  async getCardInfo(cardId: string): Promise<CardInfo> {
    const data = await this.request<{ card: WallesterCard }>('GET', `/v1/cards/${cardId}`);
    const card = data.card;
    const { expMonth, expYear } = parseExpiryDate(card.expiry_date);

    return {
      cardId: card.id,
      last4: card.masked_card_number.slice(-4),
      expMonth,
      expYear,
      status: mapStatus(card.status),
    };
  }

  async freezeCard(cardId: string): Promise<void> {
    await this.request('PATCH', `/v1/cards/${cardId}/block`, {
      block_type: 'BlockedByClient',
    });
  }

  async unfreezeCard(cardId: string): Promise<void> {
    await this.request('PATCH', `/v1/cards/${cardId}/unblock`);
  }

  async cancelCard(cardId: string): Promise<void> {
    await this.request('PATCH', `/v1/cards/${cardId}/close`, {
      close_reason: 'ClosedByClient',
    });
  }

  async setSpendingLimits(cardId: string, limits: SpendingLimit): Promise<void> {
    await this.request('PATCH', `/v1/cards/${cardId}/limits`, {
      transaction_purchase: limits.perTransactionCents,
      monthly_purchase: limits.monthlyCents,
    });
  }

  async approveAuthorization(authorizationId: string): Promise<void> {
    await this.request('POST', `/v1/authorizations/${authorizationId}/approve`);
  }

  async declineAuthorization(authorizationId: string, reason: string): Promise<void> {
    await this.request('POST', `/v1/authorizations/${authorizationId}/decline`, {
      reason,
    });
  }

  constructWebhookEvent(body: string, signature: string): CardWebhookEvent {
    if (this.config.webhookSecret) {
      const expected = createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex');
      if (signature !== expected) {
        throw new WallesterWebhookError('Invalid webhook signature');
      }
    }

    const raw = JSON.parse(body) as WallesterWebhookPayload;
    return this.mapWebhookEvent(raw);
  }

  // ── Webhook mapping ──

  private mapWebhookEvent(raw: WallesterWebhookPayload): CardWebhookEvent {
    switch (raw.event_type) {
      case 'decision-request-authorization-event': {
        const auth: AuthorizationEvent = {
          authorizationId: raw.authorization_id ?? raw.id,
          cardId: raw.card_id,
          amountCents: Math.round((raw.amount ?? 0) * 100),
          currency: raw.currency?.toLowerCase() ?? 'eur',
          merchantName: raw.merchant_name ?? '',
          merchantCategory: raw.merchant_category ?? '',
          merchantMcc: raw.merchant_mcc ?? '',
        };
        return { type: 'authorization.request', data: auth };
      }
      case 'authorization-event': {
        const auth: AuthorizationEvent = {
          authorizationId: raw.authorization_id ?? raw.id,
          cardId: raw.card_id,
          amountCents: Math.round((raw.amount ?? 0) * 100),
          currency: raw.currency?.toLowerCase() ?? 'eur',
          merchantName: raw.merchant_name ?? '',
          merchantCategory: raw.merchant_category ?? '',
          merchantMcc: raw.merchant_mcc ?? '',
        };
        return { type: 'authorization.created', data: auth };
      }
      case 'transaction-event': {
        const tx: TransactionEvent = {
          transactionId: raw.transaction_id ?? raw.id,
          authorizationId: raw.authorization_id ?? '',
          cardId: raw.card_id,
          amountCents: Math.round((raw.amount ?? 0) * 100),
          currency: raw.currency?.toLowerCase() ?? 'eur',
          merchantName: raw.merchant_name ?? '',
          merchantMcc: raw.merchant_mcc ?? '',
          status: raw.status === 'refunded' ? 'refunded' : 'completed',
        };
        return { type: 'transaction.created', data: tx };
      }
      default:
        throw new WallesterWebhookError(`Unknown Wallester event type: ${raw.event_type}`);
    }
  }
}

// ── Wallester API types (snake_case) ──

interface WallesterCard {
  id: string;
  masked_card_number: string;
  status: string;
  expiry_date: string;
  type: string;
  name?: string;
  external_id?: string;
}

interface WallesterWebhookPayload {
  id: string;
  event_type: string;
  card_id: string;
  authorization_id?: string;
  transaction_id?: string;
  amount?: number;
  currency?: string;
  merchant_name?: string;
  merchant_category?: string;
  merchant_mcc?: string;
  status?: string;
}

// ── Error classes ──

export class WallesterApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'WallesterApiError';
  }
}

export class WallesterWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WallesterWebhookError';
  }
}
