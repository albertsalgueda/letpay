import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { wallets, topups } from '@letpay/db';
import type { PaymentService } from '../payments/interface';
import { WalletNotFoundError } from '../errors';
import type { TopupInfo } from '../types';
import type { WalletService } from './wallet.service';

const FEE_RATE = 0.035;

export class FundingService {
  private walletService: WalletService | null = null;

  constructor(
    private db: Database,
    private paymentService: PaymentService,
  ) {}

  setWalletService(walletService: WalletService) {
    this.walletService = walletService;
  }

  static calculateCharge(amountCents: number): { chargeCents: number; feeCents: number } {
    const chargeCents = Math.ceil(amountCents * (1 + FEE_RATE));
    return { chargeCents, feeCents: chargeCents - amountCents };
  }

  async createTopup(
    userId: string,
    walletId: string,
    amountCents: number,
    successUrl: string,
    cancelUrl: string,
  ): Promise<TopupInfo> {
    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet || wallet.userId !== userId) throw new WalletNotFoundError(walletId);

    const { chargeCents, feeCents } = FundingService.calculateCharge(amountCents);

    const session = await this.paymentService.createCheckoutSession({
      userId,
      walletId,
      amountCents: chargeCents,
      successUrl,
      cancelUrl,
    });

    const [topup] = await this.db.insert(topups).values({
      userId,
      walletId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.paymentIntentId,
      amountCents,
      chargeCents,
    }).returning();

    return {
      id: topup.id,
      userId: topup.userId,
      walletId: topup.walletId,
      amountCents: topup.amountCents,
      chargeCents,
      feeCents,
      status: topup.status,
      checkoutUrl: session.url,
    };
  }

  async handlePaymentCompleted(sessionId: string, paymentIntentId: string): Promise<void> {
    const [topup] = await this.db.select().from(topups)
      .where(eq(topups.stripeCheckoutSessionId, sessionId));

    if (!topup) return;

    await this.db.update(topups)
      .set({ status: 'succeeded', stripePaymentIntentId: paymentIntentId })
      .where(eq(topups.id, topup.id));

    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, topup.walletId));
    if (!wallet) return;

    await this.db.update(wallets)
      .set({
        balanceCents: wallet.balanceCents + topup.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, topup.walletId));

    if (wallet.status === 'pending_funding' && this.walletService) {
      await this.walletService.activateWallet(wallet.id);
    }
  }

  async handlePaymentSucceeded(paymentIntentId: string): Promise<void> {
    const [topup] = await this.db.select().from(topups)
      .where(eq(topups.stripePaymentIntentId, paymentIntentId));

    if (!topup || topup.status === 'succeeded') return;

    await this.db.update(topups)
      .set({ status: 'succeeded' })
      .where(eq(topups.id, topup.id));

    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, topup.walletId));
    if (!wallet) return;

    await this.db.update(wallets)
      .set({
        balanceCents: wallet.balanceCents + topup.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, topup.walletId));

    if (wallet.status === 'pending_funding' && this.walletService) {
      await this.walletService.activateWallet(wallet.id);
    }
  }

  async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const [topup] = await this.db.select().from(topups)
      .where(eq(topups.stripePaymentIntentId, paymentIntentId));

    if (!topup) return;

    await this.db.update(topups)
      .set({ status: 'failed' })
      .where(eq(topups.id, topup.id));
  }

  async getBalance(walletId: string): Promise<number> {
    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) throw new WalletNotFoundError(walletId);
    return wallet.balanceCents;
  }
}
