import { wallet_account } from '@prisma/client';
import { AccountCurrency } from 'src/api/lnurl/lnurl.types';
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
  metadata: z.string(),
  maxSendable: z.number(),
  minSendable: z.number(),
  tag: z.literal('payRequest'),
  currencies: z.array(LnUrlCurrency).optional(),
});

export type LnUrlInfoSchemaType = z.infer<typeof LnUrlInfoSchema>;

export const LnUrlResultSchema = z.object({
  pr: z.string(),
  routes: z.array(z.string()),
  onchain: z
    .object({
      currency: z.string(),
      network: z.string(),
      address: z.string(),
      bip21: z.string(),
    })
    .optional(),
});

const LnUrlErrorSchema = z.object({
  status: z.literal('ERROR'),
  reason: z.string(),
});

type LnUrlErrorSchemaType = z.infer<typeof LnUrlErrorSchema>;

export const LnUrlResponse = z.union([LnUrlResultSchema, LnUrlErrorSchema]);

export type LnUrlResponseSchemaType = z.infer<typeof LnUrlResponse>;

export const isLnUrlError = (
  result: unknown,
): result is LnUrlErrorSchemaType => {
  return (result as any)['status'] === 'ERROR';
};

export type GetCurrenciesLnurlAuto = {
  checkWallet: wallet_account;
  getLiquidCurrencies: AccountCurrency[];
  getSwapCurrencies: AccountCurrency[];
};
