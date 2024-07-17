import z from 'zod';

export const ambossReferralCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  current_uses: z.number(),
  max_allowed_uses: z.number(),
  is_available: z.boolean(),
  created_by_email: z.string(),
  used_by_emails: z.array(z.string()),
});

export type AmbossReferralCode = z.infer<typeof ambossReferralCodeSchema>;

export const ambossUseReferralCodeSchema = z.object({ success: z.boolean() });

export type AmbossUseReferralCode = z.infer<typeof ambossUseReferralCodeSchema>;

export const ambossCanSignupSchema = z.object({
  can_signup: z.boolean(),
  using_referral_code: z.boolean().optional(),
});

export type AmbossCanSignup = z.infer<typeof ambossCanSignupSchema>;
