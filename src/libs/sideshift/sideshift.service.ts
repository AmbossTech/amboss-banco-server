import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SideShiftSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';
import { toWithError } from 'src/utils/async';

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

    const [permissions, error] = await toWithError(
      this.restService.getPermissions(clientIp),
    );

    if (error) return false;

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

    const [swap, error] = await toWithError(
      this.restService.createVariableSwap(input, clientIp),
    );

    if (error) {
      throw new GraphQLError(error.message);
    }

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

    const [swap, error] = await toWithError(
      this.restService.createFixedShift(input, clientIp),
    );

    if (error) {
      throw new GraphQLError(error.message);
    }

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
