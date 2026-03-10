import { createDb, type Database } from '@letpay/db';
import {
  MockPaymentService,
  MockCardIssuingService,
  StripePaymentService,
  WallesterCardIssuingService,
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
  type WallesterConfig,
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
  wallester?: WallesterConfig;
  notificationService?: NotificationService;
}

export function createDependencies(config: DepsConfig = {}): Dependencies {
  const db = config.databaseUrl ? createDb(config.databaseUrl) : createDb();

  const useRealStripe = config.useMocks === false && config.stripeSecretKey && !config.stripeSecretKey.includes('mock');
  const paymentService: PaymentService = useRealStripe
    ? new StripePaymentService(config.stripeSecretKey!, config.stripeWebhookSecret!)
    : new MockPaymentService();

  const useRealWallester = config.useMocks === false && config.wallester && config.wallester.clientId !== 'mock';
  const cardService: CardIssuingService = useRealWallester
    ? new WallesterCardIssuingService(config.wallester!)
    : new MockCardIssuingService();

  const notificationService: NotificationService = config.notificationService ?? new NoopNotificationService();

  const walletService = new WalletService(db, cardService);
  const fundingService = new FundingService(db, paymentService);
  fundingService.setWalletService(walletService);
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
