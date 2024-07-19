import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SimpleSwap {
  @Field()
  id: string;

  @Field()
  created_at: string;

  @Field()
  provider: string;

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
