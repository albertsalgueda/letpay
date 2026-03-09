import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { wallets } from './wallets';

export const topupStatusEnum = pgEnum('topup_status', ['pending', 'succeeded', 'failed']);

export const topups = pgTable('topups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
  amountCents: integer('amount_cents').notNull(),
  status: topupStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_topups_user').on(table.userId),
]);

export type Topup = typeof topups.$inferSelect;
export type NewTopup = typeof topups.$inferInsert;
