import { z } from 'zod';

export const updateRulesBody = z.object({
  monthly_limit_cents: z.number().int().min(0).optional(),
  per_transaction_limit_cents: z.number().int().min(0).optional(),
  approval_threshold_cents: z.number().int().min(0).optional(),
  blocked_mccs: z.array(z.string()).optional(),
  allowed_mccs: z.array(z.string()).nullable().optional(),
  auto_approve: z.boolean().optional(),
});
