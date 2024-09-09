import { z } from 'zod';

export const simplePrice = z.object({
  bitcoin: z.object({
    usd: z.number(),
  }),
});

export const marketChart = z.object({
  prices: z.array(z.array(z.number())),
  market_caps: z.array(z.array(z.number())),
  total_volumes: z.array(z.array(z.number())),
});
