import { handle } from 'hono/vercel';
import { createApp } from './app.js';
import { createDependencies } from './deps.js';

const deps = createDependencies({
  databaseUrl: process.env.DATABASE_URL,
  useMocks: process.env.USE_MOCKS === 'true',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  wallester: {
    baseUrl: process.env.WALLESTER_API_URL ?? 'https://api-sandbox.wallester.eu',
    clientId: process.env.WALLESTER_CLIENT_ID ?? 'mock',
    clientSecret: process.env.WALLESTER_CLIENT_SECRET ?? 'mock',
    productCode: process.env.WALLESTER_PRODUCT_CODE ?? 'mock',
    accountId: process.env.WALLESTER_ACCOUNT_ID ?? 'mock',
    auditUserId: process.env.WALLESTER_AUDIT_USER_ID,
    webhookSecret: process.env.WALLESTER_WEBHOOK_SECRET,
  },
});

const app = createApp(deps);

export default handle(app);
