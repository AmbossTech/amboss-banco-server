import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SideShiftSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';

import { RedisService } from '../redis/redis.service';
import { SideShiftRestService } from './sideshift.rest';
import {
  SideShiftFixedSwap,
  SideShiftFixedSwapInput,
  SideShiftPermissions,
  SideShiftQuote,
  SideShiftQuoteInput,
  SideShiftVariableSwap,
  SideShiftVariableSwapInput,
} from './sideshift.types';

@Injectable()
export class SideShiftService {
  constructor(
    private redis: RedisService,
    private swapRepo: SwapsRepoService,
    private restService: SideShiftRestService,
  ) {}

  async getQuote(
    input: SideShiftQuoteInput,
    clientIp?: string,
  ): Promise<SideShiftQuote> {
    const isAllowedToSwap = await this.isAllowedToSwap(clientIp);

    if (!isAllowedToSwap || !clientIp) {
      throw new GraphQLError('Not allowed to swap');
    }

    return this.restService.getQuote(input, clientIp);
  }

  async isAllowedToSwap(clientIp?: string) {
    if (!clientIp) return false;

    const key = `SideShiftService-isAllowedToSwap-${clientIp}`;

    const cached = await this.redis.get<SideShiftPermissions>(key);
    if (!!cached) return cached.createShift;

    const permissions = await this.restService.getPermissions(clientIp);

    await this.redis.set(key, permissions, { ttl: 60 * 60 });

    return permissions.createShift;
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    walletAccountId: string,
    clientIp?: string,
  ): Promise<SideShiftVariableSwap> {
    const isAllowedToSwap = await this.isAllowedToSwap(clientIp);

    if (!isAllowedToSwap || !clientIp) {
      throw new GraphQLError('Not allowed to swap');
    }

    const swap = await this.restService.createVariableSwap(input, clientIp);
    await this.swapRepo.createSwap(
      walletAccountId,
      {
        provider: SwapProvider.SIDESHIFT,
        type: SideShiftSwapType.VARIABLE,
        payload: input,
      },
      {
        provider: SwapProvider.SIDESHIFT,
        type: SideShiftSwapType.VARIABLE,
        payload: swap,
      },
    );
    return swap;
  }

  async createFixedSwap(
    input: SideShiftFixedSwapInput,
    walletAccountId: string,
    clientIp?: string,
  ): Promise<SideShiftFixedSwap> {
    const isAllowedToSwap = await this.isAllowedToSwap(clientIp);

    if (!isAllowedToSwap || !clientIp) {
      throw new GraphQLError('Not allowed to swap');
    }

    const swap = await this.restService.createFixedShift(input, clientIp);
    await this.swapRepo.createSwap(
      walletAccountId,
      {
        provider: SwapProvider.SIDESHIFT,
        type: SideShiftSwapType.FIXED,
        payload: input,
      },
      {
        provider: SwapProvider.SIDESHIFT,
        type: SideShiftSwapType.FIXED,
        payload: swap,
      },
    );
    return swap;
  }
}
