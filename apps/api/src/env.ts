import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://letpay:letpay@localhost:5432/letpay'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_mock'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_mock'),
  WALLESTER_WEBHOOK_SECRET: z.string().default('wallester_mock'),
  SUPABASE_URL: z.string().default('http://localhost:54321'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('mock-key'),
  API_URL: z.string().default('http://localhost:3001'),
  WEB_URL: z.string().default('http://localhost:3000'),
  USE_MOCKS: z.string().default('true').transform((v) => v === 'true'),
  PORT: z.string().default('3001').transform(Number),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

export function setEnvForTesting(env: Partial<Env>): void {
  _env = { ...envSchema.parse(process.env), ...env } as Env;
}
