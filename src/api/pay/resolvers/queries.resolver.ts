import { Args, Context, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Public } from 'src/auth/auth.decorators';
import { ContextType } from 'src/libs/graphql/context.type';
import { RedisService } from 'src/libs/redis/redis.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import {
  SideShiftCoin,
  SideShiftNetwork,
  SideShiftQuote,
} from 'src/libs/sideshift/sideshift.types';

import { PayQueries, SwapQuote, SwapQuoteInput } from '../pay.types';

@Resolver(PayQueries)
export class PayQueriesResolver {
  constructor(
    private sideShiftService: SideShiftService,
    private redisService: RedisService,
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
}

@Resolver()
export class MainPayQueriesResolver {
  @Public()
  @Query(() => PayQueries)
  pay() {
    return {};
  }
}
