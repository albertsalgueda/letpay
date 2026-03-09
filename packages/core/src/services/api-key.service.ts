import { eq, and } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { apiKeys } from '@letpay/db';
import { generateApiKey, hashApiKey } from '../auth/api-key';
import { NotFoundError, UnauthorizedError } from '../errors';
import type { ApiKeyInfo } from '../types';

export class ApiKeyService {
  constructor(private db: Database) {}

  async create(userId: string, name: string, scopes: string[]): Promise<ApiKeyInfo> {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const [key] = await this.db.insert(apiKeys).values({
      userId,
      keyHash,
      keyPrefix,
      name,
      scopes,
    }).returning();

    return {
      id: key.id,
      userId: key.userId,
      keyPrefix: key.keyPrefix,
      name: key.name,
      scopes: key.scopes,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      rawKey, // Only returned at creation
    };
  }

  async verify(rawKey: string): Promise<{ userId: string; scopes: string[] }> {
    const keyHash = hashApiKey(rawKey);
    const [key] = await this.db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));

    if (!key) throw new UnauthorizedError('Invalid API key');
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedError('API key expired');
    }

    // Update last used
    await this.db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id));

    return { userId: key.userId, scopes: key.scopes };
  }

  async revoke(keyId: string, userId: string): Promise<void> {
    const [key] = await this.db.select().from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
    if (!key) throw new NotFoundError('ApiKey', keyId);

    await this.db.delete(apiKeys).where(eq(apiKeys.id, keyId));
  }

  async listByUser(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    return keys.map((k) => ({
      id: k.id,
      userId: k.userId,
      keyPrefix: k.keyPrefix,
      name: k.name,
      scopes: k.scopes,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
    }));
  }
}
