import { wallet_account } from '@prisma/client';
import {
  BoltzReverseSwapResponseType,
  SwapReverseInfoType,
} from 'src/libs/boltz/boltz.types';
import { z } from 'zod';

export type CallbackParams = {
  account: string | undefined;
  amount: string | undefined;
  currency: string | undefined;
  network: string | undefined;
};

export type CallbackHandlerParams = Omit<
  CallbackParams,
  'account' | 'amount' | 'currency'
> & { account: string; amount: number; currency: string };

export type AccountCurrency = {
  code: string;
  name: string;
  network: string;
  symbol: string;
  wallet_account: wallet_account;
  asset_id: string;
  conversion_decimals: number;
};

export type GetLnurlAutoType = {
  getBoltzInfo: SwapReverseInfoType;
  getAccountCurrencies: AccountCurrency[];
  buildResponse: any;
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
  createPayload: {
    pr: string;
    routes: [];
    onchain: { network: string; address: string; bip21: string };
  };
};

export type GetLnUrlInvoiceAutoType = {
  createSwap: BoltzReverseSwapResponseType;
  checkAmount: number;
  createPayload: {
    pr: string;
    routes: [];
    onchain?: { network: string; address: string; bip21: string };
  };
};
