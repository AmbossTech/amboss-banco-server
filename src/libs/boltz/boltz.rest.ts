import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Musig } from 'boltz-core';
import {
  BoltzReverseRequestType,
  BoltzSubmarineRequestType,
} from 'src/repo/swaps/swaps.types';
import { fetch } from 'undici';

import { RedisService } from '../redis/redis.service';
import {
  boltzError,
  boltzMagicRouteHint,
  boltzReverseSwapResponse,
  boltzSubmarineSwapClaimResponse,
  boltzSubmarineSwapResponse,
  swapReverseInfoSchema,
  SwapReverseInfoType,
  swapSubmarineInfoSchema,
  SwapSubmarineInfoType,
} from './boltz.types';

@Injectable()
export class BoltzRestApi {
  apiUrl;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
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

    await this.redis.set(key, parsed, { ttl: 60 * 60 });

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
      throw new Error(parsedError.data.error);
    }

    return boltzReverseSwapResponse.parse(body);
  }

  async getSubmarineClaimInfo(id: string) {
    const result = await fetch(`${this.apiUrl}swap/submarine/${id}/claim`);

    const body = await result.json();

    const parsedError = boltzError.passthrough().safeParse(body);

    if (parsedError.success) {
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapClaimResponse.parse(body);
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
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapClaimResponse.parse(body);
  }
}
