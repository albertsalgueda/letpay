import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { uuidParam } from '../validators/common.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { errorResponse } from '../middleware/error-handler.js';

export function cardRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // POST /v1/wallets/:id/card - Get card details (rate limited)
  router.post('/:id/card', rateLimit({ windowMs: 60_000, maxRequests: 5, keyPrefix: 'card-details' }), async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const wallet = await deps.walletService.assertActive(walletId);
      if (!wallet.wallesterCardId) {
        return c.json({ error: { code: 'NO_CARD', message: 'No card assigned' } }, 400);
      }
      const details = await deps.cardService.getCardDetails(wallet.wallesterCardId);
      return c.json(details);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
