import { describe, it, expect } from 'vitest';
import { evaluateTransaction } from '../../src/rules/engine';
import type { RuleContext } from '../../src/rules/types';

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    amountCents: 500,
    merchantMcc: '5411',
    merchantName: 'Test Merchant',
    balanceCents: 10000,
    monthlySpentCents: 0,
    rules: {
      monthlyLimitCents: 10000,
      perTransactionLimitCents: 5000,
      approvalThresholdCents: 2000,
      blockedMccs: ['7995', '5933'],
      allowedMccs: null,
      autoApprove: true,
    },
    ...overrides,
  };
}

describe('evaluateTransaction', () => {
  describe('approval', () => {
    it('approves a valid transaction within all limits', () => {
      const result = evaluateTransaction(makeContext());
      expect(result).toEqual({ type: 'approved' });
    });

    it('requires approval when amount equals balance but exceeds threshold', () => {
      // amount 4000 is within per-tx limit (5000) and balance (10000) but > threshold (2000)
      const result = evaluateTransaction(makeContext({ amountCents: 4000 }));
      expect(result.type).toBe('needs_approval');
    });

    it('approves when amount equals per-tx limit exactly', () => {
      const result = evaluateTransaction(makeContext({ amountCents: 2000 }));
      // 2000 is equal to threshold, not greater — should be approved
      expect(result).toEqual({ type: 'approved' });
    });

    it('approves when monthly limit would be exactly met', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 2000, monthlySpentCents: 8000 }),
      );
      expect(result).toEqual({ type: 'approved' });
    });
  });

  describe('insufficient funds', () => {
    it('declines when amount exceeds balance', () => {
      const result = evaluateTransaction(makeContext({ amountCents: 10001 }));
      expect(result).toEqual({
        type: 'declined',
        reason: 'insufficient_funds',
        message: expect.stringContaining('Insufficient funds'),
      });
    });

    it('declines when balance is zero', () => {
      const result = evaluateTransaction(makeContext({ balanceCents: 0 }));
      expect(result).toEqual({
        type: 'declined',
        reason: 'insufficient_funds',
        message: expect.any(String),
      });
    });
  });

  describe('per-transaction limit', () => {
    it('declines when amount exceeds per-tx limit', () => {
      const result = evaluateTransaction(makeContext({ amountCents: 5001 }));
      expect(result).toEqual({
        type: 'declined',
        reason: 'per_transaction_limit_exceeded',
        message: expect.stringContaining('per-transaction limit'),
      });
    });

    it('allows when amount equals per-tx limit', () => {
      // 5000 > threshold (2000), so will be needs_approval, but not declined for per-tx
      const result = evaluateTransaction(makeContext({ amountCents: 5000 }));
      expect(result.type).not.toBe('declined');
    });
  });

  describe('monthly limit', () => {
    it('declines when monthly spending would be exceeded', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 500, monthlySpentCents: 9600 }),
      );
      expect(result).toEqual({
        type: 'declined',
        reason: 'monthly_limit_exceeded',
        message: expect.stringContaining('monthly limit'),
      });
    });

    it('allows when monthly limit is exactly reached', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 500, monthlySpentCents: 9500 }),
      );
      expect(result.type).not.toBe('declined');
    });
  });

  describe('MCC blocklist', () => {
    it('declines when merchant MCC is blocked', () => {
      const result = evaluateTransaction(makeContext({ merchantMcc: '7995' }));
      expect(result).toEqual({
        type: 'declined',
        reason: 'mcc_blocked',
        message: expect.stringContaining('7995'),
      });
    });

    it('allows when MCC is not in blocklist', () => {
      const result = evaluateTransaction(makeContext({ merchantMcc: '5411' }));
      expect(result.type).not.toBe('declined');
    });

    it('allows when MCC is null (no blocklist check)', () => {
      const result = evaluateTransaction(makeContext({ merchantMcc: null }));
      expect(result).toEqual({ type: 'approved' });
    });

    it('allows when blocklist is empty', () => {
      const ctx = makeContext();
      ctx.rules.blockedMccs = [];
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({ type: 'approved' });
    });
  });

  describe('MCC allowlist', () => {
    it('declines when MCC is not in allowlist', () => {
      const ctx = makeContext();
      ctx.rules.allowedMccs = ['5812', '5813']; // restaurants only
      const result = evaluateTransaction(ctx); // MCC 5411 (grocery)
      expect(result).toEqual({
        type: 'declined',
        reason: 'mcc_not_allowed',
        message: expect.stringContaining('not in the allowed list'),
      });
    });

    it('allows when MCC is in allowlist', () => {
      const ctx = makeContext();
      ctx.rules.allowedMccs = ['5411', '5812'];
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({ type: 'approved' });
    });

    it('ignores allowlist when null', () => {
      const ctx = makeContext();
      ctx.rules.allowedMccs = null;
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({ type: 'approved' });
    });

    it('ignores allowlist when empty', () => {
      const ctx = makeContext();
      ctx.rules.allowedMccs = [];
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({ type: 'approved' });
    });

    it('ignores allowlist when MCC is null', () => {
      const ctx = makeContext({ merchantMcc: null });
      ctx.rules.allowedMccs = ['5411'];
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({ type: 'approved' });
    });
  });

  describe('approval threshold', () => {
    it('requires approval when amount exceeds threshold', () => {
      const result = evaluateTransaction(makeContext({ amountCents: 2001 }));
      expect(result).toEqual({
        type: 'needs_approval',
        reason: expect.stringContaining('approval threshold'),
      });
    });

    it('does not require approval at exactly the threshold', () => {
      const result = evaluateTransaction(makeContext({ amountCents: 2000 }));
      expect(result).toEqual({ type: 'approved' });
    });

    it('requires approval when autoApprove is false', () => {
      const ctx = makeContext();
      ctx.rules.autoApprove = false;
      const result = evaluateTransaction(ctx);
      expect(result).toEqual({
        type: 'needs_approval',
        reason: expect.stringContaining('Auto-approve is disabled'),
      });
    });
  });

  describe('rule priority', () => {
    it('checks balance before per-tx limit', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 6000, balanceCents: 100 }),
      );
      expect(result).toEqual({
        type: 'declined',
        reason: 'insufficient_funds',
        message: expect.any(String),
      });
    });

    it('checks per-tx limit before monthly limit', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 6000, balanceCents: 20000, monthlySpentCents: 9000 }),
      );
      expect(result).toEqual({
        type: 'declined',
        reason: 'per_transaction_limit_exceeded',
        message: expect.any(String),
      });
    });

    it('checks monthly limit before MCC', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 4000, monthlySpentCents: 9000, merchantMcc: '7995' }),
      );
      expect(result).toEqual({
        type: 'declined',
        reason: 'monthly_limit_exceeded',
        message: expect.any(String),
      });
    });

    it('checks MCC blocklist before approval threshold', () => {
      const result = evaluateTransaction(
        makeContext({ amountCents: 100, merchantMcc: '7995' }),
      );
      expect(result).toEqual({
        type: 'declined',
        reason: 'mcc_blocked',
        message: expect.any(String),
      });
    });
  });
});
