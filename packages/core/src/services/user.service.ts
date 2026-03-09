import { eq } from 'drizzle-orm';
import type { Database } from '@letpay/db';
import { users } from '@letpay/db';
import { NotFoundError } from '../errors';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
  kycStatus: string;
}

export class UserService {
  constructor(private db: Database) {}

  async getById(userId: string): Promise<UserInfo> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundError('User', userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
      kycStatus: user.kycStatus,
    };
  }

  async getOrCreate(id: string, email: string, name: string): Promise<UserInfo> {
    const [existing] = await this.db.select().from(users).where(eq(users.id, id));
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        stripeCustomerId: existing.stripeCustomerId,
        kycStatus: existing.kycStatus,
      };
    }

    const [user] = await this.db.insert(users).values({ id, email, name }).returning();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
      kycStatus: user.kycStatus,
    };
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await this.db.update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
