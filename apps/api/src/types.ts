import type { Env } from 'hono';

export interface AppEnv extends Env {
  Variables: {
    userId: string;
    scopes: string[];
    authMethod: 'api_key' | 'jwt';
  };
}
