import { z } from 'zod';

export const topupBody = z.object({
  amount_cents: z.number().int().min(100).max(1000000),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});
