import { Injectable } from '@nestjs/common';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SideShiftSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';

import { SideShiftRestService } from './sideshift.rest';
import {
  SideShiftFixedSwapInput,
  SideShiftQuote,
  SideShiftQuoteInput,
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
    clientIp: string,
  ): Promise<SideShiftQuote> {
    return this.restService.getQuote(input, clientIp);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    walletAccountId: string,
    clientIp: string,
  ) {
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
    clientIp: string,
  ) {
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
