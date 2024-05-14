import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { wallet, wallet_account, wallet_on_accounts } from '@prisma/client';
import { WalletTx, Wollet } from 'lwk_wasm';
import {
  WalletAccountDetailsType,
  WalletAccountType,
  WalletType,
} from 'src/repo/wallet/wallet.types';

registerEnumType(WalletType, { name: 'WalletType' });
registerEnumType(WalletAccountType, { name: 'WalletAccountType' });

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
export class CreateLiquidTransaction {
  @Field()
  base_64: string;
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
export class Wallet {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => WalletDetails)
  details: WalletDetails;

  @Field(() => [WalletAccount])
  accounts: WalletAccount[];
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

  @Field(() => CreateOnchainAddress)
  create_onchain_address: CreateOnchainAddress;

  @Field(() => CreateLiquidTransaction)
  create_liquid_transaction: CreateLiquidTransaction;

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
}

@InputType()
export class LiquidRecipient {
  @Field()
  address: string;

  @Field()
  amount: string;

  @Field({ nullable: true })
  asset_id: string;
}

@InputType()
export class BroadcastLiquidTransactionInput {
  @Field()
  wallet_account_id: string;

  @Field()
  signed_pset: string;
}

@InputType()
export class CreateLiquidTransactionInput {
  @Field()
  wallet_account_id: string;

  @Field()
  fee_rate: number;

  @Field(() => [LiquidRecipient])
  recipients: LiquidRecipient[];
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
