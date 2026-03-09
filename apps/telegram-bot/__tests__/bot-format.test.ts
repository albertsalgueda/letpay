import { describe, it, expect } from 'vitest';
import { formatTransactionMessage, formatApprovalMessage, formatLowBalanceMessage } from '../src/bot';

describe('Message formatters', () => {
  it('formats transaction message', () => {
    const msg = formatTransactionMessage(
      { amountCents: 1499, merchantName: 'OpenAI', agentReason: 'GPT-4 API credits', status: 'approved' },
      8501,
      10000,
    );
    expect(msg).toContain('14.99');
    expect(msg).toContain('OpenAI');
    expect(msg).toContain('GPT-4 API credits');
    expect(msg).toContain('85.01');
  });

  it('formats approval message with keyboard', () => {
    const { text, keyboard } = formatApprovalMessage({
      id: 'apr-1',
      amountCents: 4999,
      merchantName: 'Amazon',
      agentReason: 'USB-C cables',
      expiresAt: new Date('2026-03-09T01:10:00Z'),
    });
    expect(text).toContain('49.99');
    expect(text).toContain('Amazon');
    expect(text).toContain('USB-C cables');
    expect(keyboard).toBeDefined();
  });

  it('formats low balance message', () => {
    const msg = formatLowBalanceMessage({ name: 'Work Agent', balanceCents: 321 });
    expect(msg).toContain('Work Agent');
    expect(msg).toContain('3.21');
  });
});
