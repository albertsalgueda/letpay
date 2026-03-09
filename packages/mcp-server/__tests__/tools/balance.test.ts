import { describe, it, expect, vi } from 'vitest';
import { balanceTool } from '../../src/tools/balance';
import type { LetPayApiClient } from '../../src/api-client';

function mockClient(overrides: Partial<LetPayApiClient> = {}): LetPayApiClient {
  return {
    getBalance: vi.fn().mockResolvedValue({
      data: [
        { wallet_id: 'w1', name: 'Agent 1', balance_cents: 5000, status: 'active' },
        { wallet_id: 'w2', name: 'Agent 2', balance_cents: 0, status: 'frozen' },
      ],
    }),
    pay: vi.fn(),
    getHistory: vi.fn(),
    topup: vi.fn(),
    ...overrides,
  } as any;
}

describe('letpay_balance tool', () => {
  it('returns formatted balance for all wallets', async () => {
    const client = mockClient();
    const result = await balanceTool.handler(client);
    expect(result.content[0].text).toContain('Agent 1');
    expect(result.content[0].text).toContain('50.00 EUR');
    expect(result.content[0].text).toContain('frozen');
  });

  it('handles empty wallets', async () => {
    const client = mockClient({ getBalance: vi.fn().mockResolvedValue({ data: [] }) } as any);
    const result = await balanceTool.handler(client);
    expect(result.content[0].text).toBe('No wallets found.');
  });
});
