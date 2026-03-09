import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const kycStatusEnum = pgEnum('kyc_status', ['pending', 'verified', 'failed']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  kycStatus: kycStatusEnum('kyc_status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
