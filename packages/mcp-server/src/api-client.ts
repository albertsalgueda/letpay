export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

export class LetPayApiClient {
  constructor(private config: ApiClientConfig) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: { message: 'Request failed' } })) as { error?: { message?: string } };
      throw new Error(errorBody.error?.message ?? `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async getBalance() {
    return this.request<{ data: Array<{ wallet_id: string; name: string; balance_cents: number; status: string }> }>('GET', '/v1/agent/balance');
  }

  async pay(params: { wallet_id: string; amount_cents: number; currency?: string; merchant: string; reason?: string }) {
    return this.request<{
      approved: boolean;
      transaction_id?: string;
      card?: { pan: string; exp_month: string; exp_year: string; cvv: string };
      reason?: string;
      pending_approval?: boolean;
      approval_id?: string;
    }>('POST', '/v1/agent/pay', params);
  }

  async getHistory(walletId: string) {
    return this.request<{ data: Array<{ id: string; amount_cents: number; merchant_name: string; status: string; created_at: string }> }>('GET', `/v1/agent/history?wallet_id=${walletId}`);
  }

  async topup(walletId: string, amountCents: number) {
    return this.request<{ checkout_url: string }>('POST', `/v1/wallets/${walletId}/topup`, {
      amount_cents: amountCents,
      success_url: 'https://letpay.ai/success',
      cancel_url: 'https://letpay.ai/cancel',
    });
  }
}
