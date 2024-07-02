import { Args, ResolveField, Resolver, Query } from '@nestjs/graphql';
import { PayQueries, SwapQuote, SwapQuoteInput } from '../pay.types';
import { RedisService } from 'src/libs/redis/redis.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { SideShiftQuote } from 'src/libs/sideshift/sideshift.types';
import { Public } from 'src/auth/auth.decorators';

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
  ): Promise<SwapQuote> {
    const quote = await this.sideShiftService.getQuote({
      depositCoin: 'BTC',
      depositNetwork: 'liquid',
      settleAmount: settle_amount,
      settleCoin: settle_coin,
      settleNetwork: settle_network,
    });

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
