import { eq, and } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { approvalRequests } from '@letpay/db';
import { NotFoundError, ApprovalExpiredError, DomainError } from '../errors';
import type { ApprovalRequestInfo } from '../types';

export class ApprovalService {
  constructor(private db: Database) {}

  async create(data: {
    walletId: string;
    userId: string;
    wallesterAuthorizationId?: string;
    amountCents: number;
    merchantName?: string;
    agentReason?: string;
    expiresInMs?: number;
  }): Promise<ApprovalRequestInfo> {
    const expiresAt = new Date(Date.now() + (data.expiresInMs ?? 5 * 60 * 1000)); // 5 min default

    const [request] = await this.db.insert(approvalRequests).values({
      walletId: data.walletId,
      userId: data.userId,
      wallesterAuthorizationId: data.wallesterAuthorizationId,
      amountCents: data.amountCents,
      merchantName: data.merchantName,
      agentReason: data.agentReason,
      expiresAt,
    }).returning();

    return this.toInfo(request);
  }

  async approve(approvalId: string, userId: string): Promise<ApprovalRequestInfo> {
    const request = await this.getAndValidate(approvalId, userId);

    const [updated] = await this.db.update(approvalRequests)
      .set({ status: 'approved', respondedAt: new Date() })
      .where(eq(approvalRequests.id, approvalId))
      .returning();

    return this.toInfo(updated);
  }

  async deny(approvalId: string, userId: string): Promise<ApprovalRequestInfo> {
    const request = await this.getAndValidate(approvalId, userId);

    const [updated] = await this.db.update(approvalRequests)
      .set({ status: 'denied', respondedAt: new Date() })
      .where(eq(approvalRequests.id, approvalId))
      .returning();

    return this.toInfo(updated);
  }

  async listPending(userId: string): Promise<ApprovalRequestInfo[]> {
    const results = await this.db.select().from(approvalRequests)
      .where(and(
        eq(approvalRequests.userId, userId),
        eq(approvalRequests.status, 'pending'),
      ));

    const now = new Date();
    const active: ApprovalRequestInfo[] = [];
    for (const r of results) {
      if (r.expiresAt < now) {
        await this.db.update(approvalRequests)
          .set({ status: 'expired' })
          .where(eq(approvalRequests.id, r.id));
      } else {
        active.push(this.toInfo(r));
      }
    }

    return active;
  }

  async listAll(userId: string): Promise<ApprovalRequestInfo[]> {
    const results = await this.db.select().from(approvalRequests)
      .where(eq(approvalRequests.userId, userId));

    const now = new Date();
    const out: ApprovalRequestInfo[] = [];
    for (const r of results) {
      if (r.status === 'pending' && r.expiresAt < now) {
        await this.db.update(approvalRequests)
          .set({ status: 'expired' })
          .where(eq(approvalRequests.id, r.id));
        out.push(this.toInfo({ ...r, status: 'expired' }));
      } else {
        out.push(this.toInfo(r));
      }
    }

    return out;
  }

  private async getAndValidate(approvalId: string, userId: string) {
    const [request] = await this.db.select().from(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));

    if (!request) throw new NotFoundError('ApprovalRequest', approvalId);
    if (request.userId !== userId) throw new DomainError('Not your approval request', 'FORBIDDEN', 403);
    if (request.status !== 'pending') {
      throw new DomainError(`Approval already ${request.status}`, 'ALREADY_RESOLVED', 409);
    }
    if (request.expiresAt < new Date()) {
      await this.db.update(approvalRequests)
        .set({ status: 'expired' })
        .where(eq(approvalRequests.id, approvalId));
      throw new ApprovalExpiredError(approvalId);
    }

    return request;
  }

  private toInfo(r: typeof approvalRequests.$inferSelect): ApprovalRequestInfo {
    return {
      id: r.id,
      walletId: r.walletId,
      userId: r.userId,
      amountCents: r.amountCents,
      merchantName: r.merchantName,
      agentReason: r.agentReason,
      status: r.status,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    };
  }
}
