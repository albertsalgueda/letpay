import type { LetPayApiClient } from '../api-client';

export const balanceTool = {
  name: 'letpay_balance' as const,
  description: 'Check your LetPay wallet balance and spending summary. Returns balance in cents for all wallets.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
  handler: async (apiClient: LetPayApiClient) => {
    const result = await apiClient.getBalance();
    const lines = result.data.map((w) =>
      `${w.name} (${w.wallet_id}): ${(w.balance_cents / 100).toFixed(2)} EUR — ${w.status}`
    );
    return {
      content: [{ type: 'text' as const, text: lines.length ? lines.join('\n') : 'No wallets found.' }],
    };
  },
};
