import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import {
  CreateWalletInput,
  ReducedAccountInfo,
  WalletAccountType,
  WalletMutations,
} from './wallet.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { fruitNameGenerator } from 'src/utils/names/names';
import { eachSeries } from 'async';

@Resolver(WalletMutations)
export class WalletMutationsResolver {
  constructor(private walletRepo: WalletRepoService) {}

  @ResolveField()
  async create(
    @Args('input') input: CreateWalletInput,
    @CurrentUser() { user_id }: any,
  ) {
    const mapped = input.accounts.reduce((p: ReducedAccountInfo[], c) => {
      if (!c) return p;
      if (c.type === WalletAccountType.LIQUID) {
        let accountName = c.name;
        if (!accountName) {
          accountName = fruitNameGenerator();
        }
        return [
          ...p,
          {
            name: accountName,
            details: {
              type: WalletAccountType.LIQUID,
              descriptor: c.liquid_descriptor,
            },
          },
        ];
      }
      return p;
    }, []);
    let walletName = input.name;
    if (!walletName) {
      const countWallets = await this.walletRepo.countAccountWallets(user_id);
      walletName = `Wallet ${countWallets + 1}`;
    }

    const newWallet = await this.walletRepo.createNewWallet({
      account_id: user_id,
      is_owner: true,
      name: walletName,
      vault: input.vault || undefined,
    });

    await eachSeries(mapped, async (info) => {
      await this.walletRepo.createNewAccount(
        info.name,
        newWallet.id,
        info.details,
      );
    });
    return { id: newWallet.id };
  }
}

@Resolver()
export class MainWalletMutationsResolver {
  @Mutation(() => WalletMutations)
  async wallets() {
    return {};
  }
}
