import { describe, it, expect, vi } from 'vitest';
import { payTool } from '../../src/tools/pay';
import type { LetPayApiClient } from '../../src/api-client';

function mockClient(overrides: Partial<LetPayApiClient> = {}): LetPayApiClient {
  return {
    getBalance: vi.fn(),
    pay: vi.fn().mockResolvedValue({
      approved: true,
      transaction_id: 'tx1',
      card: { pan: '4000123456789012', exp_month: '12', exp_year: '2028', cvv: '123' },
    }),
    getHistory: vi.fn(),
    topup: vi.fn(),
    ...overrides,
  } as any;
}

describe('letpay_pay tool', () => {
  it('returns card details on approval', async () => {
    const client = mockClient();
    const result = await payTool.handler(client, {
      wallet_id: 'w1',
      amount_cents: 500,
      merchant: 'Coffee Shop',
    });
    expect(result.content[0].text).toContain('Payment approved');
    expect(result.content[0].text).toContain('4000123456789012');
    expect(result.content[0].text).toContain('123');
  });

  it('handles pending approval', async () => {
    const client = mockClient({
      pay: vi.fn().mockResolvedValue({
        approved: false,
        pending_approval: true,
        approval_id: 'apr1',
      }),
    } as any);
    const result = await payTool.handler(client, {
      wallet_id: 'w1',
      amount_cents: 3000,
      merchant: 'Expensive Shop',
    });
    expect(result.content[0].text).toContain('requires human approval');
    expect(result.content[0].text).toContain('apr1');
  });

  it('handles decline', async () => {
    const client = mockClient({
      pay: vi.fn().mockResolvedValue({
        approved: false,
        reason: 'insufficient_funds',
      }),
    } as any);
    const result = await payTool.handler(client, {
      wallet_id: 'w1',
      amount_cents: 500,
      merchant: 'Shop',
    });
    expect(result.content[0].text).toContain('declined');
    expect(result.content[0].text).toContain('insufficient_funds');
  });
});
