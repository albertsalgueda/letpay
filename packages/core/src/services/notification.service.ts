import type { TransactionInfo, ApprovalRequestInfo, WalletInfo } from '../types';

export interface NotificationService {
  sendTransactionNotification(userId: string, tx: TransactionInfo): Promise<void>;
  sendApprovalRequest(userId: string, approval: ApprovalRequestInfo): Promise<void>;
  sendLowBalanceAlert(userId: string, wallet: WalletInfo): Promise<void>;
}

export class NoopNotificationService implements NotificationService {
  async sendTransactionNotification(): Promise<void> {}
  async sendApprovalRequest(): Promise<void> {}
  async sendLowBalanceAlert(): Promise<void> {}
}
