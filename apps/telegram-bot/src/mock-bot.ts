import type { NotificationService, TransactionInfo, ApprovalRequestInfo, WalletInfo } from '@letpay/core';

export class MockTelegramNotificationService implements NotificationService {
  public sentMessages: Array<{ type: string; userId: string; data: any }> = [];

  async sendTransactionNotification(userId: string, tx: TransactionInfo): Promise<void> {
    const msg = { type: 'transaction', userId, data: tx };
    this.sentMessages.push(msg);
    console.log(`[MockTelegram] Transaction notification for ${userId}: €${(tx.amountCents / 100).toFixed(2)} at ${tx.merchantName}`);
  }

  async sendApprovalRequest(userId: string, approval: ApprovalRequestInfo): Promise<void> {
    const msg = { type: 'approval', userId, data: approval };
    this.sentMessages.push(msg);
    console.log(`[MockTelegram] Approval request for ${userId}: €${(approval.amountCents / 100).toFixed(2)} at ${approval.merchantName}`);
  }

  async sendLowBalanceAlert(userId: string, wallet: WalletInfo): Promise<void> {
    const msg = { type: 'low_balance', userId, data: wallet };
    this.sentMessages.push(msg);
    console.log(`[MockTelegram] Low balance alert for ${userId}: wallet "${wallet.name}" has €${(wallet.balanceCents / 100).toFixed(2)}`);
  }

  reset() {
    this.sentMessages = [];
  }
}
