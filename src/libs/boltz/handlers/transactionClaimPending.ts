import { Injectable } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { BoltzChain, BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';

import { BoltzPendingBitcoinHandler } from './bitcoin.handler';
import { BoltzPendingLiquidHandler } from './liquid.handler';

@Injectable()
export class TransactionClaimPendingService {
  constructor(
    private bitcoinHandler: BoltzPendingBitcoinHandler,
    private liquidHandler: BoltzPendingLiquidHandler,
    private walletRepo: WalletRepoService,
    private cryptoService: CryptoService,
    private liquidService: LiquidService,
    private swapsRepo: SwapsRepoService,
    @Logger('Boltz - TransactionClaimPending') private logger: CustomLogger,
  ) {}

  async handleSubmarine(swap: wallet_account_swap) {
    const { request, response } = swap;

    if (request.type !== BoltzSwapType.SUBMARINE) {
      throw new Error('Received message for unknown swap');
    }

    if (response.type !== BoltzSwapType.SUBMARINE) {
      throw new Error('Received message for unknown swap');
    }

    if (request.payload.from === BoltzChain['L-BTC']) {
      return this.liquidHandler.handleSubmarineSwap(swap);
    }

    return this.bitcoinHandler.handleSubmarineSwap(swap);
  }

  async handleReverse(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (request.type !== BoltzSwapType.REVERSE) {
      throw new Error('Received message for unknown swap');
    }

    if (response.type !== BoltzSwapType.REVERSE) {
      throw new Error('Received message for unknown swap');
    }

    const handlerFunc =
      request.payload.to === BoltzChain['L-BTC']
        ? this.liquidHandler.handleReverseSwap.bind(this.liquidHandler)
        : this.bitcoinHandler.handleReverseSwap.bind(this.bitcoinHandler);

    try {
      await handlerFunc(swap, arg);
    } catch (e) {
      this.logger.debug(`Failed to spend claim transaction cooperatively`, {
        swap,
      });
      await handlerFunc(swap, arg, false);
    }

    return;
  }

  async handleChain(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (request.type !== BoltzSwapType.CHAIN) {
      throw new Error('Received message for unknown swap');
    }

    if (response.type !== BoltzSwapType.CHAIN) {
      throw new Error('Received message for unknown swap');
    }

    const handlerFunc =
      request.payload.to === BoltzChain['L-BTC']
        ? this.liquidHandler.handleChain.bind(this.liquidHandler)
        : this.bitcoinHandler.handleChain.bind(this.bitcoinHandler);

    try {
      await handlerFunc(swap, arg);
    } catch (e) {
      this.logger.debug(`Failed to spend claim transaction cooperatively`, {
        swap,
      });
      await handlerFunc(swap, arg, false);
    }
  }

  async handleRefund(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (
      request.type === BoltzSwapType.SUBMARINE &&
      response.type === BoltzSwapType.SUBMARINE
    ) {
      if (request.payload.from === BoltzChain['BTC']) {
        this.logger.error(
          `Swap failed with onchain bitcoin! Unable to refund`,
          { swap },
        );
        throw new Error(`Unable to refund BTC swaps`);
      }
      await this.handleRefundSubmarine(swap, arg);
      return;
    }

    if (
      request.type === BoltzSwapType.CHAIN &&
      response.type === BoltzSwapType.CHAIN
    ) {
      if (request.payload.from === BoltzChain['BTC']) {
        this.logger.error(
          `Swap failed with onchain bitcoin! Unable to refund`,
          { swap },
        );
        throw new Error(`Unable to refund BTC swaps`);
      }
      await this.handleRefundChain(swap, arg);
      return;
    }
  }

  private async handleRefundSubmarine(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (
      request.type !== BoltzSwapType.SUBMARINE ||
      response.type !== BoltzSwapType.SUBMARINE
    ) {
      throw new Error('Received message for unknown swap');
    }

    const handlerFunc =
      request.payload.from === BoltzChain['L-BTC']
        ? this.liquidHandler.handleSubmarineRefund.bind(this.liquidHandler)
        : this.bitcoinHandler.handleSubmarineRefund.bind(this.bitcoinHandler);

    const walletAccount = await this.walletRepo.getByWalletAccountId(
      swap.wallet_account_id,
    );

    if (!walletAccount) {
      this.logger.debug(`Could not find wallet account for refund`, { swap });
      throw new Error(`Could not find wallet account for refund`);
    }

    const descriptor = this.cryptoService.decryptString(
      walletAccount.details.local_protected_descriptor,
    );

    const refundAddress =
      await this.liquidService.getOnchainAddress(descriptor);

    try {
      await handlerFunc(swap, arg, refundAddress.address().toString());
      await this.swapsRepo.markBoltzRefunded(swap.id);
    } catch (e) {
      this.logger.debug(`Failed to refund submarine swap`, {
        swap,
        e,
      });
    }
  }

  private async handleRefundChain(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (
      request.type !== BoltzSwapType.CHAIN ||
      response.type !== BoltzSwapType.CHAIN
    ) {
      throw new Error('Received message for unknown swap');
    }

    const handlerFunc =
      request.payload.from === BoltzChain['L-BTC']
        ? this.liquidHandler.handleChainRefund.bind(this.liquidHandler)
        : this.bitcoinHandler.handleChainRefund.bind(this.bitcoinHandler);

    const walletAccount = await this.walletRepo.getByWalletAccountId(
      swap.wallet_account_id,
    );

    if (!walletAccount) {
      this.logger.debug(`Could not find wallet account for refund`, { swap });
      throw new Error(`Could not find wallet account for refund`);
    }

    const descriptor = this.cryptoService.decryptString(
      walletAccount.details.local_protected_descriptor,
    );

    const refundAddress =
      await this.liquidService.getOnchainAddress(descriptor);
    try {
      await handlerFunc(swap, arg, refundAddress.address().toString());
      await this.swapsRepo.markBoltzRefunded(swap.id);
    } catch (e) {
      this.logger.debug(`Failed to refund chain swap`, {
        swap,
        e,
      });
    }
  }
}
