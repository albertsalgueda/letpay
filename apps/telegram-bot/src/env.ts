export interface BotEnv {
  TELEGRAM_BOT_TOKEN: string;
  DATABASE_URL: string;
  API_URL: string;
  USE_MOCKS: boolean;
}

export function getEnv(): BotEnv {
  return {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? 'mock-token',
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://letpay:letpay@localhost:5432/letpay',
    API_URL: process.env.API_URL ?? 'http://localhost:3001',
    USE_MOCKS: (process.env.USE_MOCKS ?? 'true') === 'true',
  };
}
