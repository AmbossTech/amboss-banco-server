import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';

import { WalletSwaps, WalletSwapsParent } from './swaps.types';

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
