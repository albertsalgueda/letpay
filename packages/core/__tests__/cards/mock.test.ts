import { describe, it, expect, beforeEach } from 'vitest';
import { MockCardIssuingService } from '../../src/cards/mock';

describe('MockCardIssuingService', () => {
  let service: MockCardIssuingService;

  beforeEach(() => {
    service = new MockCardIssuingService();
    service.reset();
  });

  it('creates a virtual card', async () => {
    const card = await service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    });

    expect(card.cardId).toContain('card_mock');
    expect(card.last4).toHaveLength(4);
    expect(card.status).toBe('active');
  });

  it('gets full card details', async () => {
    const card = await service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    });

    const details = await service.getCardDetails(card.cardId);
    expect(details.pan).toHaveLength(16);
    expect(details.pan).toMatch(/^4000/);
    expect(details.cvv).toHaveLength(3);
    expect(details.holderName).toBe('Test User');
  });

  it('freezes and unfreezes a card', async () => {
    const card = await service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    });

    await service.freezeCard(card.cardId);
    let info = await service.getCardInfo(card.cardId);
    expect(info.status).toBe('frozen');

    await service.unfreezeCard(card.cardId);
    info = await service.getCardInfo(card.cardId);
    expect(info.status).toBe('active');
  });

  it('cancels a card', async () => {
    const card = await service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    });

    await service.cancelCard(card.cardId);
    const info = await service.getCardInfo(card.cardId);
    expect(info.status).toBe('cancelled');
  });

  it('simulates authorization and tracks decisions', async () => {
    const card = await service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    });

    const auth = service.simulateAuthorization(card.cardId, 500, 'Coffee Shop', '5814');
    expect(auth.authorizationId).toContain('auth_mock');
    expect(auth.amountCents).toBe(500);

    await service.approveAuthorization(auth.authorizationId);
    const decision = service.getAuthorizationDecision(auth.authorizationId);
    expect(decision).toEqual({ approved: true });
  });

  it('tracks decline decisions', async () => {
    await service.declineAuthorization('auth-123', 'insufficient_funds');
    const decision = service.getAuthorizationDecision('auth-123');
    expect(decision).toEqual({ approved: false, reason: 'insufficient_funds' });
  });

  it('throws for unknown card', async () => {
    await expect(service.getCardDetails('unknown')).rejects.toThrow('not found');
  });

  it('supports configurable failures', async () => {
    service.setNextFailure('Wallester is down');
    await expect(service.createVirtualCard({
      externalId: 'wallet-1',
      holderName: 'Test User',
    })).rejects.toThrow('Wallester is down');
  });
});
