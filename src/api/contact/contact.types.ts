import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { SwapSubmarineInfoType } from 'src/libs/boltz/boltz.types';
import { LnUrlInfoSchemaType } from 'src/libs/lnurl/lnurl.types';
import { z } from 'zod';

@ObjectType()
export class CreateContact {
  @Field()
  id: string;
}

@ObjectType()
export class SendMessage {
  @Field()
  id: string;
}

@ObjectType()
export class ContactMutations {
  @Field(() => CreateContact)
  create: CreateContact;

  @Field(() => SendMessage)
  send_message: SendMessage;
}

@ObjectType()
export class ContactMessage {
  @Field()
  id: string;

  @Field()
  contact_is_sender: boolean;

  @Field()
  payload: string;
}

// @ObjectType()
// export class LnUrlCurrency {
//   @Field()
//   id: string;

//   @Field()
//   code: string;

//   @Field()
//   name: string;

//   @Field()
//   network: string;

//   @Field()
//   symbol: string;

//   @Field({ nullable: true })
//   is_native: boolean;
// }

// @ObjectType()
// export class LnUrlInfo {
//   @Field()
//   id: string;

//   @Field()
//   min_sendable: string;

//   @Field()
//   max_sendable: string;

//   @Field()
//   variable_fee_percentage: string;

//   @Field()
//   fixed_fee: string;

//   @Field(() => [LnUrlCurrency])
//   currencies: LnUrlCurrency[];
// }

@ObjectType()
export class LnUrlCurrency {
  @Field()
  id: string;

  @Field()
  code: string;

  @Field()
  name: string;

  @Field()
  network: string;

  @Field()
  symbol: string;

  @Field({ nullable: true })
  min_sendable: string;

  @Field({ nullable: true })
  max_sendable: string;

  @Field()
  variable_fee_percentage: string;

  @Field()
  fixed_fee: string;
}

@ObjectType()
export class WalletContact {
  @Field()
  id: string;

  @Field()
  money_address: string;

  @Field(() => [LnUrlCurrency], { nullable: true })
  payment_options: LnUrlCurrency[];

  @Field({ nullable: true })
  encryption_pubkey: string;

  @Field(() => [ContactMessage])
  messages: ContactMessage[];
}

@ObjectType()
export class SimpleWalletContact {
  @Field()
  id: string;

  @Field()
  money_address: string;
}

@ObjectType()
export class WalletContacts {
  @Field()
  id: string;

  @Field(() => [SimpleWalletContact])
  find_many: SimpleWalletContact[];

  @Field(() => WalletContact)
  find_one: WalletContact;
}

@InputType()
export class CreateContactInput {
  @Field()
  wallet_id: string;

  @Field()
  money_address: string;
}

@InputType()
export class SendMessageInput {
  @Field()
  contact_id: string;

  @Field()
  receiver_money_address: string;

  @Field()
  receiver_payload: string;

  @Field()
  sender_payload: string;
}

export type WalletContactsParent = {
  wallet_id: string;
};

export const moneyAddressType = z
  .string()
  .min(1, { message: 'No Money Address Provided' })
  .email('Invalid Money Address');

export const LightningAddressResponseSchema = z.object({
  callback: z.string(),
  metadata: z.string(),
  tag: z.literal('payRequest'),
  minSendable: z.number(),
  maxSendable: z.number(),
});

export type WalletContactParent = {
  id: string;
  money_address: string | null;
};

export type LnUrlInfoParent = {
  lnUrlInfo: LnUrlInfoSchemaType & { lightning_enabled: boolean };
  boltzInfo?: SwapSubmarineInfoType;
};

export type LnUrlCurrencyType = {
  code: string;
  name: string;
  network: string;
  symbol: string;
  min_sendable: number | null;
  max_sendable: number | null;
  fixed_fee: number;
  variable_fee_percentage: number;
};
