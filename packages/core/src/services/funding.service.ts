import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { wallets, topups } from '@letpay/db';
import type { PaymentService } from '../payments/interface';
import { WalletNotFoundError } from '../errors';
import type { TopupInfo } from '../types';

export class FundingService {
  constructor(
    private db: Database,
    private paymentService: PaymentService,
  ) {}

  async createTopup(
    userId: string,
    walletId: string,
    amountCents: number,
    successUrl: string,
    cancelUrl: string,
  ): Promise<TopupInfo> {
    // Verify wallet exists and belongs to user
    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet || wallet.userId !== userId) throw new WalletNotFoundError(walletId);

    const session = await this.paymentService.createCheckoutSession({
      userId,
      walletId,
      amountCents,
      successUrl,
      cancelUrl,
    });

    const [topup] = await this.db.insert(topups).values({
      userId,
      walletId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.paymentIntentId,
      amountCents,
    }).returning();

    return {
      id: topup.id,
      userId: topup.userId,
      walletId: topup.walletId,
      amountCents: topup.amountCents,
      status: topup.status,
      checkoutUrl: session.url,
    };
  }

  async handlePaymentCompleted(sessionId: string, paymentIntentId: string): Promise<void> {
    // Find the topup by session ID
    const [topup] = await this.db.select().from(topups)
      .where(eq(topups.stripeCheckoutSessionId, sessionId));

    if (!topup) return; // Unknown session, ignore

    // Update topup status
    await this.db.update(topups)
      .set({ status: 'succeeded', stripePaymentIntentId: paymentIntentId })
      .where(eq(topups.id, topup.id));

    // Credit the wallet balance
    const [wallet] = await this.db.select().from(wallets).where(eq(wallets.id, topup.walletId));
    if (!wallet) return;

    await this.db.update(wallets)
      .set({
        balanceCents: wallet.balanceCents + topup.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, topup.walletId));
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
