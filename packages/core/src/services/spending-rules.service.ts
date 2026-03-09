import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { spendingRules } from '@letpay/db';
import { NotFoundError } from '../errors';
import type { SpendingRulesConfig } from '../types';

export class SpendingRulesService {
  constructor(private db: Database) {}

  async getByWalletId(walletId: string): Promise<SpendingRulesConfig> {
    const [rules] = await this.db.select().from(spendingRules).where(eq(spendingRules.walletId, walletId));
    if (!rules) throw new NotFoundError('SpendingRules', walletId);
    return {
      monthlyLimitCents: rules.monthlyLimitCents,
      perTransactionLimitCents: rules.perTransactionLimitCents,
      approvalThresholdCents: rules.approvalThresholdCents,
      blockedMccs: rules.blockedMccs,
      allowedMccs: rules.allowedMccs,
      autoApprove: rules.autoApprove,
    };
  }

  async update(walletId: string, updates: Partial<SpendingRulesConfig>): Promise<SpendingRulesConfig> {
    const [existing] = await this.db.select().from(spendingRules).where(eq(spendingRules.walletId, walletId));
    if (!existing) throw new NotFoundError('SpendingRules', walletId);

    const [updated] = await this.db.update(spendingRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(spendingRules.walletId, walletId))
      .returning();

    return {
      monthlyLimitCents: updated.monthlyLimitCents,
      perTransactionLimitCents: updated.perTransactionLimitCents,
      approvalThresholdCents: updated.approvalThresholdCents,
      blockedMccs: updated.blockedMccs,
      allowedMccs: updated.allowedMccs,
      autoApprove: updated.autoApprove,
    };
  }
}
