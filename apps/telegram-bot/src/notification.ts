import { Bot } from 'grammy';
import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { users } from '@letpay/db';
import type { NotificationService, TransactionInfo, ApprovalRequestInfo, WalletInfo } from '@letpay/core';
import { formatTransactionMessage, formatApprovalMessage, formatLowBalanceMessage } from './bot.js';

export class TelegramNotificationService implements NotificationService {
  constructor(
    private bot: Bot,
    private db: Database,
  ) {}

  async sendTransactionNotification(userId: string, tx: TransactionInfo): Promise<void> {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    const text = formatTransactionMessage(
      { amountCents: tx.amountCents, merchantName: tx.merchantName, agentReason: tx.agentReason, status: tx.status },
      0, 0,
    );

    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Failed to send Telegram notification:', err);
    }
  }

  async sendApprovalRequest(userId: string, approval: ApprovalRequestInfo): Promise<void> {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    const { text, keyboard } = formatApprovalMessage({
      id: approval.id,
      amountCents: approval.amountCents,
      merchantName: approval.merchantName,
      agentReason: approval.agentReason,
      expiresAt: approval.expiresAt,
    });

    try {
      await this.bot.api.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error('Failed to send Telegram approval request:', err);
    }
  }

  async sendLowBalanceAlert(userId: string, wallet: WalletInfo): Promise<void> {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    const text = formatLowBalanceMessage({ name: wallet.name, balanceCents: wallet.balanceCents });

    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Failed to send Telegram low balance alert:', err);
    }
  }

  private async getChatId(userId: string): Promise<string | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    return user?.telegramChatId ?? null;
  }
}
