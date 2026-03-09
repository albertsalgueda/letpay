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
  wallesterApiUrl: process.env.WALLESTER_API_URL,
  wallesterIssuerId: process.env.WALLESTER_ISSUER_ID,
  wallesterAudienceId: process.env.WALLESTER_AUDIENCE_ID,
  wallesterPrivateKey: process.env.WALLESTER_PRIVATE_KEY,
  wallesterPublicKey: process.env.WALLESTER_PUBLIC_KEY,
});

const app = createApp(deps, {
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY,
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`LetPay API running on http://localhost:${info.port}`);
  console.log(`Mode: ${env.USE_MOCKS ? 'MOCK' : 'LIVE'}`);
});
