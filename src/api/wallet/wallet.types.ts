import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { wallet, wallet_account, wallet_on_accounts } from '@prisma/client';
import { WalletTx, Wollet } from 'lwk_wasm';
import {
  SideShiftCoin,
  SideShiftNetwork,
} from 'src/libs/sideshift/sideshift.types';
import {
  WalletAccountDetailsType,
  WalletAccountType,
  WalletType,
} from 'src/repo/wallet/wallet.types';

import { Secp256k1KeyPairInput } from '../account/account.types';
import { WalletContacts } from '../contact/contact.types';
import { WalletSwaps } from '../swaps/swaps.types';

registerEnumType(WalletType, { name: 'WalletType' });
registerEnumType(WalletAccountType, { name: 'WalletAccountType' });
registerEnumType(SideShiftCoin, { name: 'SwapCoin' });
registerEnumType(SideShiftNetwork, { name: 'SwapNetwork' });

@ObjectType()
export class FiatInfo {
  @Field()
  id: string;

  @Field({ nullable: true })
  fiat_to_btc: string;
}

@ObjectType()
export class CreateWallet {
  @Field()
  id: string;
}

@ObjectType()
export class CreateOnchainAddress {
  @Field()
  address: string;
}

@ObjectType()
export class ReceiveSwap {
  @Field()
  id: string;

  @Field()
  receive_address: string;

  @Field(() => SideShiftCoin)
  coin: SideShiftCoin;

  @Field(() => SideShiftNetwork)
  network: SideShiftNetwork;

  @Field()
  min: string;

  @Field()
  max: string;
}

@ObjectType()
export class BroadcastLiquidTransaction {
  @Field()
  tx_id: string;
}

@ObjectType()
export class LiquidAssetInfo {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  ticker: string;

  @Field()
  precision: number;

  @Field()
  is_featured: boolean;
}

@ObjectType()
export class LiquidAsset {
  @Field()
  id: string;

  @Field()
  asset_id: string;

  @Field(() => LiquidAssetInfo)
  asset_info: LiquidAssetInfo;

  @Field(() => FiatInfo)
  fiat_info: FiatInfo;

  @Field()
  balance: string;
}

@ObjectType()
export class LiquidTransaction {
  @Field()
  id: string;

  @Field()
  tx_id: string;

  @Field()
  balance: string;

  @Field()
  fee: string;

  @Field({ nullable: true })
  block_height: string;

  @Field({ nullable: true })
  date: string;

  @Field()
  blinded_url: string;

  @Field()
  unblinded_url: string;

  @Field()
  asset_id: string;

  @Field(() => LiquidAssetInfo)
  asset_info: LiquidAssetInfo;

  @Field(() => FiatInfo)
  fiat_info: FiatInfo;
}

@ObjectType()
export class LiquidAccount {
  @Field()
  id: string;

  @Field(() => [LiquidAsset])
  assets: LiquidAsset[];

  @Field(() => [LiquidTransaction])
  transactions: LiquidTransaction[];
}

@ObjectType()
export class SimpleWalletAccount {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => WalletAccountType)
  account_type: WalletAccountType;
}

@ObjectType()
export class WalletAccount {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  descriptor: string;

  @Field(() => WalletAccountType)
  account_type: WalletAccountType;

  @Field(() => LiquidAccount, { nullable: true })
  liquid: LiquidAccount | null;
}

@ObjectType()
export class WalletDetails {
  @Field()
  id: string;

  @Field(() => WalletType)
  type: WalletType;

  @Field({ nullable: true })
  protected_mnemonic: string;
}

@ObjectType()
export class Secp256k1KeyPair {
  @Field()
  id: string;

  @Field()
  encryption_pubkey: string;

  @Field()
  protected_encryption_private_key: string;
}

@ObjectType()
export class MoneyAddress {
  @Field()
  id: string;

  @Field()
  user: string;

  @Field(() => [String])
  domains: string[];
}

@ObjectType()
export class Wallet {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => [MoneyAddress])
  money_address: MoneyAddress[];

  @Field(() => WalletDetails)
  details: WalletDetails;

  @Field(() => Secp256k1KeyPair)
  secp256k1_key_pair: Secp256k1KeyPair;

  @Field(() => WalletContacts)
  contacts: WalletContacts;

  @Field(() => [WalletAccount])
  accounts: WalletAccount[];

  @Field(() => WalletSwaps)
  swaps: WalletSwaps;
}

@ObjectType()
export class SimpleWallet {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => [SimpleWalletAccount])
  accounts: SimpleWalletAccount[];
}

@ObjectType()
export class WalletQueries {
  @Field()
  id: string;

  @Field(() => [SimpleWallet])
  find_many: SimpleWallet[];

  @Field(() => Wallet)
  find_one: Wallet;
}

@ObjectType()
export class WalletMutations {
  @Field(() => CreateWallet)
  create: CreateWallet;

  @Field(() => Boolean)
  change_name: boolean;

  @Field(() => CreateOnchainAddress)
  create_onchain_address: CreateOnchainAddress;

  @Field(() => ReceiveSwap)
  create_onchain_address_swap: ReceiveSwap;

  @Field(() => BroadcastLiquidTransaction)
  broadcast_liquid_transaction: BroadcastLiquidTransaction;

  @Field(() => Boolean)
  refresh_wallet: boolean;
}

@InputType()
export class CreateAccountInput {
  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => WalletAccountType)
  type: WalletAccountType;

  @Field()
  liquid_descriptor: string;
}

@InputType()
export class CreateWalletDetailsInput {
  @Field(() => WalletType)
  type: WalletType;

  @Field(() => String, { nullable: true })
  protected_mnemonic: string | null;
}

@InputType()
export class CreateWalletInput {
  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => CreateWalletDetailsInput)
  details: CreateWalletDetailsInput;

  @Field(() => [CreateAccountInput])
  accounts: CreateAccountInput[];

  @Field(() => Secp256k1KeyPairInput)
  secp256k1_key_pair: Secp256k1KeyPairInput;
}

@InputType()
export class CreateOnchainAddressInput {
  @Field(() => String)
  wallet_account_id: string;
}

@InputType()
export class RefreshWalletInput {
  @Field(() => String)
  wallet_id: string;

  @Field(() => Boolean, { nullable: true })
  full_scan: boolean | null;
}

@InputType()
export class BroadcastLiquidTransactionInput {
  @Field()
  wallet_account_id: string;

  @Field()
  signed_pset: string;
}

@InputType()
export class ReceiveSwapInput {
  @Field(() => SideShiftCoin)
  deposit_coin: SideShiftCoin;

  @Field(() => SideShiftNetwork)
  deposit_network: SideShiftNetwork;

  @Field()
  wallet_account_id: string;
}

export type AssetParentType = {
  wallet_id: string;
  asset_id: string;
  balance: number;
  // txs: WalletTx[];
};

export type LiquidAccountParentType = {
  descriptor: string;
  walletAccount: wallet_account;
  wollet: Wollet;
};

export type WalletTxWithAssetId = {
  wallet_account_id: string;
  tx: WalletTx;
  asset_id: string;
};

export type ReducedAccountInfo = {
  name: string;
  details: WalletAccountDetailsType;
};

export type GetAccountWalletsResult = wallet_on_accounts & {
  wallet: wallet & { wallet_account: wallet_account[] };
};

export type AssetInfoParent = {
  name: string;
  ticker: string;
  precision: number;
  is_featured: boolean;
  id: string;
};

export type MoneyAddressParent = {
  user: string;
};
