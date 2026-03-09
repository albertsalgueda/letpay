import type { LetPayApiClient } from '../api-client';

export const payTool = {
  name: 'letpay_pay' as const,
  description: 'Request a payment through your LetPay wallet. If approved, returns virtual card details for the transaction.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      wallet_id: { type: 'string', description: 'The wallet ID to pay from' },
      amount_cents: { type: 'number', description: 'Amount in cents (e.g., 1500 = 15.00 EUR)' },
      currency: { type: 'string', description: 'Currency code (default: eur)', default: 'eur' },
      merchant: { type: 'string', description: 'Merchant name' },
      reason: { type: 'string', description: 'Reason for the payment' },
    },
    required: ['wallet_id', 'amount_cents', 'merchant'] as string[],
  },
  handler: async (apiClient: LetPayApiClient, params: { wallet_id: string; amount_cents: number; currency?: string; merchant: string; reason?: string }) => {
    const result = await apiClient.pay(params);

    if (result.approved && result.card) {
      return {
        content: [{
          type: 'text' as const,
          text: `Payment approved!\n\nCard details:\n  PAN: ${result.card.pan}\n  Exp: ${result.card.exp_month}/${result.card.exp_year}\n  CVV: ${result.card.cvv}\n\nTransaction ID: ${result.transaction_id}`,
        }],
      };
    }

    if (result.pending_approval) {
      return {
        content: [{
          type: 'text' as const,
          text: `Payment requires human approval (${(params.amount_cents / 100).toFixed(2)} EUR to ${params.merchant}).\nApproval ID: ${result.approval_id}\nThe user has been notified.`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Payment declined: ${result.reason}`,
      }],
    };
  },
};
