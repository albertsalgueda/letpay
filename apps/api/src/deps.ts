import { createDb, type Database } from '@letpay/db';
import {
  MockPaymentService,
  MockCardIssuingService,
  StripePaymentService,
  WalletService,
  FundingService,
  SpendingRulesService,
  TransactionService,
  ApprovalService,
  AuthorizationService,
  ApiKeyService,
  UserService,
  NoopNotificationService,
  type PaymentService,
  type CardIssuingService,
  type NotificationService,
} from '@letpay/core';

export interface Dependencies {
  db: Database;
  paymentService: PaymentService;
  cardService: CardIssuingService;
  notificationService: NotificationService;
  walletService: WalletService;
  fundingService: FundingService;
  rulesService: SpendingRulesService;
  transactionService: TransactionService;
  approvalService: ApprovalService;
  authorizationService: AuthorizationService;
  apiKeyService: ApiKeyService;
  userService: UserService;
}

export interface DepsConfig {
  databaseUrl?: string;
  useMocks?: boolean;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
}

export function createDependencies(config: DepsConfig = {}): Dependencies {
  const db = config.databaseUrl ? createDb(config.databaseUrl) : createDb();

  const paymentService: PaymentService = config.useMocks !== false
    ? new MockPaymentService()
    : new StripePaymentService(config.stripeSecretKey!, config.stripeWebhookSecret!);

  const cardService: CardIssuingService = config.useMocks !== false
    ? new MockCardIssuingService()
    : new MockCardIssuingService(); // Card issuing uses mock until Stripe Issuing is set up

  const notificationService: NotificationService = new NoopNotificationService();

  const walletService = new WalletService(db, cardService);
  const fundingService = new FundingService(db, paymentService);
  const rulesService = new SpendingRulesService(db);
  const transactionService = new TransactionService(db);
  const approvalService = new ApprovalService(db);
  const apiKeyService = new ApiKeyService(db);
  const userService = new UserService(db);

  const authorizationService = new AuthorizationService(
    db,
    cardService,
    walletService,
    rulesService,
    transactionService,
    approvalService,
    notificationService,
  );

  return {
    db,
    paymentService,
    cardService,
    notificationService,
    walletService,
    fundingService,
    rulesService,
    transactionService,
    approvalService,
    authorizationService,
    apiKeyService,
    userService,
  };
}
