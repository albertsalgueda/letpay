import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { agentPayBody } from '../validators/agent.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { errorResponse } from '../middleware/error-handler.js';

export function agentRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // POST /v1/agent/pay - Request a payment
  router.post('/pay', rateLimit({ windowMs: 60_000, maxRequests: 10, keyPrefix: 'agent-pay' }), async (c) => {
    try {
      const userId = c.get('userId');
      const body = agentPayBody.parse(await c.req.json());

      // Verify wallet ownership
      const wallet = await deps.walletService.assertActive(body.wallet_id);
      if (wallet.userId !== userId) {
        return c.json({ error: { code: 'FORBIDDEN', message: 'Not your wallet' } }, 403);
      }

      // Get card details for the agent
      if (!wallet.wallesterCardId) {
        return c.json({ error: { code: 'NO_CARD', message: 'No card assigned to this wallet' } }, 400);
      }

      // Get spending rules and monthly spent
      const rules = await deps.rulesService.getByWalletId(wallet.id);
      const monthlySpent = await deps.transactionService.getMonthlySpent(wallet.id);

      // Evaluate rules
      const { evaluateTransaction } = await import('@letpay/core');
      const decision = evaluateTransaction({
        amountCents: body.amount_cents,
        merchantMcc: null,
        merchantName: body.merchant,
        balanceCents: wallet.balanceCents,
        monthlySpentCents: monthlySpent,
        rules,
      });

      if (decision.type === 'declined') {
        const tx = await deps.transactionService.record({
          walletId: wallet.id,
          amountCents: body.amount_cents,
          currency: body.currency,
          merchantName: body.merchant,
          status: 'declined',
          declineReason: decision.reason,
          agentReason: body.reason,
          approvalStatus: 'auto',
        });
        return c.json({ approved: false, reason: decision.reason, transaction_id: tx.id }, 403);
      }

      if (decision.type === 'needs_approval') {
        const tx = await deps.transactionService.record({
          walletId: wallet.id,
          amountCents: body.amount_cents,
          currency: body.currency,
          merchantName: body.merchant,
          status: 'pending',
          agentReason: body.reason,
        });
        const approval = await deps.approvalService.create({
          walletId: wallet.id,
          userId: wallet.userId,
          amountCents: body.amount_cents,
          merchantName: body.merchant,
          agentReason: body.reason,
        });
        return c.json({ approved: false, pending_approval: true, approval_id: approval.id, transaction_id: tx.id }, 202);
      }

      // Approved — return card details
      const cardDetails = await deps.cardService.getCardDetails(wallet.wallesterCardId);
      const tx = await deps.transactionService.record({
        walletId: wallet.id,
        amountCents: body.amount_cents,
        currency: body.currency,
        merchantName: body.merchant,
        status: 'approved',
        agentReason: body.reason,
        approvalStatus: 'auto',
      });

      return c.json({
        approved: true,
        transaction_id: tx.id,
        card: {
          pan: cardDetails.pan,
          exp_month: cardDetails.expMonth,
          exp_year: cardDetails.expYear,
          cvv: cardDetails.cvv,
        },
      });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/agent/balance
  router.get('/balance', rateLimit({ windowMs: 60_000, maxRequests: 30, keyPrefix: 'agent-balance' }), async (c) => {
    try {
      const userId = c.get('userId');
      const wallets = await deps.walletService.listByUser(userId);
      const balances = wallets.map((w) => ({
        wallet_id: w.id,
        name: w.name,
        balance_cents: w.balanceCents,
        status: w.status,
      }));
      return c.json({ data: balances });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/agent/history
  router.get('/history', async (c) => {
    try {
      const userId = c.get('userId');
      const walletId = c.req.query('wallet_id');
      if (!walletId) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'wallet_id required' } }, 400);
      }
      const result = await deps.transactionService.listByWallet(walletId, { limit: 20, offset: 0 });
      return c.json(result);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
