import { createApp } from '../../src/app.js';
import type { Dependencies } from '../../src/deps.js';
import {
  MockPaymentService,
  MockCardIssuingService,
  NoopNotificationService,
} from '@letpay/core';

// Create mock services that don't need a real DB
export function createTestDeps(): Dependencies {
  const mockPayment = new MockPaymentService();
  const realMockCards = new MockCardIssuingService();
  // Wrap to stub getCardDetails for pre-existing card IDs
  const mockCards = {
    ...realMockCards,
    getCardDetails: async (cardId: string) => {
      try {
        return await realMockCards.getCardDetails(cardId);
      } catch {
        // Return stub details for test wallet card IDs
        return { cardId, pan: '4000123456789012', expMonth: '12', expYear: '2028', cvv: '123', holderName: 'Test User', status: 'active' as const };
      }
    },
  };
  const mockNotification = new NoopNotificationService();

  // Return a deps object with stub services
  // For full integration tests, you'd use a real test DB
  return {
    db: {} as any,
    paymentService: mockPayment,
    cardService: mockCards,
    notificationService: mockNotification,
    walletService: {
      create: async () => ({ id: 'w1', userId: 'u1', name: 'Test', status: 'pending_funding' as const, balanceCents: 0, wallesterCardId: null }),
      activateWallet: async () => ({ id: 'w1', userId: 'u1', name: 'Test', status: 'active' as const, balanceCents: 10000, wallesterCardId: 'card1' }),
      get: async () => ({ id: 'w1', userId: 'u1', name: 'Test', status: 'active' as const, balanceCents: 10000, wallesterCardId: 'card1' }),
      listByUser: async () => [{ id: 'w1', userId: 'u1', name: 'Test', status: 'active' as const, balanceCents: 10000, wallesterCardId: 'card1' }],
      freeze: async () => {},
      unfreeze: async () => {},
      cancel: async () => {},
      assertActive: async () => ({ id: 'w1', userId: 'u1', name: 'Test', status: 'active' as const, balanceCents: 10000, wallesterCardId: 'card1' }),
    } as any,
    fundingService: {
      createTopup: async () => ({ id: 't1', userId: 'u1', walletId: 'w1', amountCents: 5000, chargeCents: 5175, feeCents: 175, status: 'pending' as const, checkoutUrl: 'https://checkout.mock.stripe.com/test' }),
      handlePaymentCompleted: async () => {},
      handlePaymentFailed: async () => {},
      getBalance: async () => 10000,
    } as any,
    rulesService: {
      getByWalletId: async () => ({ monthlyLimitCents: 10000, perTransactionLimitCents: 5000, approvalThresholdCents: 2000, blockedMccs: [], allowedMccs: null, autoApprove: true }),
      update: async (_, updates: any) => ({ monthlyLimitCents: 10000, perTransactionLimitCents: 5000, approvalThresholdCents: 2000, blockedMccs: [], allowedMccs: null, autoApprove: true, ...updates }),
    } as any,
    transactionService: {
      getById: async () => ({ id: 'tx1', walletId: 'w1', amountCents: 500, currency: 'eur', merchantName: 'Test', merchantMcc: '5411', status: 'approved', agentReason: null, createdAt: new Date() }),
      listByWallet: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
      getMonthlySpent: async () => 0,
      record: async () => ({ id: 'tx1', walletId: 'w1', amountCents: 500, currency: 'eur', merchantName: 'Test', merchantMcc: null, status: 'approved', agentReason: null, createdAt: new Date() }),
    } as any,
    approvalService: {
      create: async () => ({ id: 'apr1', walletId: 'w1', userId: 'u1', amountCents: 3000, merchantName: 'Test', agentReason: null, status: 'pending', expiresAt: new Date(), createdAt: new Date() }),
      approve: async () => ({ id: 'apr1', status: 'approved' }),
      deny: async () => ({ id: 'apr1', status: 'denied' }),
      listPending: async () => [],
    } as any,
    authorizationService: {
      handleAuthorization: async () => ({ approved: true, transactionId: 'tx1' }),
    } as any,
    apiKeyService: {
      create: async () => ({ id: 'key1', userId: 'u1', keyPrefix: 'lp_sk_ab', name: 'test', scopes: ['read', 'pay'], createdAt: new Date(), expiresAt: null, rawKey: 'lp_sk_abc123' }),
      verify: async () => ({ userId: 'u1', scopes: ['read', 'pay'] }),
      revoke: async () => {},
      listByUser: async () => [],
    } as any,
    userService: {
      getById: async () => ({ id: 'u1', email: 'test@test.com', name: 'Test', stripeCustomerId: null, kycStatus: 'pending' }),
      getOrCreate: async () => ({ id: 'u1', email: 'test@test.com', name: 'Test', stripeCustomerId: null, kycStatus: 'pending' }),
    } as any,
  };
}

// Create a mock JWT token for testing
export function mockJwt(userId: string = 'u1') {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: userId, email: 'test@test.com' }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

export function createTestApp() {
  const deps = createTestDeps();
  const app = createApp(deps);
  return { app, deps };
}
