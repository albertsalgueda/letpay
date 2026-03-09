import { describe, it, expect, vi } from 'vitest';
import { historyTool } from '../../src/tools/history';
import type { LetPayApiClient } from '../../src/api-client';

function mockClient(overrides: Partial<LetPayApiClient> = {}): LetPayApiClient {
  return {
    getBalance: vi.fn(),
    pay: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({
      data: [
        { id: 'tx1', amount_cents: 500, merchant_name: 'Coffee Shop', status: 'approved', created_at: '2026-03-09' },
        { id: 'tx2', amount_cents: 1500, merchant_name: 'Bookstore', status: 'declined', created_at: '2026-03-08' },
      ],
    }),
    topup: vi.fn(),
    ...overrides,
  } as any;
}

describe('letpay_history tool', () => {
  it('returns formatted transaction history', async () => {
    const client = mockClient();
    const result = await historyTool.handler(client, { wallet_id: 'w1' });
    expect(result.content[0].text).toContain('Coffee Shop');
    expect(result.content[0].text).toContain('5.00 EUR');
    expect(result.content[0].text).toContain('declined');
  });

  it('handles empty history', async () => {
    const client = mockClient({ getHistory: vi.fn().mockResolvedValue({ data: [] }) } as any);
    const result = await historyTool.handler(client, { wallet_id: 'w1' });
    expect(result.content[0].text).toBe('No transactions found.');
  });
});
