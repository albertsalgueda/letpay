import type { LetPayApiClient } from '../api-client';

export const historyTool = {
  name: 'letpay_history' as const,
  description: 'View recent transaction history for a LetPay wallet.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      wallet_id: { type: 'string', description: 'The wallet ID to get history for' },
    },
    required: ['wallet_id'] as string[],
  },
  handler: async (apiClient: LetPayApiClient, params: { wallet_id: string }) => {
    const result = await apiClient.getHistory(params.wallet_id);

    if (!result.data.length) {
      return { content: [{ type: 'text' as const, text: 'No transactions found.' }] };
    }

    const lines = result.data.map((tx) =>
      `${tx.created_at} | ${tx.merchant_name ?? 'Unknown'} | ${(tx.amount_cents / 100).toFixed(2)} EUR | ${tx.status}`
    );

    return {
      content: [{ type: 'text' as const, text: `Recent transactions:\n${lines.join('\n')}` }],
    };
  },
};
