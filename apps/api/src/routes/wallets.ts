import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { createWalletBody } from '../validators/wallet.js';
import { uuidParam } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';

export function walletRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // POST /v1/wallets - Create wallet with initial funding
  router.post('/', async (c) => {
    try {
      const userId = c.get('userId');
      const body = createWalletBody.parse(await c.req.json());

      const wallet = await deps.walletService.create(userId, body.name, true);

      const defaultUrl = 'http://localhost:3000/dashboard';
      const topup = await deps.fundingService.createTopup(
        userId,
        wallet.id,
        body.initial_funding_cents,
        body.success_url ?? defaultUrl,
        body.cancel_url ?? defaultUrl,
      );

      return c.json({ ...wallet, checkout_url: topup.checkoutUrl, topup }, 201);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/wallets - List user's wallets (excludes pending_funding)
  router.get('/', async (c) => {
    try {
      const userId = c.get('userId');
      const all = await deps.walletService.listByUser(userId);
      const wallets = all.filter((w) => w.status !== 'pending_funding');
      return c.json({ data: wallets });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/wallets/:id - Get wallet
  router.get('/:id', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const wallet = await deps.walletService.get(walletId);
      return c.json(wallet);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // POST /v1/wallets/:id/freeze
  router.post('/:id/freeze', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      await deps.walletService.freeze(walletId);
      return c.json({ status: 'frozen' });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // POST /v1/wallets/:id/unfreeze
  router.post('/:id/unfreeze', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      await deps.walletService.unfreeze(walletId);
      return c.json({ status: 'active' });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // DELETE /v1/wallets/:id
  router.delete('/:id', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      await deps.walletService.cancel(walletId);
      return c.json({ status: 'cancelled' });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
