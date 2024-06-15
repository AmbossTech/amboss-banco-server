import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { PaymentRequestObject, RoutingInfo, TagsObject } from 'bolt11';
import { WalletAccount } from '../wallet/wallet.types';
import {
  LnUrlCurrenciesAndInfo,
  LnUrlCurrencyType,
} from '../contact/contact.types';

@ObjectType()
export class CreateLiquidTransaction {
  @Field(() => WalletAccount)
  wallet_account: WalletAccount;

  @Field()
  base_64: string;
}

@ObjectType()
export class PayMutations {
  @Field()
  money_address: CreateLiquidTransaction;

  @Field()
  lightning_invoice: CreateLiquidTransaction;

  @Field()
  liquid_address: CreateLiquidTransaction;
}

@InputType()
export class LnAddressPaymentOption {
  @Field()
  code: string;

  @Field()
  network: string;
}

@InputType()
export class PayLnAddressInput {
  @Field()
  address: string;

  @Field()
  amount: number;

  @Field(() => LnAddressPaymentOption, { nullable: true })
  payment_option: LnAddressPaymentOption | null;
}

@InputType()
export class PayLnInvoiceInput {
  @Field()
  invoice: string;
}

@InputType()
export class PayInput {
  @Field({ nullable: true })
  wallet_id: string;

  @Field({ nullable: true })
  account_id: string;
}

@InputType()
export class LiquidRecipientInput {
  @Field()
  address: string;

  @Field()
  amount: string;

  @Field({ nullable: true })
  asset_id: string;
}

@InputType()
export class PayLiquidAddressInput {
  @Field({ nullable: true })
  send_all_lbtc?: boolean;

  @Field()
  fee_rate: number;

  @Field(() => [LiquidRecipientInput])
  recipients: LiquidRecipientInput[];
}

export type PayLnAddressPayload = {
  money_address: string;
  amount: number;
  wallet_account: wallet_account;
  payment_option: LnAddressPaymentOption | null;
};

export type PayLightningAddressAuto = {
  getLnAddressInfo: LnUrlCurrenciesAndInfo;
  getPaymentOption: LnUrlCurrencyType;
  amountCheck: void;
  pay: { base_64: string };
};

export type PayParentType = {
  wallet_account: wallet_account;
};

export type ProcessInvoiceAuto = {
  checkInvoice: {
    magicRoutingHint?: RoutingInfo[0];
    decoded: PaymentRequestObject & {
      tagsObject: TagsObject;
    };
  };
  getAddressFromRouteHint:
    | { address: string; amount: number; asset: string }
    | undefined;
  getAddressFromSwap:
    | { address: string; amount: number; asset: string }
    | undefined;
  constructTransaction: { base_64: string };
};

// export type PayOnchainAddressAutoType = {};
