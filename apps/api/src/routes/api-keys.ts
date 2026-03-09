import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { Dependencies } from '../deps.js';
import { uuidParam } from '../validators/common.js';
import { errorResponse } from '../middleware/error-handler.js';
import { z } from 'zod';

const createApiKeyBody = z.object({
  name: z.string().min(1).max(100).default('default'),
  scopes: z.array(z.string()).default(['read', 'pay']),
});

export function apiKeyRoutes(deps: Dependencies) {
  const router = new Hono<AppEnv>();

  // POST /v1/api-keys
  router.post('/', async (c) => {
    try {
      const userId = c.get('userId');
      const body = createApiKeyBody.parse(await c.req.json());
      const key = await deps.apiKeyService.create(userId, body.name, body.scopes);
      return c.json(key, 201);
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // GET /v1/api-keys
  router.get('/', async (c) => {
    try {
      const userId = c.get('userId');
      const keys = await deps.apiKeyService.listByUser(userId);
      return c.json({ data: keys });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  // DELETE /v1/api-keys/:id
  router.delete('/:id', async (c) => {
    try {
      const userId = c.get('userId');
      const keyId = uuidParam.parse(c.req.param('id'));
      await deps.apiKeyService.revoke(keyId, userId);
      return c.json({ deleted: true });
    } catch (err) {
      return errorResponse(c, err);
    }
  });

  return router;
}
