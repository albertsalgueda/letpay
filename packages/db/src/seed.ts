import { createDb } from './client';
import { users, wallets, spendingRules } from './schema/index';

async function seed() {
  const db = createDb();

  console.log('Seeding database...');

  const [user] = await db.insert(users).values({
    email: 'demo@letpay.ai',
    name: 'Demo User',
  }).returning();

  console.log('Created user:', user.id);

  const [wallet] = await db.insert(wallets).values({
    userId: user.id,
    name: 'My Agent Wallet',
    balanceCents: 10000, // €100.00
  }).returning();

  console.log('Created wallet:', wallet.id);

  const [rules] = await db.insert(spendingRules).values({
    walletId: wallet.id,
    monthlyLimitCents: 10000,  // €100
    perTransactionLimitCents: 2500,  // €25
    approvalThresholdCents: 1000,  // €10
  }).returning();

  console.log('Created spending rules:', rules.id);
  console.log('Seed complete!');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
