import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import {
  BroadcastLiquidTransactionInput,
  CreateOnchainAddressInput,
  CreateWalletInput,
  ReducedAccountInfo,
  RefreshWalletInput,
  WalletMutations,
} from '../wallet.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { fruitNameGenerator } from 'src/utils/names/names';
import { each, eachSeries } from 'async';
import { GraphQLError } from 'graphql';
import { LiquidService, getUpdateKey } from 'src/libs/liquid/liquid.service';
import { RedisService } from 'src/libs/redis/redis.service';
import { WalletAccountType, WalletType } from 'src/repo/wallet/wallet.types';

@Resolver(WalletMutations)
export class WalletMutationsResolver {
  constructor(
    private redis: RedisService,
    private walletRepo: WalletRepoService,
    private liquidService: LiquidService,
  ) {}

  @ResolveField()
  async refresh_wallet(
    @Args('input') input: RefreshWalletInput,
    @CurrentUser() { user_id }: any,
  ) {
    const wallet = await this.walletRepo.getAccountWallet(
      user_id,
      input.wallet_id,
    );

    if (!wallet) {
      throw new GraphQLError('Wallet account not found');
    }

    if (!wallet.wallet.wallet_account.length) {
      return;
    }

    await each(wallet.wallet.wallet_account, async (w) => {
      await this.liquidService.getUpdatedWallet(w.details.descriptor, true);
    });

    return true;
  }

  @ResolveField()
  async create_onchain_address(
    @Args('input') input: CreateOnchainAddressInput,
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
      walletAccount.details.descriptor,
    );

    return { address: address.address().toString() };
  }

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

    const details = input.details;

    if (details.type !== WalletType.CLIENT_GENERATED) {
      throw new GraphQLError('Error creating this wallet type');
    }

    if (!details.protected_mnemonic) {
      throw new GraphQLError(
        'Client wallet requires you to push an encrypted mnemonic',
      );
    }

    const newWallet = await this.walletRepo.createNewWallet({
      account_id: user_id,
      is_owner: true,
      name: walletName,
      details: {
        type: details.type,
        protected_mnemonic: details.protected_mnemonic,
      },
      secp256k1_key_pair: input.secp256k1_key_pair,
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

    const tx_id = await this.liquidService.broadcastPset(input.signed_pset);

    await this.redis.delete(getUpdateKey(walletAccount.details.descriptor));

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
