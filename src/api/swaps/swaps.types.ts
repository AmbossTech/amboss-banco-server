import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class LiquidSwapInput {
  @Field()
  wallet_account_id: string;

  @Field()
  asset: string;

  @Field()
  send_btc: boolean;

  @Field()
  send_amount: number;

  @Field()
  recv_amount: number;

  @Field()
  price: number;
}

@ObjectType()
export class LiquidSwap {
  @Field()
  order_id: string;

  @Field()
  recv_amount: number;

  @Field()
  send_amount: number;

  @Field()
  recv_asset: string;

  @Field()
  send_asset: string;

  @Field()
  upload_url: string;
}

@InputType()
export class LiquidPriceStreamInput {
  @Field()
  asset_id: string;

  @Field()
  buy_bitcoin: boolean;

  @Field()
  send_amount: number;
}

@ObjectType()
export class LiquidPriceSteam {
  @Field()
  asset: string;

  @Field({ nullable: true })
  error_msg?: string;

  @Field({ nullable: true })
  fixed_fee?: number;

  @Field({ nullable: true })
  price?: number;

  @Field({ nullable: true })
  recv_amount?: number;

  @Field({ nullable: true })
  send_amount?: number;
}

@ObjectType()
export class RecieveSwap {
  @Field()
  id: string;

  @Field()
  receive_address: string;

  @Field()
  coin: string;

  @Field()
  network: string;

  @Field()
  min: string;

  @Field()
  max: string;
}

@InputType()
export class ReceiveSwapInput {
  @Field()
  deposit_coin: string;

  @Field()
  deposit_network: string;
}
