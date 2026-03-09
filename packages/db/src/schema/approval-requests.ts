import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { wallets } from './wallets';

export const approvalRequestStatusEnum = pgEnum('approval_request_status', [
  'pending', 'approved', 'denied', 'expired',
]);

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  wallesterAuthorizationId: text('wallester_authorization_id'),
  amountCents: integer('amount_cents').notNull(),
  merchantName: text('merchant_name'),
  agentReason: text('agent_reason'),
  status: approvalRequestStatusEnum('status').default('pending').notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_approval_requests_pending').on(table.status),
]);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
