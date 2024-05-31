import { z } from 'zod';

export const swapReverseInfoSchema = z.object({
  BTC: z.object({
    'L-BTC': z.object({
      limits: z.object({
        maximal: z.number(),
        minimal: z.number(),
      }),
    }),
  }),
});

export type SwapReverseInfoType = z.infer<typeof swapReverseInfoSchema>;
