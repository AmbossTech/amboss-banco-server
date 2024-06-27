import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SimpleSwap {
  @Field()
  id: string;
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
