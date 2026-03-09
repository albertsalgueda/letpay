import { createDb } from '@letpay/db';
import {
  MockCardIssuingService,
  WalletService,
  SpendingRulesService,
  TransactionService,
  ApprovalService,
} from '@letpay/core';
import { getEnv } from './env.js';
import { createBot } from './bot.js';

const env = getEnv();

if (env.USE_MOCKS) {
  console.log('[telegram-bot] Running in mock mode. Bot will not connect to Telegram.');
  console.log('[telegram-bot] Set USE_MOCKS=false and provide TELEGRAM_BOT_TOKEN to run for real.');
} else {
  const db = createDb(env.DATABASE_URL);
  const cardService = new MockCardIssuingService();
  const walletService = new WalletService(db, cardService);
  const rulesService = new SpendingRulesService(db);
  const transactionService = new TransactionService(db);
  const approvalService = new ApprovalService(db);

  const bot = createBot(env.TELEGRAM_BOT_TOKEN, db, walletService, approvalService, transactionService);

  bot.start({
    onStart: () => console.log('[telegram-bot] Bot started and listening for messages'),
  });

  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());
}
