import { wallet_account } from '@prisma/client';
import { SwapReverseInfoType } from 'src/libs/boltz/boltz.types';

export type GetLnurlAutoType = {
  getBoltzInfo: SwapReverseInfoType;
  getAccounts: wallet_account[];
  getLiquidAccounts: any[];
  buildResponse: any;
};
