import {
  Args,
  Context,
  Mutation,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { each } from 'async';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { WalletService } from 'src/libs/wallet/wallet.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';

import {
  BroadcastLiquidTransactionInput,
  CreateOnchainAddressInput,
  CreateWalletInput,
  ReceiveSwapInput,
  RefreshWalletInput,
  WalletMutations,
} from '../wallet.types';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { ContextType } from 'src/libs/graphql/context.type';

@Resolver(WalletMutations)
export class WalletMutationsResolver {
  constructor(
    private walletRepo: WalletRepoService,
    private liquidService: LiquidService,
    private walletService: WalletService,
    private sideShiftService: SideShiftService,
    @Logger('WalletMutationsResolver') private logger: CustomLogger,
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
      await this.liquidService.getUpdatedWallet(
        w.details.descriptor,
        input.full_scan ? 'full' : 'partial',
      );
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
  async create_onchain_address_swap(
    @Args('input') input: ReceiveSwapInput,
    @CurrentUser() { user_id }: any,
    @Context() { ip }: ContextType,
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
        clientIp: ip,
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

  @ResolveField()
  async create(
    @Args('input') input: CreateWalletInput,
    @CurrentUser() { user_id }: any,
  ) {
    return this.walletService.createWallet(user_id, input);
  }

  @ResolveField()
  async broadcast_liquid_transaction(
    @Args('input') input: BroadcastLiquidTransactionInput,
    @CurrentUser() { user_id }: any,
  ) {
    this.logger.debug('Broadcasting new transaction', {
      account_id: input.wallet_account_id,
    });

    const walletAccount = await this.walletRepo.getAccountWalletAccount(
      user_id,
      input.wallet_account_id,
    );

    if (!walletAccount) {
      throw new GraphQLError('Wallet account not found');
    }

    const tx_id = await this.liquidService.broadcastPset(input.signed_pset);

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
