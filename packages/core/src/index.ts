// Types
export * from './types';
export * from './errors';

// Rules engine
export { evaluateTransaction } from './rules/engine';
export type { RuleContext, Decision, DeclineReason } from './rules/types';

// Service interfaces
export type { PaymentService, CheckoutSession, CheckoutSessionParams, PaymentWebhookEvent } from './payments/interface';
export type {
  CardIssuingService, CardDetails, CardInfo, CardWebhookEvent,
  AuthorizationEvent, TransactionEvent, CreateCardParams, SpendingLimit,
} from './cards/interface';

// Mock implementations
export { MockPaymentService } from './payments/mock';
export { MockCardIssuingService } from './cards/mock';

// Live implementations
export { StripePaymentService } from './payments/stripe';
export { WallesterCardIssuingService, WallesterApiError, WallesterWebhookError } from './cards/wallester';
export type { WallesterConfig } from './cards/wallester';

// Services
export { WalletService } from './services/wallet.service';
export { FundingService } from './services/funding.service';
export { SpendingRulesService } from './services/spending-rules.service';
export { TransactionService } from './services/transaction.service';
export { ApprovalService } from './services/approval.service';
export { AuthorizationService } from './services/authorization.service';
export type { AuthorizationResult } from './services/authorization.service';
export { ApiKeyService } from './services/api-key.service';
export { UserService } from './services/user.service';
export type { UserInfo } from './services/user.service';
export { NoopNotificationService } from './services/notification.service';
export type { NotificationService } from './services/notification.service';

// Auth helpers
export { generateApiKey, hashApiKey, isApiKey } from './auth/api-key';
