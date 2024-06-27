import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BoltzService } from '../../libs/boltz/boltz.service';
import { CurrentUser, Public } from 'src/auth/auth.decorators';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { ReceiveSwapInput, RecieveSwap } from './swaps.types';
import { LiquidService } from 'src/libs/liquid/liquid.service';

@Resolver()
export class SwapsResolver {
  constructor(
    private boltzService: BoltzService,
    private sideShiftService: SideShiftService,
    private liquidService: LiquidService,
  ) {}

  @Public()
  @Mutation(() => Boolean)
  async payInvoice(@Args('invoice') invoice: string) {
    await this.boltzService.createSubmarineSwap(
      invoice,
      '838bc43b-ffb5-485b-85d5-e468947e3ab8',
    );
    return true;
  }

  @Public()
  @Query(() => Boolean)
  async getSwapQuote() {
    const quote = await this.sideShiftService.getQuote({
      depositAmount: '50',
      depositCoin: 'USDT',
      depositNetwork: 'tron',
      settleCoin: 'BTC',
      settleNetwork: 'liquid',
      affiliateId: 'B29CbRvPTq',
    });
    console.log({ quote });
    return true;
  }

  @Public()
  @Mutation(() => RecieveSwap)
  async recieveViaSwap(
    @Args('input') input: ReceiveSwapInput,
    @CurrentUser() { user_id }: any,
  ): Promise<RecieveSwap> {
    const swap = await this.sideShiftService.createVariableSwap({
      depositCoin: input.deposit_coin,
      depositNetwork: input.deposit_network,
      settleCoin: 'btc',
      settleNetwork: 'liquid',
      settleAddress:
        'lq1qqvts3q67euw5w0f4sqvkwwx8ts0m52lpwh64vgde0jtx7fl5tencgw55qvqp06qajltmu763wkccch8kq6e3vx9v3h2ssf6az',
      affiliateId: 'B29CbRvPTq',
    });
    console.log({ swap });
    return {
      id: swap.id,
      coin: swap.depositCoin,
      min: swap.depositMin,
      max: swap.depositMax,
      network: swap.depositNetwork,
      receive_address: swap.depositAddress,
    };
  }

  @Public()
  @Mutation(() => Boolean)
  async swap() {
    // const swap = await this.sideShiftService.
  }

  // @Public()
  // @Query(() => LiquidPriceSteam)
  // async priceStream(@Args('input') input: LiquidPriceStreamInput) {
  //   return this.sideswapService.getPriceQuery(input);
  // }

  // @Public()
  // @Mutation(() => LiquidSwap)
  // async swapLiquid(
  //   @Args('input') input: LiquidSwapInput,
  //   @CurrentUser() user: any,
  // ) {
  //   const { result } = await this.sideswapService.createSwap(input);
  //   const walletAccount = await this.walletRepo.getAccountWalletAccount(
  //     user?.user_id,
  //     input.wallet_account_id,
  //   );
  //   if (!walletAccount) {
  //     return;
  //   }
  //   const wollet = await this.liquidService.getUpdatedWallet(
  //     walletAccount.details.descriptor,
  //     'none',
  //   );
  //   const psets = wollet.transactions();

  //   console.log({ psets });
  //   // const f = await this.liquidService.getOnchainAddress();
  //   // const swapResponse = await this.sideswapService.startSwap({
  //   //   order_id: result.order_id,
  //   //   change_addr: '',
  //   // });
  // }

  // @Public()
  // @Mutation(() => Boolean)
  // startSwap(@Args('input') input: boolean) {
  //   return true;
  // }
}
