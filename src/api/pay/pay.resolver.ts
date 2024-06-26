import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { CustomLogger, Logger } from 'src/libs/logging';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { WalletAccountType } from 'src/repo/wallet/wallet.types';
import { isUUID } from 'src/utils/string';

import { PayService } from './pay.service';
import {
  PayInput,
  PayLiquidAddressInput,
  PayLnAddressInput,
  PayLnInvoiceInput,
  PayMutations,
  PayParentType,
} from './pay.types';

@Resolver(PayMutations)
export class PayMutationsResolver {
  constructor(private payService: PayService) {}

  @ResolveField()
  async money_address(
    @Args('input') input: PayLnAddressInput,
    @Parent() parent: PayParentType,
  ) {
    if (parent.wallet_account.details.type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid account type');
    }

    const { base_64 } = await this.payService.payLightningAddress({
      money_address: input.address,
      amount: input.amount,
      wallet_account: parent.wallet_account,
      payment_option: input.payment_option,
    });

    return { base_64, wallet_account: parent.wallet_account };
  }

  @ResolveField()
  async lightning_invoice(
    @Args('input') input: PayLnInvoiceInput,
    @Parent() parent: PayParentType,
  ) {
    if (parent.wallet_account.details.type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid account type');
    }

    const { base_64 } = await this.payService.payLightningInvoice(
      input.invoice,
      parent.wallet_account,
    );

    return { base_64, wallet_account: parent.wallet_account };
  }

  @ResolveField()
  async liquid_address(
    @Args('input') input: PayLiquidAddressInput,
    @Parent() parent: PayParentType,
  ) {
    if (parent.wallet_account.details.type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid wallet account id');
    }

    if (!!input.send_all_lbtc && input.recipients.length > 1) {
      throw new GraphQLError(
        'You can only specify a single recipient when sending all',
      );
    }

    const { base_64 } = await this.payService.payLiquidAddress(
      parent.wallet_account,
      input,
    );

    return { base_64, wallet_account: parent.wallet_account };
  }
}

@Resolver()
export class MainPayResolver {
  constructor(
    private walletRepo: WalletRepoService,
    @Logger('MainPayResolver') private logger: CustomLogger,
  ) {}

  @Mutation(() => PayMutations)
  async pay(
    @CurrentUser() { user_id }: any,
    @Args('input') input: PayInput,
  ): Promise<PayParentType> {
    const { wallet_id, account_id } = input;

    if (!wallet_id && !account_id) {
      throw new GraphQLError('No wallet or account ID provided');
    }

    if (!!wallet_id && !isUUID(wallet_id)) {
      throw new GraphQLError('Invalid wallet id');
    }

    if (!!account_id && !isUUID(account_id)) {
      throw new GraphQLError('Invalid wallet id');
    }

    if (account_id) {
      const walletAccount = await this.walletRepo.getAccountWalletAccount(
        user_id,
        account_id,
      );

      if (!walletAccount) {
        throw new GraphQLError('Account not found');
      }

      if (walletAccount.details.type !== WalletAccountType.LIQUID) {
        throw new GraphQLError('Account not found');
      }

      this.logger.debug('Paying from account', {
        wallet_account: walletAccount,
      });

      return { wallet_account: walletAccount };
    }

    const walletAccounts = await this.walletRepo.getAccountWallet(
      user_id,
      wallet_id,
    );

    if (!walletAccounts) {
      throw new GraphQLError('Wallet not found');
    }

    if (!walletAccounts.wallet.wallet_account.length) {
      throw new GraphQLError('Wallet has no accounts');
    }

    const accounts = walletAccounts.wallet.wallet_account;

    const liquidAccount = accounts.find(
      (a) => a.details.type === WalletAccountType.LIQUID,
    );

    if (!liquidAccount) {
      throw new GraphQLError('No account found for wallet');
    }

    this.logger.debug('Paying from account', { wallet_account: liquidAccount });

    return { wallet_account: liquidAccount };
  }
}
