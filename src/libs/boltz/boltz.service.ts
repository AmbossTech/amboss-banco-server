import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwapTreeSerializer } from 'boltz-core';
import { ECPairFactory } from 'ecpair';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import {
  BoltzReverseRequestType,
  BoltzSubmarineRequestType,
  BoltzSwapType,
  SwapProvider,
} from 'src/repo/swaps/swaps.types';
import * as ecc from 'tiny-secp256k1';

import { CovenantParams } from './boltz.types';

@Injectable()
export class BoltzService {
  private covclaimUrl: string;

  constructor(
    private boltzRest: BoltzRestApi,
    private swapRepo: SwapsRepoService,
    private configService: ConfigService,
  ) {
    this.covclaimUrl = this.configService.getOrThrow('urls.covclaim');
  }

  async createSubmarineSwap(invoice: string, wallet_account_id: string) {
    const keys = ECPairFactory(ecc).makeRandom();

    const request: BoltzSubmarineRequestType = {
      invoice,
      from: 'L-BTC',
      to: 'BTC',
      refundPublicKey: keys.publicKey.toString('hex'),
      referralId: 'AMBOSS',
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

    return response;
  }

  async createReverseSwap(
    address: string,
    amount: number,
    wallet_account_id: string,
  ) {
    const preimage = randomBytes(32);
    const keys = ECPairFactory(ecc).makeRandom();

    const request: BoltzReverseRequestType = {
      address,
      from: 'BTC',
      to: 'L-BTC',
      claimCovenant: true,
      invoiceAmount: amount,
      preimageHash: createHash('sha256').update(preimage).digest('hex'),
      claimPublicKey: keys.publicKey.toString('hex'),
      referralId: 'AMBOSS',
    };

    const response = await this.boltzRest.createReverseSwap(request);

    const covParams = {
      address,
      preimage,
      claimPublicKey: keys.publicKey,
      blindingKey: Buffer.from(response.blindingKey, 'hex'),
      refundPublicKey: Buffer.from(response.refundPublicKey, 'hex'),
      tree: SwapTreeSerializer.deserializeSwapTree(response.swapTree),
    };

    await this.registerCovenant(covParams);

    await this.swapRepo.createSwap(
      wallet_account_id,
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.REVERSE,

        payload: {
          ...request,
        },
      },
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.REVERSE,
        payload: response,
      },
    );

    return response;
  }

  async getReverseSwapInfo() {
    return this.boltzRest.getReverseSwapInfo();
  }

  private async registerCovenant(params: CovenantParams) {
    const body = {
      address: params.address,
      preimage: params.preimage.toString('hex'),
      tree: SwapTreeSerializer.serializeSwapTree(params.tree),
      blindingKey: params.blindingKey.toString('hex'),
      claimPublicKey: params.claimPublicKey.toString('hex'),
      refundPublicKey: params.refundPublicKey.toString('hex'),
    };

    const res = await fetch(`${this.covclaimUrl}/covenant`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log({ covRes: await res.text() });
  }
}
