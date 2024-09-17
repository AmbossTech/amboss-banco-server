import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode } from 'bolt11';
import { SwapTreeSerializer } from 'boltz-core';
import { ECPairFactory } from 'ecpair';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import {
  BoltzChain,
  BoltzChainSwapRequestType,
  BoltzReverseRequestType,
  BoltzSubmarineRequestType,
  BoltzSwapType,
  SwapProvider,
} from 'src/repo/swaps/swaps.types';
import { getSHA256Hash } from 'src/utils/crypto/crypto';
import * as ecc from 'tiny-secp256k1';

import { CustomLogger, Logger } from '../logging';
import { CovenantParams } from './boltz.types';
import { BoltzWsService } from './boltzWs.service';

const ECPair = ECPairFactory(ecc);

@Injectable()
export class BoltzService {
  private covclaimUrl: string;

  constructor(
    private boltzRest: BoltzRestApi,
    private boltzWs: BoltzWsService,
    private swapRepo: SwapsRepoService,
    private configService: ConfigService,
    @Logger('BoltzService') private logger: CustomLogger,
  ) {
    this.covclaimUrl = this.configService.getOrThrow('urls.covclaim');
  }

  async createSubmarineSwap(invoice: string, wallet_account_id: string) {
    const swapInfo = await this.getSubmarineSwapInfo();
    const { limits } = swapInfo['L-BTC']['BTC'];

    const { satoshis } = decode(invoice);
    this.checkLimits(limits, satoshis || 0);

    const keys = ECPair.makeRandom();

    const request: BoltzSubmarineRequestType = {
      invoice,
      from: BoltzChain['L-BTC'],
      to: BoltzChain.BTC,
      refundPublicKey: keys.publicKey.toString('hex'),
      referralId: 'AMBOSS',
    };

    const response = await this.boltzRest.createSubmarineSwap(request);

    this.boltzWs.subscribeToSwap([response.id]);

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

  async createReverseSwap(swapInput: {
    address: string;
    amount: number;
    wallet_account_id: string;
    covenant?: boolean;
    description: string;
  }) {
    const {
      address,
      amount,
      wallet_account_id,
      covenant = true,
      description,
    } = swapInput;

    const swapInfo = await this.getReverseSwapInfo();
    const { limits } = swapInfo['BTC']['L-BTC'];

    this.checkLimits(limits, amount);

    const preimage = randomBytes(32);
    const keys = ECPair.makeRandom();

    const request: BoltzReverseRequestType = {
      address,
      from: BoltzChain.BTC,
      to: BoltzChain['L-BTC'],
      claimCovenant: covenant,
      invoiceAmount: amount,
      preimageHash: getSHA256Hash(preimage),
      claimPublicKey: keys.publicKey.toString('hex'),
      referralId: 'AMBOSS',
      description,
    };

    const response = await this.boltzRest.createReverseSwap(request);

    if (covenant && response.blindingKey) {
      const covParams = {
        address,
        preimage,
        claimPublicKey: keys.publicKey,
        blindingKey: Buffer.from(response.blindingKey, 'hex'),
        refundPublicKey: Buffer.from(response.refundPublicKey, 'hex'),
        tree: SwapTreeSerializer.deserializeSwapTree(response.swapTree),
      };
      await this.registerCovenant(covParams);
    }

    this.boltzWs.subscribeToSwap([response.id]);

    await this.swapRepo.createSwap(
      wallet_account_id,
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.REVERSE,

        payload: {
          ...request,
          preimage: preimage.toString('hex'),
          privateKey: keys.privateKey?.toString('hex') || '',
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

  async createChainSwap(
    address: string,
    amount: number,
    wallet_account_id: string,
    direction: { from: BoltzChain; to: BoltzChain },
  ) {
    const { from, to } = direction;

    const swapInfo = await this.getChainSwapInfo();
    let limits;

    if (from == BoltzChain['L-BTC'] && to == BoltzChain['BTC']) {
      limits = swapInfo[from][to].limits;
    } else if (from == BoltzChain['BTC'] && to == BoltzChain['L-BTC']) {
      limits = swapInfo[from][to].limits;
    } else {
      throw new Error(`You cannot send and receive to the same chain`);
    }

    this.checkLimits(limits, amount);

    // Create a random preimage for the swap; has to have a length of 32 bytes
    const preimage = randomBytes(32);
    const claimKeys = ECPairFactory(ecc).makeRandom();
    const refundKeys = ECPairFactory(ecc).makeRandom();

    const request: BoltzChainSwapRequestType = {
      userLockAmount: amount,
      claimAddress: address,
      from,
      to,
      preimageHash: getSHA256Hash(preimage),
      claimPublicKey: claimKeys.publicKey.toString('hex'),
      refundPublicKey: refundKeys.publicKey.toString('hex'),
      referralId: 'AMBOSS',
    };

    const response = await this.boltzRest.createChainSwap(request);

    await this.swapRepo.createSwap(
      wallet_account_id,
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.CHAIN,
        payload: {
          ...request,
          preimage: preimage.toString('hex'),
          claimPrivateKey: claimKeys.privateKey?.toString('hex') || '',
          refundPrivateKey: refundKeys.privateKey?.toString('hex') || '',
        },
      },
      {
        provider: SwapProvider.BOLTZ,
        type: BoltzSwapType.CHAIN,
        payload: response,
      },
    );

    this.boltzWs.subscribeToSwap([response.id]);

    return response;
  }

  async getReverseSwapInfo() {
    return this.boltzRest.getReverseSwapInfo();
  }

  async getChainSwapInfo() {
    return this.boltzRest.getChainSwapInfo();
  }

  async getSubmarineSwapInfo() {
    return this.boltzRest.getSubmarineSwapInfo();
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

    this.logger.info('Registered Convenant', { covRes: await res.text() });
  }

  private checkLimits(
    { minimal, maximal }: { minimal: number; maximal: number },
    amount: number,
  ): void {
    if (amount < minimal) {
      throw new Error(`Amount is too small, minimum is ${minimal}`);
    }

    if (amount > maximal) {
      throw new Error(`Amount is too big, maximum is ${maximal}`);
    }
  }
}
