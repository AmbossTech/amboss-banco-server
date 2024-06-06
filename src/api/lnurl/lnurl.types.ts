import { wallet_account } from '@prisma/client';
import { SwapReverseInfoType } from 'src/libs/boltz/boltz.types';
import { z } from 'zod';

export type GetLnurlAutoType = {
  getBoltzInfo: SwapReverseInfoType;
  getAccounts: wallet_account[];
  getLiquidAccounts: any[];
  buildResponse: any;
};

export const LightningAddressPubkeyResponseSchema = z.object({
  encryptionPubKey: z.string(),
});

export const MessageBodySchema = z.object({
  payerData: z.object({
    identifier: z.string(),
  }),
  protected_message: z.string(),
});
