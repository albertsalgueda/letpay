import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDb(connectionUrl?: string) {
  const url = connectionUrl ?? process.env.DATABASE_URL ?? 'postgresql://letpay:letpay@localhost:5432/letpay';
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
