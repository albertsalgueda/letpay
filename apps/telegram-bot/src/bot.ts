import { Bot, InlineKeyboard } from 'grammy';
import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { users, wallets } from '@letpay/db';
import type { WalletService, ApprovalService, TransactionService } from '@letpay/core';
import { consumeLinkCode } from './link.js';

export function createBot(
  token: string,
  db: Database,
  walletService: WalletService,
  approvalService: ApprovalService,
  transactionService: TransactionService,
) {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply(
      '💳 *Welcome to LetPay Bot!*\n\n' +
      'I help you manage your AI agent wallets.\n\n' +
      'Commands:\n' +
      '/link <code> — Connect your Telegram to LetPay\n' +
      '/balance — Check wallet balances\n' +
      '/history — Recent transactions\n' +
      '/freeze — Freeze all wallets\n' +
      '/unfreeze — Unfreeze all wallets\n',
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('link', async (ctx) => {
    const code = ctx.message?.text?.split(' ')[1]?.trim();
    if (!code || code.length !== 6) {
      await ctx.reply('Usage: /link <6-digit-code>\n\nGet your code from the LetPay dashboard.');
      return;
    }

    const userId = consumeLinkCode(code);
    if (!userId) {
      await ctx.reply('Invalid or expired code. Please generate a new one from the dashboard.');
      return;
    }

    const chatId = String(ctx.chat.id);
    await db.update(users)
      .set({ telegramChatId: chatId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await ctx.reply('✅ Account linked successfully! You will now receive notifications here.');
  });

  bot.command('balance', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.reply('Account not linked. Use /link <code> first.');
      return;
    }

    const userWallets = await walletService.listByUser(user.id);
    if (userWallets.length === 0) {
      await ctx.reply('No wallets found. Create one at letpay.ai/dashboard');
      return;
    }

    const lines = userWallets.map((w) => {
      const status = w.status === 'active' ? '🟢' : w.status === 'frozen' ? '🔵' : '🔴';
      return `${status} *${w.name}*: €${(w.balanceCents / 100).toFixed(2)}`;
    });

    await ctx.reply(`💳 *Your Wallets*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
  });

  bot.command('history', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.reply('Account not linked. Use /link <code> first.');
      return;
    }

    const userWallets = await walletService.listByUser(user.id);
    const allTx: any[] = [];
    for (const w of userWallets) {
      const txs = await transactionService.listByWallet(w.id, { limit: 5, offset: 0 });
      allTx.push(...txs.data.map((t) => ({ ...t, walletName: w.name })));
    }
    allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (allTx.length === 0) {
      await ctx.reply('No recent transactions.');
      return;
    }

    const lines = allTx.slice(0, 10).map((tx) => {
      const icon = tx.status === 'approved' ? '✅' : tx.status === 'declined' ? '❌' : '⏳';
      return `${icon} €${(tx.amountCents / 100).toFixed(2)} at ${tx.merchantName || 'Unknown'} (${tx.walletName})`;
    });

    await ctx.reply(`📋 *Recent Transactions*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
  });

  bot.command('freeze', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.reply('Account not linked. Use /link <code> first.');
      return;
    }

    const userWallets = await walletService.listByUser(user.id);
    let frozen = 0;
    for (const w of userWallets) {
      if (w.status === 'active') {
        await walletService.freeze(w.id);
        frozen++;
      }
    }

    await ctx.reply(`🛑 Frozen ${frozen} wallet(s). All spending is now blocked.`);
  });

  bot.command('unfreeze', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.reply('Account not linked. Use /link <code> first.');
      return;
    }

    const userWallets = await walletService.listByUser(user.id);
    let unfrozen = 0;
    for (const w of userWallets) {
      if (w.status === 'frozen') {
        await walletService.unfreeze(w.id);
        unfrozen++;
      }
    }

    await ctx.reply(`✅ Unfrozen ${unfrozen} wallet(s). Spending is re-enabled.`);
  });

  // Handle approval callback queries
  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    const approvalId = ctx.match[1];
    const chatId = String(ctx.chat?.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Account not linked' });
      return;
    }

    try {
      await approvalService.approve(approvalId, user.id);
      await ctx.editMessageText(`✅ Payment approved!`);
      await ctx.answerCallbackQuery({ text: 'Approved!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      await ctx.answerCallbackQuery({ text: msg });
    }
  });

  bot.callbackQuery(/^deny:(.+)$/, async (ctx) => {
    const approvalId = ctx.match[1];
    const chatId = String(ctx.chat?.id);
    const user = await getUserByChatId(db, chatId);
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Account not linked' });
      return;
    }

    try {
      await approvalService.deny(approvalId, user.id);
      await ctx.editMessageText(`❌ Payment denied.`);
      await ctx.answerCallbackQuery({ text: 'Denied' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      await ctx.answerCallbackQuery({ text: msg });
    }
  });

  return bot;
}

async function getUserByChatId(db: Database, chatId: string) {
  const [user] = await db.select().from(users).where(eq(users.telegramChatId, chatId));
  return user ?? null;
}

export function formatTransactionMessage(tx: { amountCents: number; merchantName: string | null; agentReason: string | null; status: string }, balanceCents: number, monthlyLimitCents: number): string {
  const amount = (tx.amountCents / 100).toFixed(2);
  const balance = (balanceCents / 100).toFixed(2);
  const limit = (monthlyLimitCents / 100).toFixed(2);
  return (
    `💳 *LetPay Transaction*\n\n` +
    `✅ €${amount} at ${tx.merchantName || 'Unknown'}\n` +
    (tx.agentReason ? `Agent reason: "${tx.agentReason}"\n` : '') +
    `\nBalance: €${balance} / €${limit} monthly limit`
  );
}

export function formatApprovalMessage(approval: { id: string; amountCents: number; merchantName: string | null; agentReason: string | null; expiresAt: Date }): { text: string; keyboard: InlineKeyboard } {
  const amount = (approval.amountCents / 100).toFixed(2);
  const text =
    `🔔 *LetPay — Approval Needed*\n\n` +
    `Your agent wants to spend €${amount} at ${approval.merchantName || 'Unknown'}\n` +
    (approval.agentReason ? `Reason: "${approval.agentReason}"\n` : '') +
    `\n⏰ Auto-denies at ${approval.expiresAt.toISOString().slice(11, 16)} UTC`;

  const keyboard = new InlineKeyboard()
    .text('✅ Approve', `approve:${approval.id}`)
    .text('❌ Deny', `deny:${approval.id}`);

  return { text, keyboard };
}

export function formatLowBalanceMessage(wallet: { name: string; balanceCents: number }): string {
  const balance = (wallet.balanceCents / 100).toFixed(2);
  return (
    `⚠️ *LetPay — Low Balance*\n\n` +
    `Your agent wallet "${wallet.name}" has €${balance} remaining.\n` +
    `Top up at letpay.ai/dashboard`
  );
}
