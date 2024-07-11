import z from 'zod';

export const ambossReferralCodeSchema = z.object({
  id: z.string(),
  email: z.string(),
  code: z.string(),
  current_uses: z.number(),
  max_allowed_uses: z.number(),
  is_available: z.boolean(),
});

export type AmbossReferralCode = z.infer<typeof ambossReferralCodeSchema>;
