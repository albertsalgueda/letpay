const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message ?? `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Wallets
  listWallets: (token: string) => apiFetch<{ data: any[] }>('/v1/wallets', { token }),
  getWallet: (id: string, token: string) => apiFetch<any>(`/v1/wallets/${id}`, { token }),
  createWallet: (name: string, token: string, initialFundingCents: number) =>
    apiFetch<any>('/v1/wallets', {
      method: 'POST',
      body: {
        name,
        initial_funding_cents: initialFundingCents,
        success_url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:3000/dashboard',
        cancel_url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:3000/dashboard',
      },
      token,
    }),
  freezeWallet: (id: string, token: string) => apiFetch<any>(`/v1/wallets/${id}/freeze`, { method: 'POST', token }),
  unfreezeWallet: (id: string, token: string) => apiFetch<any>(`/v1/wallets/${id}/unfreeze`, { method: 'POST', token }),

  // Funding
  topup: (walletId: string, amountCents: number, token: string) =>
    apiFetch<any>(`/v1/wallets/${walletId}/topup`, {
      method: 'POST',
      body: {
        amount_cents: amountCents,
        success_url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:3000/dashboard',
        cancel_url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:3000/dashboard',
      },
      token,
    }),
  getBalance: (walletId: string, token: string) => apiFetch<{ balance_cents: number }>(`/v1/wallets/${walletId}/balance`, { token }),

  // Spending Rules
  getRules: (walletId: string, token: string) => apiFetch<any>(`/v1/wallets/${walletId}/rules`, { token }),
  updateRules: (walletId: string, rules: any, token: string) =>
    apiFetch<any>(`/v1/wallets/${walletId}/rules`, { method: 'PUT', body: rules, token }),

  // Transactions
  listTransactions: (walletId: string, token: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: any[]; total: number }>(`/v1/wallets/${walletId}/transactions${query}`, { token });
  },
  allTransactions: (token: string, params?: { wallet_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.wallet_id) qs.set('wallet_id', params.wallet_id);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: any[]; total: number }>(`/v1/transactions${query}`, { token });
  },

  // Card
  getCardDetails: (walletId: string, token: string) => apiFetch<any>(`/v1/wallets/${walletId}/card`, { method: 'POST', token }),

  // Approvals
  listApprovals: (token: string) => apiFetch<{ data: any[] }>('/v1/approvals', { token }),
  approveRequest: (id: string, token: string) => apiFetch<any>(`/v1/approvals/${id}/approve`, { method: 'POST', token }),
  denyRequest: (id: string, token: string) => apiFetch<any>(`/v1/approvals/${id}/deny`, { method: 'POST', token }),

  // API Keys
  listApiKeys: (token: string) => apiFetch<{ data: any[] }>('/v1/api-keys', { token }),
  createApiKey: (name: string, scopes: string[], token: string) =>
    apiFetch<any>('/v1/api-keys', { method: 'POST', body: { name, scopes }, token }),
  deleteApiKey: (id: string, token: string) => apiFetch<any>(`/v1/api-keys/${id}`, { method: 'DELETE', token }),
};
