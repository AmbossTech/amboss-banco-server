import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SwapProvider } from 'src/repo/swaps/swaps.types';

registerEnumType(SwapProvider, { name: 'SwapProvider' });

@ObjectType()
export class SimpleSwap {
  @Field()
  id: string;

  @Field()
  created_at: string;

  @Field(() => SwapProvider)
  provider: SwapProvider;

  @Field()
  deposit_coin: string;

  @Field()
  settle_coin: string;

  @Field(() => String, { nullable: true })
  deposit_amount?: string;

  @Field(() => String, { nullable: true })
  settle_amount?: string;
}

@ObjectType()
export class WalletSwaps {
  @Field()
  id: string;

  @Field(() => [SimpleSwap])
  find_many: SimpleSwap[];
}

export type WalletSwapsParent = {
  wallet_id: string;
};
