import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { wallets } from '@letpay/db';
import type { CardIssuingService, AuthorizationEvent } from '../cards/interface';
import { evaluateTransaction } from '../rules/engine';
import type { WalletService } from './wallet.service';
import type { SpendingRulesService } from './spending-rules.service';
import type { TransactionService } from './transaction.service';
import type { ApprovalService } from './approval.service';
import type { NotificationService } from './notification.service';

export interface AuthorizationResult {
  approved: boolean;
  transactionId: string;
  approvalRequestId?: string;
  declineReason?: string;
}

export class AuthorizationService {
  constructor(
    private db: Database,
    private cardService: CardIssuingService,
    private walletService: WalletService,
    private rulesService: SpendingRulesService,
    private transactionService: TransactionService,
    private approvalService: ApprovalService,
    private notificationService: NotificationService,
  ) {}

  async handleAuthorization(event: AuthorizationEvent): Promise<AuthorizationResult> {
    // Find wallet by card ID
    const [wallet] = await this.db.select().from(wallets)
      .where(eq(wallets.wallesterCardId, event.cardId));

    if (!wallet) {
      await this.cardService.declineAuthorization(event.authorizationId, 'unknown_card');
      const tx = await this.transactionService.record({
        walletId: 'unknown',
        wallesterAuthorizationId: event.authorizationId,
        amountCents: event.amountCents,
        currency: event.currency,
        merchantName: event.merchantName,
        merchantMcc: event.merchantMcc,
        status: 'declined',
        declineReason: 'unknown_card',
      });
      return { approved: false, transactionId: tx.id, declineReason: 'unknown_card' };
    }

    // Check wallet status
    if (wallet.status !== 'active') {
      await this.cardService.declineAuthorization(event.authorizationId, `wallet_${wallet.status}`);
      const tx = await this.transactionService.record({
        walletId: wallet.id,
        wallesterAuthorizationId: event.authorizationId,
        amountCents: event.amountCents,
        currency: event.currency,
        merchantName: event.merchantName,
        merchantMcc: event.merchantMcc,
        status: 'declined',
        declineReason: `wallet_${wallet.status}`,
        approvalStatus: 'auto',
      });
      return { approved: false, transactionId: tx.id, declineReason: `wallet_${wallet.status}` };
    }

    // Get spending rules and monthly spent
    const rules = await this.rulesService.getByWalletId(wallet.id);
    const monthlySpent = await this.transactionService.getMonthlySpent(wallet.id);

    // Evaluate rules
    const decision = evaluateTransaction({
      amountCents: event.amountCents,
      merchantMcc: event.merchantMcc,
      merchantName: event.merchantName,
      balanceCents: wallet.balanceCents,
      monthlySpentCents: monthlySpent,
      rules,
    });

    if (decision.type === 'approved') {
      await this.cardService.approveAuthorization(event.authorizationId);

      // Deduct balance
      await this.db.update(wallets)
        .set({
          balanceCents: wallet.balanceCents - event.amountCents,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const tx = await this.transactionService.record({
        walletId: wallet.id,
        wallesterAuthorizationId: event.authorizationId,
        amountCents: event.amountCents,
        currency: event.currency,
        merchantName: event.merchantName,
        merchantMcc: event.merchantMcc,
        status: 'approved',
        approvalStatus: 'auto',
      });

      await this.notificationService.sendTransactionNotification(wallet.userId, tx);

      // Check low balance alert
      const newBalance = wallet.balanceCents - event.amountCents;
      if (newBalance < 1000) {
        const walletInfo = await this.walletService.get(wallet.id);
        await this.notificationService.sendLowBalanceAlert(wallet.userId, walletInfo);
      }

      return { approved: true, transactionId: tx.id };
    }

    if (decision.type === 'needs_approval') {
      // Decline the real-time authorization (we can't hold it)
      await this.cardService.declineAuthorization(event.authorizationId, 'pending_approval');

      const tx = await this.transactionService.record({
        walletId: wallet.id,
        wallesterAuthorizationId: event.authorizationId,
        amountCents: event.amountCents,
        currency: event.currency,
        merchantName: event.merchantName,
        merchantMcc: event.merchantMcc,
        status: 'pending',
        agentReason: decision.reason,
      });

      const approval = await this.approvalService.create({
        walletId: wallet.id,
        userId: wallet.userId,
        wallesterAuthorizationId: event.authorizationId,
        amountCents: event.amountCents,
        merchantName: event.merchantName,
        agentReason: decision.reason,
      });

      await this.notificationService.sendApprovalRequest(wallet.userId, approval);

      return {
        approved: false,
        transactionId: tx.id,
        approvalRequestId: approval.id,
        declineReason: 'pending_approval',
      };
    }

    // Declined
    await this.cardService.declineAuthorization(event.authorizationId, decision.reason);

    const tx = await this.transactionService.record({
      walletId: wallet.id,
      wallesterAuthorizationId: event.authorizationId,
      amountCents: event.amountCents,
      currency: event.currency,
      merchantName: event.merchantName,
      merchantMcc: event.merchantMcc,
      status: 'declined',
      declineReason: decision.reason,
      approvalStatus: 'auto',
    });

    return { approved: false, transactionId: tx.id, declineReason: decision.reason };
  }
}
