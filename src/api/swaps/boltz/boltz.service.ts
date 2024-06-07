import { Injectable } from '@nestjs/common';
import { ECPairFactory } from 'ecpair';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import {
  BoltzSubmarineRequestType,
  BoltzSwapType,
  SwapProvider,
} from 'src/repo/swaps/swaps.types';
import * as ecc from 'tiny-secp256k1';

@Injectable()
export class BoltzService {
  constructor(
    private boltzRest: BoltzRestApi,
    private swapRepo: SwapsRepoService,
  ) {}

  async createSubmarineSwap(invoice: string, wallet_account_id: string) {
    const keys = ECPairFactory(ecc).makeRandom();

    const request: BoltzSubmarineRequestType = {
      invoice,
      from: 'L-BTC',
      to: 'BTC',
      refundPublicKey: keys.publicKey.toString('hex'),
      //   referralId: 'AMBOSS',
    };

    const response = await this.boltzRest.createSubmarineSwap(request);

    await this.swapRepo.createSwap(
      wallet_account_id,
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.SUBMARINE,

        payload: {
          ...request,
          privateKey: keys.privateKey?.toString('hex') || '',
        },
      },
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.SUBMARINE,
        payload: response,
      },
    );
  }
}
