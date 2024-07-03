import { Injectable } from '@nestjs/common';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SideShiftSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';

import { SideShiftRestService } from './sideshift.rest';
import {
  SideShiftFixedSwap,
  SideShiftFixedSwapInput,
  SideShiftQuote,
  SideShiftQuoteInput,
  SideShiftVariableSwap,
  SideShiftVariableSwapInput,
} from './sideshift.types';

@Injectable()
export class SideShiftService {
  constructor(
    private restService: SideShiftRestService,
    private swapRepo: SwapsRepoService,
  ) {}

  async getQuote(
    input: SideShiftQuoteInput,
    clientIp?: string,
  ): Promise<SideShiftQuote> {
    return this.restService.getQuote(input, clientIp);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    walletAccountId: string,
    clientIp?: string,
  ): Promise<SideShiftVariableSwap> {
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
