import { createMiddleware } from 'hono/factory';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(options: { windowMs: number; maxRequests: number; keyPrefix: string }) {
  return createMiddleware(async (c, next) => {
    const userId = (c.get as any)('userId') as string | undefined;
    const key = `${options.keyPrefix}:${userId ?? c.req.header('x-forwarded-for') ?? 'anon'}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => now - t < options.windowMs);

    if (entry.timestamps.length >= options.maxRequests) {
      const retryAfter = Math.ceil((entry.timestamps[0] + options.windowMs - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: `Rate limit exceeded. Retry after ${retryAfter}s` } }, 429);
    }

    entry.timestamps.push(now);
    return next();
  });
}
