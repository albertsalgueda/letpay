import { z } from 'zod';

export const createWalletBody = z.object({
  name: z.string().min(1).max(100).default('My Agent'),
  initial_funding_cents: z.number().int().min(1000).max(1000000),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});
