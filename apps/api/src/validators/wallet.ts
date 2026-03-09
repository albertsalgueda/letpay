import { z } from 'zod';

export const createWalletBody = z.object({
  name: z.string().min(1).max(100).default('My Agent'),
});
