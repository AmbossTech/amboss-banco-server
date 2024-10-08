import {
  Args,
  Context,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { ContextType } from 'src/libs/graphql/context.type';
import {
  DEFAULT_LIQUID_FEE_MSAT,
  LiquidService,
} from 'src/libs/liquid/liquid.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { RedisService } from 'src/libs/redis/redis.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { WalletAccountType } from 'src/repo/wallet/wallet.types';
import { toWithError } from 'src/utils/async';
import { isUUID } from 'src/utils/string';

import { isCurrencyCompatible } from '../pay.helpers';
import { PayService } from '../pay.service';
import {
  PayInput,
  PayLiquidAddressInput,
  PayLnAddressInput,
  PayLnInvoiceInput,
  PayMutations,
  PayNetworkSwapInput,
  PayParentType,
  PaySwapAddressInput,
  PaySwapNetwork,
  SwapQuote,
} from '../pay.types';

@Resolver(PayMutations)
export class PayMutationsResolver {
  constructor(
    private payService: PayService,
    private redisService: RedisService,
    private sideShiftService: SideShiftService,
    private liquidService: LiquidService,
    private cryptoService: CryptoService,
    @Logger('PayMutationsResolver') private logger: CustomLogger,
  ) {}

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

  @ResolveField()
  async swap_address(
    @Args('input') input: PaySwapAddressInput,
    @Parent() parent: PayParentType,
  ) {
    if (!isCurrencyCompatible(input.network, input.currency)) {
      throw new GraphQLError(`Invalid currency on network`);
    }

    if (parent.wallet_account.details.type !== WalletAccountType.LIQUID) {
      throw new GraphQLError('Invalid wallet account id');
    }

    let base_64: string;

    switch (input.network) {
      case PaySwapNetwork.BITCOIN:
        base_64 = (
          await this.payService.payBitcoinAddress(parent.wallet_account, input)
        ).base_64;
        break;
      default:
        throw new GraphQLError(`Unable to send`);
    }

    return { base_64, wallet_account: parent.wallet_account };
  }

  @ResolveField()
  async network_swap(
    @Args('input') input: PayNetworkSwapInput,
    @Parent() { wallet_account }: PayParentType,
    @Context() { ip }: ContextType,
  ) {
    const quote = await this.redisService.get<SwapQuote>(input.quote_id);

    if (!quote) {
      throw new GraphQLError(`Quote not found`);
    }

    const { quote_id, settle_address } = input;

    const descriptor = this.cryptoService.decryptString(
      wallet_account.details.local_protected_descriptor,
    );

    const refundAddress = await this.liquidService.getOnchainAddress(
      descriptor,
      true,
    );

    const [swap, error] = await toWithError(
      this.sideShiftService.createFixedSwap(
        {
          quoteId: quote_id,
          settleAddress: settle_address,
          refundAddress: refundAddress.address().toString(),
        },
        wallet_account.id,
        ip,
      ),
    );

    if (error) {
      this.logger.error('Error doing swap', { swap, error });
      throw new GraphQLError('Error doing swap');
    }

    // Get sats amount
    const paymentAmount = +swap.depositAmount * 100_000_000;

    const { base_64 } = await this.payService.payLiquidAddress(wallet_account, {
      fee_rate: DEFAULT_LIQUID_FEE_MSAT,
      recipients: [
        {
          address: swap.depositAddress,
          amount: paymentAmount.toString(),
        },
      ],
    });

    return { base_64, wallet_account };
  }
}

@Resolver()
export class MainPayMutationsResolver {
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
