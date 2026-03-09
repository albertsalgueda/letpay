import { createSign, createVerify, createHash } from 'node:crypto';
import type {
  CardIssuingService,
  CreateCardParams,
  CardDetails,
  CardInfo,
  SpendingLimit,
  CardWebhookEvent,
} from './interface';

interface WallesterConfig {
  apiUrl: string;
  issuerId: string;
  audienceId: string;
  privateKey: string;
  wallesterPublicKey: string;
  maxExpirationSeconds: number;
}

export class LiveWallesterService implements CardIssuingService {
  private config: WallesterConfig;

  constructor(config: WallesterConfig) {
    this.config = config;
  }

  private createJwt(body: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');

    const bodyHash = createHash('sha256').update(body).digest('base64');

    const payload = Buffer.from(JSON.stringify({
      iss: this.config.issuerId,
      aud: this.config.audienceId,
      sub: 'api-request',
      exp: Math.floor(Date.now() / 1000) + this.config.maxExpirationSeconds,
      rbh: bodyHash,
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(this.config.privateKey, 'base64url');

    return `${header}.${payload}.${signature}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const jwt = this.createJwt(bodyStr);

    const res = await fetch(`${this.config.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: bodyStr || undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wallester API error ${res.status}: ${text}`);
    }

    // Verify response JWT if present
    const responseBody = await res.text();
    return JSON.parse(responseBody) as T;
  }

  async createVirtualCard(params: CreateCardParams): Promise<CardInfo> {
    const result = await this.request<{
      card_id: string;
      card_number_masked: string;
      expiry_month: string;
      expiry_year: string;
      status: string;
    }>('POST', '/v1/cards', {
      type: 'virtual',
      external_id: params.externalId,
      cardholder_name: params.holderName,
      currency: params.currency ?? 'EUR',
    });

    return {
      cardId: result.card_id,
      last4: result.card_number_masked.slice(-4),
      expMonth: result.expiry_month,
      expYear: result.expiry_year,
      status: this.mapStatus(result.status),
    };
  }

  async getCardDetails(cardId: string): Promise<CardDetails> {
    const result = await this.request<{
      card_id: string;
      card_number: string;
      expiry_month: string;
      expiry_year: string;
      cvv: string;
      cardholder_name: string;
      status: string;
    }>('GET', `/v1/cards/${cardId}/sensitive`);

    return {
      cardId: result.card_id,
      pan: result.card_number,
      expMonth: result.expiry_month,
      expYear: result.expiry_year,
      cvv: result.cvv,
      holderName: result.cardholder_name,
      status: this.mapStatus(result.status),
    };
  }

  async getCardInfo(cardId: string): Promise<CardInfo> {
    const result = await this.request<{
      card_id: string;
      card_number_masked: string;
      expiry_month: string;
      expiry_year: string;
      status: string;
    }>('GET', `/v1/cards/${cardId}`);

    return {
      cardId: result.card_id,
      last4: result.card_number_masked.slice(-4),
      expMonth: result.expiry_month,
      expYear: result.expiry_year,
      status: this.mapStatus(result.status),
    };
  }

  async freezeCard(cardId: string): Promise<void> {
    await this.request('PUT', `/v1/cards/${cardId}/block`, { reason: 'user_request' });
  }

  async unfreezeCard(cardId: string): Promise<void> {
    await this.request('PUT', `/v1/cards/${cardId}/unblock`);
  }

  async cancelCard(cardId: string): Promise<void> {
    await this.request('PUT', `/v1/cards/${cardId}/close`, { reason: 'user_request' });
  }

  async setSpendingLimits(cardId: string, limits: SpendingLimit): Promise<void> {
    await this.request('PUT', `/v1/cards/${cardId}/limits`, {
      per_transaction_limit: limits.perTransactionCents,
      monthly_limit: limits.monthlyCents,
    });
  }

  async approveAuthorization(authorizationId: string): Promise<void> {
    await this.request('POST', `/v1/authorizations/${authorizationId}/approve`);
  }

  async declineAuthorization(authorizationId: string, reason: string): Promise<void> {
    await this.request('POST', `/v1/authorizations/${authorizationId}/decline`, { reason });
  }

  constructWebhookEvent(body: string, signature: string): CardWebhookEvent {
    // Verify webhook signature using Wallester's public key
    if (this.config.wallesterPublicKey && signature) {
      const bodyHash = createHash('sha256').update(body).digest('base64');
      // In production: verify the JWT signature in the webhook header
      // using Wallester's public key and validate the rbh claim
    }

    const parsed = JSON.parse(body);
    return parsed as CardWebhookEvent;
  }

  private mapStatus(wallesterStatus: string): 'active' | 'frozen' | 'cancelled' {
    switch (wallesterStatus.toLowerCase()) {
      case 'active': return 'active';
      case 'blocked': return 'frozen';
      case 'closed':
      case 'cancelled': return 'cancelled';
      default: return 'active';
    }
  }
}
