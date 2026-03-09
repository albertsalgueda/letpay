// Shared domain types for LetPay

export interface WalletInfo {
  id: string;
  userId: string;
  name: string;
  status: 'active' | 'frozen' | 'cancelled';
  balanceCents: number;
  wallesterCardId: string | null;
}

export interface SpendingRulesConfig {
  monthlyLimitCents: number;
  perTransactionLimitCents: number;
  approvalThresholdCents: number;
  blockedMccs: string[];
  allowedMccs: string[] | null;
  autoApprove: boolean;
}

export interface TransactionInfo {
  id: string;
  walletId: string;
  amountCents: number;
  currency: string;
  merchantName: string | null;
  merchantMcc: string | null;
  status: 'pending' | 'approved' | 'declined' | 'refunded';
  agentReason: string | null;
  createdAt: Date;
}

export interface ApprovalRequestInfo {
  id: string;
  walletId: string;
  userId: string;
  amountCents: number;
  merchantName: string | null;
  agentReason: string | null;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export interface TopupInfo {
  id: string;
  userId: string;
  walletId: string;
  amountCents: number;
  status: 'pending' | 'succeeded' | 'failed';
  checkoutUrl?: string;
}

export interface ApiKeyInfo {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date | null;
  rawKey?: string; // Only present at creation time
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
