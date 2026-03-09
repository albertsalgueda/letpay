import { handle } from 'hono/vercel';
import { createApp } from './app.js';
import { createDependencies } from './deps.js';

const deps = createDependencies({
  databaseUrl: process.env.DATABASE_URL,
  useMocks: process.env.USE_MOCKS === 'true',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});

const app = createApp(deps);

export default handle(app);
