import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const walletStatusEnum = pgEnum('wallet_status', ['active', 'frozen', 'cancelled', 'pending_funding']);

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull().default('My Agent'),
  wallesterCardId: text('wallester_card_id').unique(),
  status: walletStatusEnum('status').default('active').notNull(),
  balanceCents: integer('balance_cents').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
