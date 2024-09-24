import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { startOfDay } from 'date-fns';
import { GraphQLError } from 'graphql';
import { LnUrlCurrenciesAndInfo } from 'src/api/contact/contact.types';
import { BoltzService } from 'src/libs/boltz/boltz.service';
import { FiatService } from 'src/libs/fiat/fiat.service';
import { ContextType } from 'src/libs/graphql/context.type';
import {
  DEFAULT_LIQUID_FEE_MSAT,
  TWO_IN_TWO_OUT_TX_SIZE,
} from 'src/libs/liquid/liquid.service';
import { LnUrlIsomorphicService } from 'src/libs/lnurl/handlers/isomorphic.service';
import { RedisService } from 'src/libs/redis/redis.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import {
  SideShiftCoin,
  SideShiftNetwork,
  SideShiftQuote,
} from 'src/libs/sideshift/sideshift.types';
import { v5 } from 'uuid';

import {
  FeeAmount,
  FeeEstimation,
  FeeInfo,
  LnUrlInfo,
  LnUrlInfoInput,
  PayQueries,
  SwapQuote,
  SwapQuoteInput,
} from '../pay.types';

@Resolver(PayQueries)
export class PayQueriesResolver {
  constructor(
    private sideShiftService: SideShiftService,
    private redisService: RedisService,
    private lnurlService: LnUrlIsomorphicService,
  ) {}

  @ResolveField()
  async network_swap_quote(
    @Args('input')
    { settle_amount, settle_coin, settle_network }: SwapQuoteInput,
    @Context() { ip }: ContextType,
  ): Promise<SwapQuote> {
    const quote = await this.sideShiftService.getQuote(
      {
        depositCoin: SideShiftCoin.BTC,
        depositNetwork: SideShiftNetwork.liquid,
        settleAmount: settle_amount,
        settleCoin: settle_coin,
        settleNetwork: settle_network,
      },
      ip,
    );

    // Sideshift quote is valid for 15 minutes.
    await this.redisService.set<SideShiftQuote>(quote.id, quote, {
      ttl: 15 * 60,
    });

    return {
      ...quote,
      created_at: quote.createdAt,
      deposit_coin: quote.depositCoin,
      deposit_network: quote.depositNetwork,
      expires_at: quote.expiresAt,
      settle_coin: quote.settleCoin,
      settle_network: quote.settleNetwork,
      deposit_amount: quote.depositAmount,
      settle_amount: quote.settleAmount,
    };
  }

  @ResolveField()
  async lnurl_info(
    @Args('input') { money_address }: LnUrlInfoInput,
  ): Promise<LnUrlCurrenciesAndInfo> {
    if (!money_address) {
      throw new GraphQLError('No address provided');
    }

    const info = await this.lnurlService.getCurrencies(money_address);

    if (!info) {
      throw new GraphQLError('Unable to get info for address');
    }

    return info;
  }

  @ResolveField()
  async fee_info() {
    return {};
  }
}

@Resolver(FeeAmount)
export class FeeAmountResolver {
  constructor(private fiatService: FiatService) {}

  @ResolveField()
  id(@Parent() fee: number) {
    return v5(fee.toString(), v5.URL);
  }

  @ResolveField()
  satoshis(@Parent() fee: number) {
    return fee;
  }

  @ResolveField()
  async usd(@Parent() fee: number) {
    const currentUsdPrice = await this.fiatService.getLatestBtcPrice();
    if (!currentUsdPrice) {
      throw new GraphQLError(`Cannot get usd fee estimation`);
    }

    return (currentUsdPrice * fee) / 100_000_000;
  }
}

@Resolver(FeeEstimation)
export class FeeEstimationResolver {
  constructor(private boltzService: BoltzService) {}

  @ResolveField()
  id() {
    const date = startOfDay(new Date());
    return v5(date.getTime().toString(), v5.URL);
  }

  @ResolveField()
  async swap_fee_rate() {
    const {
      'L-BTC': {
        BTC: {
          fees: { percentage },
        },
      },
    } = await this.boltzService.getSubmarineSwapInfo();

    return percentage / 100;
  }

  @ResolveField()
  network_fee() {
    return (DEFAULT_LIQUID_FEE_MSAT * TWO_IN_TWO_OUT_TX_SIZE) / 1000;
  }
}

@Resolver(FeeInfo)
export class FeeInfoResolver {
  @ResolveField()
  id() {
    const date = startOfDay(new Date());
    return v5(date.getTime().toString(), v5.URL);
  }

  @ResolveField()
  fee_estimations() {
    return [{}];
  }
}

@Resolver(LnUrlInfo)
export class LnUrlInfoResolver {
  @ResolveField()
  id(@Parent() info: LnUrlCurrenciesAndInfo) {
    return v5(JSON.stringify(info), v5.URL);
  }

  @ResolveField()
  payment_options(@Parent() { paymentOptions }: LnUrlCurrenciesAndInfo) {
    return paymentOptions;
  }
}

@Resolver()
export class MainPayQueriesResolver {
  @Query(() => PayQueries)
  pay() {
    return {};
  }
}
