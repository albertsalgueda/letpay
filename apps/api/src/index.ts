import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDependencies } from './deps.js';
import { getEnv } from './env.js';

const env = getEnv();
const deps = createDependencies({
  databaseUrl: env.DATABASE_URL,
  useMocks: env.USE_MOCKS,
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  wallester: {
    baseUrl: env.WALLESTER_API_URL,
    clientId: env.WALLESTER_CLIENT_ID,
    clientSecret: env.WALLESTER_CLIENT_SECRET,
    productCode: env.WALLESTER_PRODUCT_CODE,
    accountId: env.WALLESTER_ACCOUNT_ID,
    auditUserId: env.WALLESTER_AUDIT_USER_ID,
    webhookSecret: env.WALLESTER_WEBHOOK_SECRET,
  },
});
const app = createApp(deps);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`LetPay API running on http://localhost:${info.port}`);
});
