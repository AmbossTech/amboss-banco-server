import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import {
  BroadcastLiquidTransactionInput,
  CreateLiquidTransactionInput,
  CreateWalletInput,
  ReducedAccountInfo,
  WalletAccountType,
  WalletMutations,
} from '../wallet.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { fruitNameGenerator } from 'src/utils/names/names';
import { eachSeries } from 'async';
import { GraphQLError } from 'graphql';
import { LiquidService, getUpdateKey } from 'src/libs/liquid/liquid.service';
import { EsploraLiquidService } from 'src/libs/esplora/liquid.service';
import { RedisService } from 'src/libs/redis/redis.service';
import { Pset } from 'lwk_wasm';

@Resolver(WalletMutations)
export class WalletMutationsResolver {
  constructor(
    private redis: RedisService,
    private walletRepo: WalletRepoService,
    private liquidService: LiquidService,
    private esploraLiquid: EsploraLiquidService,
  ) {}

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

  @ResolveField()
  async create_liquid_transaction(
    @Args('input') input: CreateLiquidTransactionInput,
    @CurrentUser() { user_id }: any,
  ) {
    const walletAccount = await this.walletRepo.getAccountWalletAccount(
      user_id,
      input.wallet_account_id,
    );

    if (!walletAccount) {
      throw new GraphQLError('Wallet account not found');
    }

    if ((walletAccount.details as any).type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid wallet account id');
    }

    const pset = await this.liquidService.createPset(
      (walletAccount.details as any).descriptor,
      input,
    );

    const base_64 = pset.toString();

    return { base_64 };
  }

  @ResolveField()
  async broadcast_liquid_transaction(
    @Args('input') input: BroadcastLiquidTransactionInput,
    @CurrentUser() { user_id }: any,
  ) {
    const walletAccount = await this.walletRepo.getAccountWalletAccount(
      user_id,
      input.wallet_account_id,
    );

    if (!walletAccount) {
      throw new GraphQLError('Wallet account not found');
    }

    const pset = new Pset(input.signed_pset);

    const tx_hex = pset.extractTx().toString();

    console.log({ tx_hex });

    const tx_id = await this.esploraLiquid.postTransactionHex(tx_hex);

    await this.redis.delete(
      getUpdateKey((walletAccount.details as any).descriptor),
    );

    return { tx_id };
  }
}

@Resolver()
export class MainWalletMutationsResolver {
  @Mutation(() => WalletMutations)
  async wallets() {
    return {};
  }
}
