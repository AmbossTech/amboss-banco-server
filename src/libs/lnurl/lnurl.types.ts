import { z } from 'zod';

export enum PaymentOptionCode {
  LIGHTNING = 'LIGHTNING',
  BTC = 'BTC',
  USDT = 'USDT',
}

export enum PaymentOptionChain {
  LIQUID = 'LIQUID',
  BTC = 'BTC',
}

export enum PaymentOptionNetwork {
  MAINNET = 'MAINNET',
}

export const LnUrlCurrency = z.object({
  code: z.nativeEnum(PaymentOptionCode),
  chain: z.nativeEnum(PaymentOptionChain),
  network: z.nativeEnum(PaymentOptionNetwork),
  name: z.string(),
  symbol: z.string(),
  is_native: z.boolean().optional(),
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
      chain: z.string(),
      currency: z.string(),
      network: z.string(),
      address: z.string(),
      bip21: z.string(),
    })
    .optional(),
});

export type LnUrlResultSchemaType = z.infer<typeof LnUrlResultSchema>;
