import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { topupBody } from '../validators/funding.js';
import { uuidParam } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';

export function fundingRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // POST /v1/wallets/:id/topup
  router.post('/:id/topup', async (c) => {
    try {
      const userId = c.get('userId');
      const walletId = uuidParam.parse(c.req.param('id'));
      const body = topupBody.parse(await c.req.json());
      const topup = await deps.fundingService.createTopup(
        userId, walletId, body.amount_cents, body.success_url, body.cancel_url,
      );
      return c.json(topup, 201);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/wallets/:id/balance
  router.get('/:id/balance', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const balanceCents = await deps.fundingService.getBalance(walletId);
      return c.json({ balance_cents: balanceCents });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
