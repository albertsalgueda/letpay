import { Hono } from 'hono';
import type { Dependencies } from '../deps.js';
import { uuidParam, paginationQuery } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';

export function transactionRoutes(deps: Dependencies) {
  const router = new Hono();

  // GET /v1/wallets/:id/transactions
  router.get('/wallets/:id/transactions', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const { limit, offset } = paginationQuery.parse(c.req.query());
      const result = await deps.transactionService.listByWallet(walletId, { limit, offset });
      return c.json(result);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/transactions/:id
  router.get('/transactions/:id', async (c) => {
    try {
      const txId = uuidParam.parse(c.req.param('id'));
      const tx = await deps.transactionService.getById(txId);
      return c.json(tx);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
