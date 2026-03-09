import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { wallets, spendingRules } from '@letpay/db';
import type { CardIssuingService } from '../cards/interface';
import { WalletNotFoundError, WalletFrozenError, DomainError } from '../errors';
import type { WalletInfo } from '../types';

export class WalletService {
  constructor(
    private db: Database,
    private cardService: CardIssuingService,
  ) {}

  async create(userId: string, name: string): Promise<WalletInfo> {
    const [wallet] = await this.db.insert(wallets).values({
      userId,
      name,
    }).returning();

    // Create a virtual card for this wallet
    const card = await this.cardService.createVirtualCard({
      externalId: wallet.id,
      holderName: name,
    });

    // Update wallet with card ID
    await this.db.update(wallets)
      .set({ wallesterCardId: card.cardId })
      .where(eq(wallets.id, wallet.id));

    // Create default spending rules
    await this.db.insert(spendingRules).values({
      walletId: wallet.id,
    });

    return {
      id: wallet.id,
      userId: wallet.userId,
      name: wallet.name,
      status: wallet.status,
      balanceCents: wallet.balanceCents,
      wallesterCardId: card.cardId,
    };
  }

  async get(walletId: string): Promise<WalletInfo> {
    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) throw new WalletNotFoundError(walletId);
    return {
      id: wallet.id,
      userId: wallet.userId,
      name: wallet.name,
      status: wallet.status,
      balanceCents: wallet.balanceCents,
      wallesterCardId: wallet.wallesterCardId,
    };
  }

  async listByUser(userId: string): Promise<WalletInfo[]> {
    const results = await this.db.select().from(wallets).where(eq(wallets.userId, userId));
    return results.map((w) => ({
      id: w.id,
      userId: w.userId,
      name: w.name,
      status: w.status,
      balanceCents: w.balanceCents,
      wallesterCardId: w.wallesterCardId,
    }));
  }

  async freeze(walletId: string): Promise<void> {
    const wallet = await this.get(walletId);
    if (wallet.status === 'cancelled') {
      throw new DomainError('Cannot freeze a cancelled wallet', 'WALLET_CANCELLED');
    }
    if (wallet.wallesterCardId) {
      await this.cardService.freezeCard(wallet.wallesterCardId);
    }
    await this.db.update(wallets).set({ status: 'frozen', updatedAt: new Date() }).where(eq(wallets.id, walletId));
  }

  async unfreeze(walletId: string): Promise<void> {
    const wallet = await this.get(walletId);
    if (wallet.status !== 'frozen') {
      throw new DomainError('Wallet is not frozen', 'WALLET_NOT_FROZEN');
    }
    if (wallet.wallesterCardId) {
      await this.cardService.unfreezeCard(wallet.wallesterCardId);
    }
    await this.db.update(wallets).set({ status: 'active', updatedAt: new Date() }).where(eq(wallets.id, walletId));
  }

  async cancel(walletId: string): Promise<void> {
    const wallet = await this.get(walletId);
    if (wallet.wallesterCardId) {
      await this.cardService.cancelCard(wallet.wallesterCardId);
    }
    await this.db.update(wallets).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(wallets.id, walletId));
  }

  async assertActive(walletId: string): Promise<WalletInfo> {
    const wallet = await this.get(walletId);
    if (wallet.status === 'frozen') throw new WalletFrozenError(walletId);
    if (wallet.status === 'cancelled') {
      throw new DomainError('Wallet is cancelled', 'WALLET_CANCELLED', 403);
    }
    return wallet;
  }
}
