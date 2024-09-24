import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { PaymentRequestObject, RoutingInfo, TagsObject } from 'bolt11';
import {
  SideShiftCoin,
  SideShiftNetwork,
} from 'src/libs/sideshift/sideshift.types';

import {
  LnUrlCurrenciesAndInfo,
  LnUrlCurrency,
  LnUrlCurrencyType,
} from '../contact/contact.types';
import { WalletAccount } from '../wallet/wallet.types';

export enum PaySwapNetwork {
  BITCOIN = 'BITCOIN',
}

export enum PaySwapCurrency {
  BTC = 'BTC',
}

registerEnumType(PaySwapNetwork, { name: 'PaySwapNetwork' });
registerEnumType(PaySwapCurrency, { name: 'PaySwapCurrency' });

@ObjectType()
export class CreateLiquidTransaction {
  @Field(() => WalletAccount)
  wallet_account: WalletAccount;

  @Field()
  base_64: string;
}

@ObjectType()
export class SwapQuote {
  @Field()
  id: string;

  @Field()
  created_at: string;

  @Field()
  deposit_coin: string;

  @Field()
  settle_coin: string;

  @Field()
  deposit_network: string;

  @Field()
  settle_network: string;

  @Field()
  expires_at: string;

  @Field()
  deposit_amount: string;

  @Field()
  settle_amount: string;

  @Field()
  rate: string;
}

@InputType()
export class LnUrlInfoInput {
  @Field()
  money_address: string;
}

@ObjectType()
export class LnUrlInfo {
  @Field()
  id: string;

  @Field(() => [LnUrlCurrency])
  payment_options: LnUrlCurrency[];
}

@ObjectType()
export class FeeAmount {
  @Field()
  id: string;

  @Field()
  satoshis: number;

  @Field()
  usd: number;
}

@ObjectType()
export class FeeEstimation {
  @Field()
  id: string;

  @Field()
  swap_fee_rate: number;

  @Field(() => FeeAmount)
  network_fee: FeeAmount;
}

@ObjectType()
export class FeeInfo {
  @Field()
  id: string;

  @Field(() => [FeeEstimation])
  fee_estimations: FeeEstimation[];
}

@ObjectType()
export class PayMutations {
  @Field()
  money_address: CreateLiquidTransaction;

  @Field()
  lightning_invoice: CreateLiquidTransaction;

  @Field()
  liquid_address: CreateLiquidTransaction;

  @Field()
  swap_address: CreateLiquidTransaction;

  @Field()
  network_swap: CreateLiquidTransaction;
}

@ObjectType()
export class PayQueries {
  @Field()
  network_swap_quote: SwapQuote;

  @Field()
  lnurl_info: LnUrlInfo;

  @Field()
  fee_info: FeeInfo;
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
  asset_id?: string;
}

@InputType()
export class SwapRecipientInput {
  @Field()
  address: string;

  @Field()
  amount: string;
}

@InputType()
export class PayLiquidAddressInput {
  @Field(() => Boolean, { nullable: true })
  send_all_lbtc?: boolean | null;

  @Field(() => Number, { nullable: true })
  fee_rate?: number | null;

  @Field(() => [LiquidRecipientInput])
  recipients: LiquidRecipientInput[];
}

@InputType()
export class PayNetworkSwapInput {
  @Field()
  quote_id: string;

  @Field()
  settle_address: string;
}

@InputType()
export class SwapQuoteInput {
  @Field()
  settle_amount: string;

  @Field(() => SideShiftCoin)
  settle_coin: SideShiftCoin;

  @Field(() => SideShiftNetwork)
  settle_network: SideShiftNetwork;
}

@InputType()
export class PaySwapAddressInput {
  @Field(() => PaySwapNetwork)
  network: PaySwapNetwork;

  @Field(() => PaySwapCurrency)
  currency: PaySwapCurrency;

  @Field(() => Boolean, { nullable: true })
  send_all_lbtc?: boolean | null;

  @Field(() => Number, { nullable: true })
  fee_rate?: number | null;

  @Field(() => SwapRecipientInput)
  recipient: SwapRecipientInput;
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

export type PayBitcoinAddressInput = {
  recipient: {
    address: string;
    amount: string;
  };
};
