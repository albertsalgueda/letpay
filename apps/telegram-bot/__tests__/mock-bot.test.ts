import { describe, it, expect, beforeEach } from 'vitest';
import { MockTelegramNotificationService } from '../src/mock-bot';

describe('MockTelegramNotificationService', () => {
  let service: MockTelegramNotificationService;

  beforeEach(() => {
    service = new MockTelegramNotificationService();
  });

  it('records transaction notifications', async () => {
    await service.sendTransactionNotification('user-1', {
      id: 'tx-1',
      walletId: 'w-1',
      amountCents: 1500,
      currency: 'eur',
      merchantName: 'OpenAI',
      merchantMcc: null,
      status: 'approved',
      agentReason: 'API credits',
      createdAt: new Date(),
    });

    expect(service.sentMessages).toHaveLength(1);
    expect(service.sentMessages[0].type).toBe('transaction');
    expect(service.sentMessages[0].userId).toBe('user-1');
  });

  it('records approval requests', async () => {
    await service.sendApprovalRequest('user-1', {
      id: 'apr-1',
      walletId: 'w-1',
      userId: 'user-1',
      amountCents: 5000,
      merchantName: 'Amazon',
      agentReason: 'Office supplies',
      status: 'pending',
      expiresAt: new Date(Date.now() + 300000),
      createdAt: new Date(),
    });

    expect(service.sentMessages).toHaveLength(1);
    expect(service.sentMessages[0].type).toBe('approval');
  });

  it('records low balance alerts', async () => {
    await service.sendLowBalanceAlert('user-1', {
      id: 'w-1',
      userId: 'user-1',
      name: 'Work Agent',
      status: 'active',
      balanceCents: 321,
      wallesterCardId: 'card-1',
    });

    expect(service.sentMessages).toHaveLength(1);
    expect(service.sentMessages[0].type).toBe('low_balance');
  });

  it('resets messages', async () => {
    await service.sendTransactionNotification('user-1', {
      id: 'tx-1', walletId: 'w-1', amountCents: 100, currency: 'eur',
      merchantName: null, merchantMcc: null, status: 'approved', agentReason: null, createdAt: new Date(),
    });
    expect(service.sentMessages).toHaveLength(1);
    service.reset();
    expect(service.sentMessages).toHaveLength(0);
  });
});
