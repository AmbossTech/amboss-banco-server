import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
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
