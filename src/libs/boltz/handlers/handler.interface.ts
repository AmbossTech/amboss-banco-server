import { wallet_account_swap } from '@prisma/client';

export interface BoltzPendingTransactionInterface {
  handleReverseSwap: (swap: wallet_account_swap, arg: any) => Promise<void>;
  handleSubmarineSwap: (swap: wallet_account_swap, arg: any) => Promise<void>;
  handleChain: (swap: wallet_account_swap, arg: any) => Promise<void>;
}
