import { Secp256k1KeyPairType } from 'src/repo/account/account.types';
import {
  AccountSwapRequestType,
  AccountSwapResponseType,
} from 'src/repo/swaps/swaps.types';
import {
  WalletAccountDetailsType,
  WalletDetailsType,
} from 'src/repo/wallet/wallet.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type Secp256k1KeyPair = Secp256k1KeyPairType;
    type WalletDetails = WalletDetailsType;
    type WalletAccountDetails = WalletAccountDetailsType;
    type AccountSwapRequest = AccountSwapRequestType;
    type AccountSwapResponse = AccountSwapResponseType;
  }
}
