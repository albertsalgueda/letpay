import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { uuidParam } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';

export function approvalRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // GET /v1/approvals - List pending approvals
  router.get('/', async (c) => {
    try {
      const userId = c.get('userId');
      const pending = await deps.approvalService.listPending(userId);
      return c.json({ data: pending });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // POST /v1/approvals/:id/approve
  router.post('/:id/approve', async (c) => {
    try {
      const userId = c.get('userId');
      const approvalId = uuidParam.parse(c.req.param('id'));
      const result = await deps.approvalService.approve(approvalId, userId);
      return c.json(result);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // POST /v1/approvals/:id/deny
  router.post('/:id/deny', async (c) => {
    try {
      const userId = c.get('userId');
      const approvalId = uuidParam.parse(c.req.param('id'));
      const result = await deps.approvalService.deny(approvalId, userId);
      return c.json(result);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
