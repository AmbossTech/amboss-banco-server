import { z } from 'zod';

export enum PaymentOptionCode {
  LIGHTNING = 'LIGHTNING',
  BTC = 'BTC',
  USDT = 'USDT',
}

export enum PaymentOptionNetwork {
  LIQUID = 'LIQUID',
  BITCOIN = 'BITCOIN',
}

export const LnUrlCurrency = z.object({
  code: z.nativeEnum(PaymentOptionCode),
  network: z.nativeEnum(PaymentOptionNetwork),
  name: z.string(),
  symbol: z.string(),
});

export type LnUrlCurrencySchemaType = z.infer<typeof LnUrlCurrency>;

export const LnUrlInfoSchema = z.object({
  callback: z.string(),
  maxSendable: z.number(),
  minSendable: z.number(),
  tag: z.literal('payRequest'),
  currencies: z.array(LnUrlCurrency).optional(),
});

export type LnUrlInfoSchemaType = z.infer<typeof LnUrlInfoSchema>;

export const LnUrlResultSchema = z.object({
  pr: z.string(),
  onchain: z
    .object({
      currency: z.string(),
      network: z.string(),
      address: z.string(),
      bip21: z.string(),
    })
    .optional(),
});

export type LnUrlResultSchemaType = z.infer<typeof LnUrlResultSchema>;
