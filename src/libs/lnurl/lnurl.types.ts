import { z } from 'zod';

export const LnUrlInfoSchema = z.object({
  callback: z.string(),
  maxSendable: z.number(),
  minSendable: z.number(),
  tag: z.literal('payRequest'),
  currencies: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        network: z.string(),
        symbol: z.string(),
        is_native: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type LnUrlInfoSchemaType = z.infer<typeof LnUrlInfoSchema>;

export const LnUrlResultSchema = z.object({
  pr: z.string(),
});
