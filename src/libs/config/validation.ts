import { z } from 'zod';

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;

export const ConfigSchema = z.object({
  server: z.object({
    domain: z.string(),
    cookies: z.object({
      domain: z.string(),
    }),
    jwt: z.object({
      accessSecret: z.string(),
      refreshSecret: z.string(),
    }),
    boltz: z.object({
      enableWebsocket: z.boolean(),
    }),
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
      waterfall: z.string(),
    }),
  }),
  fiat: z
    .object({
      coingecko: z
        .object({
          url: z.string(),
          apikey: z.string(),
        })
        .optional(),
    })
    .optional(),
});
