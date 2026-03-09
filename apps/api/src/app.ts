import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppEnv } from './types.js';
import type { Dependencies } from './deps.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { walletRoutes } from './routes/wallets.js';
import { fundingRoutes } from './routes/funding.js';
import { spendingRulesRoutes } from './routes/spending-rules.js';
import { transactionRoutes } from './routes/transactions.js';
import { approvalRoutes } from './routes/approvals.js';
import { cardRoutes } from './routes/card.js';
import { agentRoutes } from './routes/agent.js';
import { webhookRoutes } from './routes/webhooks.js';
import { apiKeyRoutes } from './routes/api-keys.js';

export function createApp(deps: Dependencies) {
  const app = new Hono<AppEnv>();

  // Global middleware
  app.use('*', cors());
  app.use('*', logger());

  // Health check (no auth)
  app.route('', healthRoutes);

  // Webhooks (no auth — verified by signature)
  app.route('/v1/webhooks', webhookRoutes(deps));

  // Auth-protected routes
  const auth = authMiddleware(deps.apiKeyService);
  app.use('/v1/*', auth);

  app.route('/v1/wallets', walletRoutes(deps));
  app.route('/v1/wallets', fundingRoutes(deps));
  app.route('/v1/wallets', spendingRulesRoutes(deps));
  app.route('/v1/wallets', cardRoutes(deps));
  app.route('/v1', transactionRoutes(deps));
  app.route('/v1/approvals', approvalRoutes(deps));
  app.route('/v1/agent', agentRoutes(deps));
  app.route('/v1/api-keys', apiKeyRoutes(deps));

  return app;
}

// Simple app for backward compatibility (health check only)
export const app = new Hono();
app.get('/', (c) => c.json({ name: 'letpay-api', status: 'ok' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
