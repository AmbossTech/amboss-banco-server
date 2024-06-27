import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser, Public } from 'src/auth/auth.decorators';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { ReceiveSwapInput, RecieveSwap, SwapQuoteInput } from './swaps.types';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { WalletSwaps, WalletSwapsParent } from './swaps.types';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { GraphQLError } from 'graphql';

@Resolver(WalletSwaps)
export class WalletSwapsResolver {
  constructor(private swapRepo: SwapsRepoService) {}

  @ResolveField()
  id(@Parent() { wallet_id }: WalletSwapsParent) {
    return wallet_id;
  }

  @ResolveField()
  async find_many(@Parent() { wallet_id }: WalletSwapsParent) {
    return this.swapRepo.getWalletSwaps(wallet_id);
  }
}
@Resolver()
export class SwapsResolver {
  constructor(
    private sideShiftService: SideShiftService,
    private liquidService: LiquidService,
    private walletRepo: WalletRepoService,
  ) {}

  @Public()
  @Query(() => Boolean)
  async getSwapQuote(
    @Args('input') { amount, deposit_coin, deposit_network }: SwapQuoteInput,
  ) {
    const quote = await this.sideShiftService.getQuote({
      depositAmount: amount,
      depositCoin: deposit_coin,
      depositNetwork: deposit_network,
      settleCoin: 'BTC',
      settleNetwork: 'liquid',
    });
    console.log({ quote });
    return true;
  }

  @Mutation(() => RecieveSwap)
  async recieveViaSwap(
    @Args('input') input: ReceiveSwapInput,
    @CurrentUser() { user_id }: any,
  ) {
    const walletAccount = await this.walletRepo.getAccountWalletAccount(
      user_id,
      input.wallet_account_id,
    );

    if (!walletAccount) {
      throw new GraphQLError('Wallet account not found');
    }

    const address = await this.liquidService.getOnchainAddress(
      walletAccount?.details.descriptor,
    );

    const swap = await this.sideShiftService.createVariableSwap(
      {
        depositCoin: input.deposit_coin,
        depositNetwork: input.deposit_network,
        settleCoin: 'btc',
        settleNetwork: 'liquid',
        settleAddress: address.address().toString(),
      },
      input.wallet_account_id,
    );

    return {
      id: swap.id,
      coin: swap.depositCoin,
      min: swap.depositMin,
      max: swap.depositMax,
      network: swap.depositNetwork,
      receive_address: swap.depositAddress,
    };
  }
}
