import { Hono } from 'hono';
import type { Dependencies } from '../deps.js';
import { updateRulesBody } from '../validators/spending-rules.js';
import { uuidParam } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';

export function spendingRulesRoutes(deps: Dependencies) {
  const router = new Hono();

  // GET /v1/wallets/:id/rules
  router.get('/:id/rules', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const rules = await deps.rulesService.getByWalletId(walletId);
      return c.json(rules);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // PUT /v1/wallets/:id/rules
  router.put('/:id/rules', async (c) => {
    try {
      const walletId = uuidParam.parse(c.req.param('id'));
      const body = updateRulesBody.parse(await c.req.json());
      const rules = await deps.rulesService.update(walletId, {
        monthlyLimitCents: body.monthly_limit_cents,
        perTransactionLimitCents: body.per_transaction_limit_cents,
        approvalThresholdCents: body.approval_threshold_cents,
        blockedMccs: body.blocked_mccs,
        allowedMccs: body.allowed_mccs,
        autoApprove: body.auto_approve,
      });
      return c.json(rules);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
