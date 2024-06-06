import { z } from 'zod';

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;

export const ConfigSchema = z.object({
  server: z.object({
    domain: z.string(),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    cacheTTL: z.number(),
  }),
  urls: z.object({
    boltz: z.string(),
    esplora: z.object({
      liquid: z.string(),
    }),
  }),
});
