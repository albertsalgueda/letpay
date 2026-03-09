import type { LetPayApiClient } from '../api-client';

export const requestTopupTool = {
  name: 'letpay_request_topup' as const,
  description: 'Request the user to add funds to a LetPay wallet. Returns a checkout URL.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      wallet_id: { type: 'string', description: 'The wallet ID to top up' },
      amount_cents: { type: 'number', description: 'Amount in cents to request (e.g., 5000 = 50.00 EUR)' },
    },
    required: ['wallet_id', 'amount_cents'] as string[],
  },
  handler: async (apiClient: LetPayApiClient, params: { wallet_id: string; amount_cents: number }) => {
    const result = await apiClient.topup(params.wallet_id, params.amount_cents);

    return {
      content: [{
        type: 'text' as const,
        text: `Top-up requested: ${(params.amount_cents / 100).toFixed(2)} EUR\nPlease ask the user to complete payment at:\n${result.checkout_url}`,
      }],
    };
  },
};
