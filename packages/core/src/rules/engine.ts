import type { RuleContext, Decision } from './types';

export function evaluateTransaction(ctx: RuleContext): Decision {
  // 1. Check sufficient balance
  if (ctx.amountCents > ctx.balanceCents) {
    return {
      type: 'declined',
      reason: 'insufficient_funds',
      message: `Insufficient funds: need ${ctx.amountCents} cents, have ${ctx.balanceCents} cents`,
    };
  }

  // 2. Check per-transaction limit
  if (ctx.amountCents > ctx.rules.perTransactionLimitCents) {
    return {
      type: 'declined',
      reason: 'per_transaction_limit_exceeded',
      message: `Amount ${ctx.amountCents} exceeds per-transaction limit of ${ctx.rules.perTransactionLimitCents} cents`,
    };
  }

  // 3. Check monthly limit
  if (ctx.monthlySpentCents + ctx.amountCents > ctx.rules.monthlyLimitCents) {
    return {
      type: 'declined',
      reason: 'monthly_limit_exceeded',
      message: `Would exceed monthly limit: spent ${ctx.monthlySpentCents} + ${ctx.amountCents} > ${ctx.rules.monthlyLimitCents} cents`,
    };
  }

  // 4. Check MCC blocklist
  if (ctx.merchantMcc && ctx.rules.blockedMccs.length > 0) {
    if (ctx.rules.blockedMccs.includes(ctx.merchantMcc)) {
      return {
        type: 'declined',
        reason: 'mcc_blocked',
        message: `Merchant category ${ctx.merchantMcc} is blocked`,
      };
    }
  }

  // 5. Check MCC allowlist (if set, only these MCCs are allowed)
  if (ctx.merchantMcc && ctx.rules.allowedMccs && ctx.rules.allowedMccs.length > 0) {
    if (!ctx.rules.allowedMccs.includes(ctx.merchantMcc)) {
      return {
        type: 'declined',
        reason: 'mcc_not_allowed',
        message: `Merchant category ${ctx.merchantMcc} is not in the allowed list`,
      };
    }
  }

  // 6. Check approval threshold
  if (!ctx.rules.autoApprove || ctx.amountCents > ctx.rules.approvalThresholdCents) {
    return {
      type: 'needs_approval',
      reason: ctx.rules.autoApprove
        ? `Amount ${ctx.amountCents} exceeds approval threshold of ${ctx.rules.approvalThresholdCents} cents`
        : 'Auto-approve is disabled',
    };
  }

  return { type: 'approved' };
}
