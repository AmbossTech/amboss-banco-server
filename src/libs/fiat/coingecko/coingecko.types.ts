import { z } from 'zod';

export const simplePrice = z.object({
  bitcoin: z.object({
    usd: z.number(),
  }),
});
