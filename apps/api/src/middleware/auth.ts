import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { isApiKey } from '@letpay/core';
import type { ApiKeyService } from '@letpay/core';
import type { AppEnv } from '../types.js';

export function authMiddleware(apiKeyService: ApiKeyService, supabaseUrl: string, supabaseServiceKey: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } }, 401);
    }

    const token = authHeader.slice(7);

    // API key auth
    if (isApiKey(token)) {
      try {
        const { userId, scopes } = await apiKeyService.verify(token);
        c.set('userId', userId);
        c.set('scopes', scopes);
        c.set('authMethod', 'api_key');
        return next();
      } catch {
        return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
      }
    }

    // Supabase JWT auth — verify with Supabase
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
      }

      c.set('userId', user.id);
      c.set('scopes', ['read', 'write', 'pay', 'admin']);
      c.set('authMethod', 'jwt');
      return next();
    } catch {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
    }
  });
}

export function requireScope(scope: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const scopes = c.get('scopes');
    if (!scopes?.includes(scope)) {
      return c.json({ error: { code: 'FORBIDDEN', message: `Missing scope: ${scope}` } }, 403);
    }
    return next();
  });
}
