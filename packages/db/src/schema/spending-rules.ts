import { pgTable, uuid, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';

export const spendingRules = pgTable('spending_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id).unique(),
  monthlyLimitCents: integer('monthly_limit_cents').default(5000).notNull(),
  perTransactionLimitCents: integer('per_transaction_limit_cents').default(2500).notNull(),
  approvalThresholdCents: integer('approval_threshold_cents').default(1000).notNull(),
  blockedMccs: text('blocked_mccs').array().default([
    '7995', '5933', '5967',
  ]).notNull(),
  allowedMccs: text('allowed_mccs').array(),
  autoApprove: boolean('auto_approve').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SpendingRule = typeof spendingRules.$inferSelect;
export type NewSpendingRule = typeof spendingRules.$inferInsert;
