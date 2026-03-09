import { relations } from 'drizzle-orm';
import { users } from './schema/users';
import { wallets } from './schema/wallets';
import { spendingRules } from './schema/spending-rules';
import { transactions } from './schema/transactions';
import { topups } from './schema/topups';
import { approvalRequests } from './schema/approval-requests';
import { apiKeys } from './schema/api-keys';

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  topups: many(topups),
  approvalRequests: many(approvalRequests),
  apiKeys: many(apiKeys),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  spendingRules: one(spendingRules),
  transactions: many(transactions),
  topups: many(topups),
  approvalRequests: many(approvalRequests),
}));

export const spendingRulesRelations = relations(spendingRules, ({ one }) => ({
  wallet: one(wallets, { fields: [spendingRules.walletId], references: [wallets.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, { fields: [transactions.walletId], references: [wallets.id] }),
}));

export const topupsRelations = relations(topups, ({ one }) => ({
  user: one(users, { fields: [topups.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [topups.walletId], references: [wallets.id] }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  user: one(users, { fields: [approvalRequests.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [approvalRequests.walletId], references: [wallets.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));
