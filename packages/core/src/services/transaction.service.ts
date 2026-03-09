import { eq, desc, and, gte } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { transactions } from '@letpay/db';
import { NotFoundError } from '../errors';
import type { TransactionInfo, PaginationParams, PaginatedResult } from '../types';

export class TransactionService {
  constructor(private db: Database) {}

  async getById(transactionId: string): Promise<TransactionInfo> {
    const [tx] = await this.db.select().from(transactions).where(eq(transactions.id, transactionId));
    if (!tx) throw new NotFoundError('Transaction', transactionId);
    return this.toInfo(tx);
  }

  async listByWallet(walletId: string, pagination: PaginationParams): Promise<PaginatedResult<TransactionInfo>> {
    const results = await this.db.select().from(transactions)
      .where(eq(transactions.walletId, walletId))
      .orderBy(desc(transactions.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const [countResult] = await this.db.select().from(transactions)
      .where(eq(transactions.walletId, walletId));

    return {
      data: results.map(this.toInfo),
      total: countResult ? results.length : 0, // simplified count
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async getMonthlySpent(walletId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const results = await this.db.select().from(transactions)
      .where(and(
        eq(transactions.walletId, walletId),
        eq(transactions.status, 'approved'),
        gte(transactions.createdAt, startOfMonth),
      ));

    return results.reduce((sum, tx) => sum + tx.amountCents, 0);
  }

  async record(data: {
    walletId: string;
    wallesterAuthorizationId?: string;
    amountCents: number;
    currency: string;
    merchantName?: string;
    merchantMcc?: string;
    status: 'pending' | 'approved' | 'declined';
    declineReason?: string;
    agentReason?: string;
    approvalStatus?: 'auto' | 'human_approved' | 'human_denied';
  }): Promise<TransactionInfo> {
    const [tx] = await this.db.insert(transactions).values({
      walletId: data.walletId,
      wallesterAuthorizationId: data.wallesterAuthorizationId,
      amountCents: data.amountCents,
      currency: data.currency,
      merchantName: data.merchantName,
      merchantMcc: data.merchantMcc,
      status: data.status,
      declineReason: data.declineReason,
      agentReason: data.agentReason,
      approvalStatus: data.approvalStatus,
      approvedAt: data.status === 'approved' ? new Date() : undefined,
    }).returning();

    return this.toInfo(tx);
  }

  private toInfo(tx: typeof transactions.$inferSelect): TransactionInfo {
    return {
      id: tx.id,
      walletId: tx.walletId,
      amountCents: tx.amountCents,
      currency: tx.currency,
      merchantName: tx.merchantName,
      merchantMcc: tx.merchantMcc,
      status: tx.status,
      agentReason: tx.agentReason,
      createdAt: tx.createdAt,
    };
  }
}
