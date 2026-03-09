export interface RuleContext {
  amountCents: number;
  merchantMcc: string | null;
  merchantName: string | null;
  balanceCents: number;
  monthlySpentCents: number;
  rules: {
    monthlyLimitCents: number;
    perTransactionLimitCents: number;
    approvalThresholdCents: number;
    blockedMccs: string[];
    allowedMccs: string[] | null;
    autoApprove: boolean;
  };
}

export type DeclineReason =
  | 'insufficient_funds'
  | 'monthly_limit_exceeded'
  | 'per_transaction_limit_exceeded'
  | 'mcc_blocked'
  | 'mcc_not_allowed';

export type Decision =
  | { type: 'approved' }
  | { type: 'declined'; reason: DeclineReason; message: string }
  | { type: 'needs_approval'; reason: string };
