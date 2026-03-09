import { z } from 'zod';

export const agentPayBody = z.object({
  wallet_id: z.string().uuid(),
  amount_cents: z.number().int().min(1),
  currency: z.string().default('eur'),
  merchant: z.string().min(1),
  reason: z.string().optional(),
});
