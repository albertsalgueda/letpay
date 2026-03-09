import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending', 'approved', 'declined', 'refunded',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'auto', 'human_approved', 'human_denied',
]);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  wallesterTransactionId: text('wallester_transaction_id').unique(),
  wallesterAuthorizationId: text('wallester_authorization_id').unique(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('eur').notNull(),
  merchantName: text('merchant_name'),
  merchantCategory: text('merchant_category'),
  merchantMcc: text('merchant_mcc'),
  status: transactionStatusEnum('status').default('pending').notNull(),
  declineReason: text('decline_reason'),
  agentReason: text('agent_reason'),
  approvalStatus: approvalStatusEnum('approval_status'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_transactions_wallet').on(table.walletId),
  index('idx_transactions_created').on(table.createdAt),
]);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
