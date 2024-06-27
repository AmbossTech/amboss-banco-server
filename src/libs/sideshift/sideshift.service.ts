import { Injectable } from '@nestjs/common';
import {
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

  async getQuote(input: SideShiftQuoteInput) {
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
}
