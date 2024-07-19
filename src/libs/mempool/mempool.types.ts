import { z } from 'zod';

export const mempoolRecommendedFeesSchema = z.object({
  fastestFee: z.number(),
  halfHourFee: z.number(),
  hourFee: z.number(),
  economyFee: z.number(),
  minimumFee: z.number(),
});

export type MempoolRecommendedFeesType = z.infer<
  typeof mempoolRecommendedFeesSchema
>;
