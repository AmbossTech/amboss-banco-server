import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  PayInput,
  PayLnAddressInput,
  PayLnInvoiceInput,
  PayMutations,
  PayParentType,
} from './pay.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { PayService } from './pay.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { GraphQLError } from 'graphql';
import { isUUID } from 'src/utils/string';
import { CustomLogger, Logger } from 'src/libs/logging';
import { WalletAccountType } from 'src/repo/wallet/wallet.types';

@Resolver(PayMutations)
export class PayMutationsResolver {
  constructor(private payService: PayService) {}

  @ResolveField()
  async lightning_address(
    @Args('input') input: PayLnAddressInput,
    @Parent() parent: PayParentType,
  ) {
    if (parent.wallet_account.details.type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid account type');
    }

    const { base_64 } = await this.payService.payLightningAddress(
      input.address,
      input.amount,
      parent.wallet_account,
    );

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
    if (!isUUID(input.wallet_id)) {
      throw new GraphQLError('Invalid account id');
    }

    const walletAccounts = await this.walletRepo.getAccountWallet(
      user_id,
      input.wallet_id,
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
