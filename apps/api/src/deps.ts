import { createDb, type Database } from '@letpay/db';
import {
  MockPaymentService,
  MockCardIssuingService,
  LiveStripeService,
  LiveWallesterService,
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
  wallesterApiUrl?: string;
  wallesterIssuerId?: string;
  wallesterAudienceId?: string;
  wallesterPrivateKey?: string;
  wallesterPublicKey?: string;
}

export function createDependencies(config: DepsConfig = {}): Dependencies {
  const db = config.databaseUrl ? createDb(config.databaseUrl) : createDb();

  let paymentService: PaymentService;
  let cardService: CardIssuingService;

  if (config.useMocks !== false) {
    paymentService = new MockPaymentService();
    cardService = new MockCardIssuingService();
  } else {
    paymentService = new LiveStripeService(
      config.stripeSecretKey!,
      config.stripeWebhookSecret!,
    );
    cardService = new LiveWallesterService({
      apiUrl: config.wallesterApiUrl!,
      issuerId: config.wallesterIssuerId!,
      audienceId: config.wallesterAudienceId!,
      privateKey: config.wallesterPrivateKey!,
      wallesterPublicKey: config.wallesterPublicKey ?? '',
      maxExpirationSeconds: 300,
    });
  }

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
