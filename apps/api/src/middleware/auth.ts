import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { isApiKey } from '@letpay/core';
import type { ApiKeyService } from '@letpay/core';
import type { AppEnv } from '../types.js';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (process.env.USE_MOCKS === 'true') return null;
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && !url.includes('xxx') && key !== 'mock-key') {
    supabaseAdmin = createClient(url, key);
    return supabaseAdmin;
  }
  return null;
}

export function authMiddleware(apiKeyService: ApiKeyService) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } }, 401);
    }

    const token = authHeader.slice(7);

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

    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const { data: { user }, error } = await admin.auth.getUser(token);
        if (error || !user) {
          return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
        }
        c.set('userId', user.id);
        c.set('scopes', ['read', 'write', 'pay', 'admin']);
        c.set('authMethod', 'jwt');
        return next();
      } catch {
        return c.json({ error: { code: 'UNAUTHORIZED', message: 'Token validation failed' } }, 401);
      }
    }

    // Mock JWT fallback: decode without verification
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;
      if (!userId) {
        return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
      }
      c.set('userId', userId);
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
