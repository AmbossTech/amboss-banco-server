import { Injectable } from '@nestjs/common';
import {
  SideShiftFixedSwapInput,
  SideShiftQuote,
  SideShiftQuoteInput,
  SideShiftVariableSwapInput,
} from './sideshift.types';
import { SideShiftRestService } from './sideshift.rest';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SideShiftSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';

@Injectable()
export class SideShiftService {
  constructor(
    private restService: SideShiftRestService,
    private swapRepo: SwapsRepoService,
  ) {}

  async getQuote(input: SideShiftQuoteInput): Promise<SideShiftQuote> {
    return this.restService.getQuote(input);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    walletAccountId: string,
  ) {
    const swap = await this.restService.createVariableSwap(input);
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
  ) {
    const swap = await this.restService.createFixedShift(input);
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
