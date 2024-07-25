import { wallet_account } from '@prisma/client';
import {
  BoltzChainSwapResponseType,
  BoltzReverseSwapResponseType,
  SwapReverseInfoType,
} from 'src/libs/boltz/boltz.types';
import {
  LnUrlInfoSchemaType,
  LnUrlResponseSchemaType,
  PaymentOptionCode,
  PaymentOptionNetwork,
} from 'src/libs/lnurl/lnurl.types';
import { z } from 'zod';

type NoUndefinedField<T> = {
  [P in keyof T]-?: NoUndefinedField<NonNullable<T[P]>>;
};

type BaseCallbackParams = {
  amount: string | undefined;
  currency: string | undefined;
  network: string | undefined;
};

export type CallbackRemoteParams = {
  callbackUrl: string;
} & BaseCallbackParams;

export type CallbackLocalParams = {
  account: string | undefined;
} & BaseCallbackParams;

export type CallbackLocalHandlerParams = Omit<
  NoUndefinedField<CallbackLocalParams>,
  'amount'
> & { amount: number };

export type AccountCurrency = {
  name: string;
  symbol: string;
  code: PaymentOptionCode;
  network: PaymentOptionNetwork;
  wallet_account: wallet_account;
  asset_id: string;
  conversion_decimals: number;
  convertible?: {
    min: string;
    max: string;
  };
};

export type GetLnurlAutoType = {
  getBoltzInfo: SwapReverseInfoType;
  getAccountCurrencies: AccountCurrency[];
  buildResponse: LnUrlInfoSchemaType;
};

export const LightningAddressPubkeyResponseSchema = z.object({
  encryptionPubKey: z.string(),
});

export const MessageBodySchema = z.object({
  payerData: z.object({
    identifier: z.string(),
  }),
  payload: z.string(),
});

export type GetLnUrlResponseAutoType = {
  checkCurrency: AccountCurrency;
  createPayload: LnUrlResponseSchemaType;
};

export type GetLnUrlInvoiceAutoType = {
  createSwap: BoltzReverseSwapResponseType;
  checkAmount: number;
  createPayload: LnUrlResponseSchemaType;
};

export type GetBitcoinOnchainAutoType = {
  checkAmount: number;
  createSwap: BoltzChainSwapResponseType;
  createPayload: LnUrlResponseSchemaType;
};
