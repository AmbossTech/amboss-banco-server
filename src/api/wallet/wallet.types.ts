import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { wallet, wallet_account, wallet_on_accounts } from '@prisma/client';
import { WalletTx } from 'lwk_wasm';

export enum WalletAccountType {
  LIQUID = 'LIQUID',
}

export type WalletAccountDetailsType = {
  type: WalletAccountType.LIQUID;
  descriptor: string;
};

registerEnumType(WalletAccountType, { name: 'WalletAccountType' });

@ObjectType()
export class CreateWallet {
  @Field()
  id: string;
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
export class WalletLiquidTransaction {
  @Field()
  id: string;

  @Field()
  tx_id: string;

  @Field()
  balance: string;

  @Field()
  fee: string;

  @Field()
  block_height: string;

  @Field({ nullable: true })
  date: string;

  @Field()
  blinded_url: string;

  @Field()
  unblinded_url: string;
}

@ObjectType()
export class WalletLiquidAssetInfo {
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
export class WalletLiquidAsset {
  @Field()
  id: string;

  @Field()
  asset_id: string;

  @Field(() => WalletLiquidAssetInfo)
  asset_info: WalletLiquidAssetInfo;

  @Field()
  balance: string;

  @Field(() => [WalletLiquidTransaction])
  transactions: WalletLiquidTransaction[];
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

  @Field(() => WalletAccountType)
  account_type: WalletAccountType;

  @Field(() => [WalletLiquidAsset])
  liquid_assets: WalletLiquidAsset[];
}

@ObjectType()
export class Wallet {
  @Field()
  id: string;

  @Field()
  name: string;

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

  @Field(() => CreateLiquidTransaction)
  create_liquid_transaction: CreateLiquidTransaction;

  @Field(() => BroadcastLiquidTransaction)
  broadcast_liquid_transaction: BroadcastLiquidTransaction;
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
export class CreateWalletInput {
  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  vault: string | null;

  @Field(() => [CreateAccountInput])
  accounts: CreateAccountInput[];
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
  txs: WalletTx[];
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
