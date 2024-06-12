import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { PaymentRequestObject, RoutingInfo, TagsObject } from 'bolt11';
import { LnUrlInfoSchemaType } from 'src/libs/lnurl/lnurl.types';
import { WalletAccount } from '../wallet/wallet.types';

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
  lightning_address: CreateLiquidTransaction;

  @Field()
  lightning_invoice: CreateLiquidTransaction;

  @Field()
  liquid_address: CreateLiquidTransaction;
}

@InputType()
export class PayLnAddressInput {
  @Field()
  address: string;

  @Field()
  amount: number;
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

export type PayLightningAddressAuto = {
  getLnAddressInfo: LnUrlInfoSchemaType;
  amountCheck: void;
  getInvoice: string;
  processInvoice: { base_64: string };
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
