import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { wallet_account_swap } from '@prisma/client';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';

import { SimpleSwap, WalletSwaps, WalletSwapsParent } from './swaps.types';
import {
  getSwapDepositAmount,
  getSwapFrom,
  getSwapSettleAmount,
  getSwapTo,
  isSwapOutgoing,
} from './swaps.utils';

@Resolver(SimpleSwap)
export class SimpleSwapResolver {
  @ResolveField()
  created_at(@Parent() { created_at }: wallet_account_swap) {
    return created_at.toISOString();
  }

  @ResolveField()
  provider(@Parent() { request }: wallet_account_swap) {
    return request.provider;
  }

  @ResolveField()
  deposit_coin(@Parent() { request, response }: wallet_account_swap) {
    return getSwapFrom(request, response);
  }

  @ResolveField()
  settle_coin(@Parent() { request, response }: wallet_account_swap) {
    return getSwapTo(request, response);
  }

  @ResolveField()
  deposit_amount(@Parent() { request, response }: wallet_account_swap) {
    return isSwapOutgoing(request, response)
      ? getSwapSettleAmount(request, response)
      : getSwapDepositAmount(request, response);
  }

  @ResolveField()
  settle_amount(@Parent() { request, response }: wallet_account_swap) {
    return isSwapOutgoing(request, response)
      ? getSwapDepositAmount(request, response)
      : getSwapSettleAmount(request, response);
  }
}

@Resolver(WalletSwaps)
export class WalletSwapsResolver {
  constructor(private swapRepo: SwapsRepoService) {}

  @ResolveField()
  id(@Parent() { wallet_id }: WalletSwapsParent) {
    return wallet_id;
  }

  @ResolveField()
  async find_many(@Parent() { wallet_id }: WalletSwapsParent) {
    const swaps = await this.swapRepo.getWalletSwaps(wallet_id);
    return [swaps[0], swaps[1]];
  }
}
