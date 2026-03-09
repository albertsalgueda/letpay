import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'lp_sk_';

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const random = randomBytes(32).toString('hex');
  const rawKey = `${KEY_PREFIX}${random}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, KEY_PREFIX.length + 8);
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function isApiKey(token: string): boolean {
  return token.startsWith(KEY_PREFIX);
}
