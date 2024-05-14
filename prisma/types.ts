import { AccountKeyPairType } from 'src/repo/account/account.types';
import {
  WalletAccountDetailsType,
  WalletDetailsType,
} from 'src/repo/wallet/wallet.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type AccountKeyPair = AccountKeyPairType;
    type WalletDetails = WalletDetailsType;
    type WalletAccountDetails = WalletAccountDetailsType;
  }
}
