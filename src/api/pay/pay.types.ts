import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { PaymentRequestObject, RoutingInfo, TagsObject } from 'bolt11';
import { LnUrlInfoSchemaType } from 'src/libs/lnurl/lnurl.types';
import { CreateLiquidTransaction } from '../wallet/wallet.types';

@ObjectType()
export class PayMutations {
  @Field()
  lightning_address: CreateLiquidTransaction;

  @Field()
  lightning_invoice: CreateLiquidTransaction;
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
  @Field()
  wallet_id: string;
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
