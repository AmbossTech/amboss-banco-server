import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transaction as BitcoinTransaction } from 'bitcoinjs-lib';
import { Musig } from 'boltz-core';
import { Transaction as LiquidTransaction } from 'liquidjs-lib';
import {
  BoltzChainSwapRequestType,
  BoltzReverseRequestType,
  BoltzSubmarineRequestType,
} from 'src/repo/swaps/swaps.types';
import { fetch } from 'undici';

import { CustomLogger, Logger } from '../logging';
import { RedisService } from '../redis/redis.service';
import {
  boltzBroadcastTxResponse,
  boltzChainSwapClaimResponse,
  boltzChainSwapResponse,
  boltzChainTxsResponse,
  boltzError,
  boltzMagicRouteHint,
  boltzPartialSigResponse,
  boltzRefundClaimResponse,
  boltzReverseSwapResponse,
  boltzSubmarineLockupTxResponse,
  boltzSubmarineSwapClaimResponse,
  boltzSubmarineSwapResponse,
  swapChainInfoSchema,
  swapReverseInfoSchema,
  SwapReverseInfoType,
  swapSubmarineInfoSchema,
  SwapSubmarineInfoType,
} from './boltz.types';

@Injectable()
export class BoltzRestApi {
  private apiUrl;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
    @Logger('BoltzRestApi') private logger: CustomLogger,
  ) {
    this.apiUrl = configService.getOrThrow('urls.boltz');
  }

  async getMagicRouteHintInfo(invoice: string) {
    const result = await fetch(`${this.apiUrl}swap/reverse/${invoice}/bip21`);

    const body = await result.json();

    return boltzMagicRouteHint.parse(body);
  }

  async getSubmarineSwapInfo() {
    const key = `BoltzRestApi-getSubmarineSwapInfo`;

    const cached = await this.redis.get<SwapSubmarineInfoType>(key);
    if (!!cached) return cached;

    const result = await fetch(`${this.apiUrl}swap/submarine`);

    const body = await result.json();

    const parsed = swapSubmarineInfoSchema.parse(body);

    await this.redis.set(key, parsed, { ttl: 60 * 60 });

    return parsed;
  }

  async getReverseSwapInfo() {
    const key = `BoltzRestApi-getReverseSwapInfo`;

    const cached = await this.redis.get<SwapReverseInfoType>(key);
    if (!!cached) return cached;

    const result = await fetch(`${this.apiUrl}swap/reverse`);

    const body = await result.json();

    const parsed = swapReverseInfoSchema.parse(body);

    await this.redis.set<SwapReverseInfoType>(key, parsed, { ttl: 60 * 60 });

    return parsed;
  }

  async getChainSwapInfo() {
    const result = await fetch(`${this.apiUrl}swap/chain`);

    const body = await result.json();

    const parsed = swapChainInfoSchema.parse(body);

    return parsed;
  }

  async createSubmarineSwap(request: BoltzSubmarineRequestType) {
    const result = await fetch(`${this.apiUrl}swap/submarine`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error creating submarine swap', { parsedError, body });
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapResponse.parse(body);
  }

  async createReverseSwap(request: BoltzReverseRequestType) {
    const result = await fetch(`${this.apiUrl}swap/reverse`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error creating reverse swap', { parsedError, body });
      throw new Error(parsedError.data.error);
    }

    return boltzReverseSwapResponse.parse(body);
  }

  async getSubmarineClaimInfo(id: string) {
    const result = await fetch(`${this.apiUrl}swap/submarine/${id}/claim`);

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting submarine claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapClaimResponse.parse(body);
  }

  async createChainSwap(request: BoltzChainSwapRequestType) {
    const result = await fetch(`${this.apiUrl}swap/chain`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error creating chain swap', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzChainSwapResponse.parse(body);
  }

  async postSubmarineClaimInfo(id: string, musig: Musig) {
    const result = await fetch(`${this.apiUrl}swap/submarine/${id}/claim`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
        partialSignature: Buffer.from(musig.signPartial()).toString('hex'),
      }),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error posting submarine claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapClaimResponse.parse(body);
  }

  async postSubmarineRefundInfo(id: string, musig: Musig, hex: string) {
    const pubNonce = Buffer.from(musig.getPublicNonce()).toString('hex');
    const result = await fetch(`${this.apiUrl}swap/submarine/${id}/refund`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        index: 0,
        pubNonce,
        transaction: hex,
      }),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error posting submarine claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzRefundClaimResponse.parse(body);
  }

  async postChainRefundInfo(id: string, musig: Musig, hex: string) {
    const result = await fetch(`${this.apiUrl}swap/chain/${id}/refund`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        index: 0,
        pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
        transaction: hex,
      }),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error posting chain claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzRefundClaimResponse.parse(body);
  }

  async getSigReverseSwap(
    swapId: string,
    claimTx: LiquidTransaction | BitcoinTransaction,
    preimage: Buffer,
    musig: Musig,
  ) {
    const result = await fetch(`${this.apiUrl}swap/reverse/${swapId}/claim`, {
      method: 'POST',
      body: JSON.stringify({
        index: 0,
        transaction: claimTx.toHex(),
        preimage: preimage.toString('hex'),
        pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting reverse swap claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzPartialSigResponse.parse(body);
  }

  async getChainClaimInfo(id: string) {
    const result = await fetch(`${this.apiUrl}swap/chain/${id}/claim`);

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting chain claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzChainSwapClaimResponse.parse(body);
  }

  async getSigChainSwap({
    swapId,
    claimPubNonce,
    claimTransaction,
    preimage,
    signature,
  }: {
    swapId: string;
    claimTransaction: BitcoinTransaction | LiquidTransaction;
    claimPubNonce: Buffer;
    preimage?: Buffer;
    signature?: {
      partialSig: Uint8Array;
      musig: Musig;
    };
  }) {
    const result = await fetch(`${this.apiUrl}swap/chain/${swapId}/claim`, {
      method: 'POST',
      body: JSON.stringify({
        preimage: preimage && preimage.toString('hex'),
        signature: signature && {
          partialSignature: Buffer.from(signature.partialSig).toString('hex'),
          pubNonce: Buffer.from(signature.musig.getPublicNonce()).toString(
            'hex',
          ),
        },
        toSign: {
          index: 0,
          transaction: claimTransaction.toHex(),
          pubNonce: claimPubNonce.toString('hex'),
        },
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting chain swap claim info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzPartialSigResponse.parse(body);
  }

  async broadcastTx(hex: string, chain: 'BTC' | 'L-BTC') {
    const result = await fetch(`${this.apiUrl}chain/${chain}/transaction`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({ hex }),
    });

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error broadcasting transaction', {
        parsedError,
        body,
        chain,
        hex,
      });
      throw new Error(parsedError.data.error);
    }

    const response = boltzBroadcastTxResponse.parse(body);

    this.logger.debug(`Broadcasted transaction`, { chain, response });

    return response;
  }

  async getSubmarineLockupTransaction(id: string) {
    const result = await fetch(
      `${this.apiUrl}swap/submarine/${id}/transaction`,
    );

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting submarine lockup tx info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineLockupTxResponse.parse(body);
  }

  async getChainTransactions(id: string) {
    const result = await fetch(`${this.apiUrl}swap/chain/${id}/transactions`);

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      this.logger.error('Error getting chain txs info', {
        parsedError,
        body,
      });
      throw new Error(parsedError.data.error);
    }

    return boltzChainTxsResponse.parse(body);
  }
}
