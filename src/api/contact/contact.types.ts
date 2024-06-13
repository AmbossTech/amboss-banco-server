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
  protected_message: string;
}

@ObjectType()
export class LnUrlInfo {
  @Field()
  id: string;

  @Field()
  min_sendable: string;

  @Field()
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

  @Field(() => LnUrlInfo, { nullable: true })
  lnurl_info: LnUrlInfo;

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
  receiver_protected_message: string;

  @Field()
  sender_protected_message: string;
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
  lnUrlInfo: LnUrlInfoSchemaType;
  boltzInfo?: SwapSubmarineInfoType;
};
