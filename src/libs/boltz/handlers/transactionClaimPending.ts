import { Injectable } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzChain, BoltzSwapType } from 'src/repo/swaps/swaps.types';

import { BoltzPendingBitcoinHandler } from './bitcoin.handler';
import { BoltzPendingLiquidHandler } from './liquid.handler';

@Injectable()
export class TransactionClaimPendingService {
  constructor(
    private bitcoinHandler: BoltzPendingBitcoinHandler,
    private liquidHandler: BoltzPendingLiquidHandler,
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

    if (request.payload.to === BoltzChain['L-BTC']) {
      return this.liquidHandler.handleReverseSwap(swap, arg);
    }

    return this.bitcoinHandler.handleReverseSwap(swap, arg);
  }

  async handleChain(swap: wallet_account_swap, arg: any) {
    const { request, response } = swap;

    if (request.type !== BoltzSwapType.CHAIN) {
      throw new Error('Received message for unknown swap');
    }

    if (response.type !== BoltzSwapType.CHAIN) {
      throw new Error('Received message for unknown swap');
    }

    if (request.payload.to === BoltzChain['L-BTC']) {
      return this.liquidHandler.handleChain(swap, arg);
    }

    return this.bitcoinHandler.handleChain(swap, arg);
  }
}
