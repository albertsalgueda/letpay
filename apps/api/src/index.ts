import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDependencies } from './deps.js';
import { getEnv } from './env.js';

const env = getEnv();
const deps = createDependencies({ databaseUrl: env.DATABASE_URL, useMocks: env.USE_MOCKS });
const app = createApp(deps);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`LetPay API running on http://localhost:${info.port}`);
});
