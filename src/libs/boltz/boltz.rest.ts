import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import {
  boltzError,
  boltzReverseSwapResponse,
  boltzSubmarineSwapClaimResponse,
  boltzSubmarineSwapResponse,
  swapReverseInfoSchema,
} from './boltz.types';
import {
  BoltzReverseRequestType,
  BoltzSubmarineRequestType,
} from 'src/repo/swaps/swaps.types';
import { Musig } from 'boltz-core';

@Injectable()
export class BoltzRestApi {
  apiUrl;

  constructor(private configService: ConfigService) {
    this.apiUrl = configService.getOrThrow('urls.boltz');
  }

  async getReverseSwapInfo() {
    const result = await fetch(`${this.apiUrl}swap/reverse`);

    const body = await result.json();

    return swapReverseInfoSchema.parse(body);
  }

  async createSubmarineSwap(request: BoltzSubmarineRequestType) {
    const result = await fetch(`${this.apiUrl}swap/submarine`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      method: 'POST',
    });

    const body = await result.json();

    const parsedError = boltzError.safeParse(body);

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

    const parsedError = boltzError.safeParse(body);

    if (parsedError.success) {
      throw new Error(parsedError.data.error);
    }

    return boltzReverseSwapResponse.parse(body);
  }

  async getSubmarineClaimInfo(id: string) {
    const result = await fetch(`${this.apiUrl}swap/submarine/${id}/claim`);

    const body = await result.json();

    const parsedError = boltzError.safeParse(body);

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

    const parsedError = boltzError.safeParse(body);

    if (parsedError.success) {
      throw new Error(parsedError.data.error);
    }

    return boltzSubmarineSwapClaimResponse.parse(body);
  }
}
